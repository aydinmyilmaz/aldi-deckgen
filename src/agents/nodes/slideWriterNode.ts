import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import { getPresentationGuidelines, getSlideTypeRules } from '@/lib/presentationGuidelines';
import { normalizeSlideType } from '../slideTypeUtils';
import { v4 as uuidv4 } from 'uuid';
import type { PipelineState } from '../state';
import type {
  LayoutHint,
  PlotKind,
  SlideOutline,
  SlidePlotSpec,
  SlideType,
  SlideVisualKind,
} from '@/types';

const VALID_LAYOUT_HINTS = new Set<LayoutHint>([
  'title-focus',
  'content-single-column',
  'content-two-column',
  'chart-right',
  'conclusion-focus',
  'agenda-list',
  'quote-callout',
  'stats-highlight',
  'card-grid',
  'comparison-table',
  'decision-tree',
  'criteria-table',
  'matrix-2x2',
  'tier-detail-split',
  'adoption-path',
]);

const VALID_VISUAL_KINDS = new Set<SlideVisualKind>([
  'none',
  'plot',
  'image',
  'table',
  'cards',
]);

const VALID_PLOT_KINDS = new Set<PlotKind>(['bar', 'line', 'scatter']);

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeSentence(text: string): string {
  return text
    .replace(/(\.\.\.|…)+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[,:;\-—]\s*$/g, '')
    .trim();
}

function toConciseTitle(title: string, maxWords = 8): string {
  const normalized = sanitizeSentence(title);
  if (!normalized) return '';

  const firstClause = normalized.split(/[—–:|]/)[0]?.trim() || normalized;
  const wordsInClause = firstClause.split(/\s+/).filter(Boolean).length;
  const base = wordsInClause <= maxWords ? firstClause : normalized;
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return base;
  return words.slice(0, maxWords).join(' ');
}

function parseLayoutHint(value: unknown): LayoutHint | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim() as LayoutHint;
  return VALID_LAYOUT_HINTS.has(normalized) ? normalized : undefined;
}

function parseVisualKind(value: unknown): SlideVisualKind | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim() as SlideVisualKind;
  return VALID_VISUAL_KINDS.has(normalized) ? normalized : undefined;
}

function parsePlotSpec(value: unknown, fallbackTitle: string): SlidePlotSpec | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const kindRaw = asTrimmedString(candidate.kind) as PlotKind;
  if (!VALID_PLOT_KINDS.has(kindRaw)) return undefined;

  const labelsRaw = Array.isArray(candidate.labels) ? candidate.labels : [];
  const valuesRaw = Array.isArray(candidate.values) ? candidate.values : [];
  const labels = labelsRaw
    .map((item) => asTrimmedString(item))
    .filter(Boolean)
    .slice(0, 8);
  const values = valuesRaw
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .slice(0, 8);

  if (labels.length < 2 || values.length < 2 || labels.length !== values.length) return undefined;

  const title = asTrimmedString(candidate.title) || fallbackTitle;
  const xLabel = asTrimmedString(candidate.xLabel);
  const yLabel = asTrimmedString(candidate.yLabel);

  return {
    kind: kindRaw,
    title,
    ...(xLabel ? { xLabel } : {}),
    ...(yLabel ? { yLabel } : {}),
    labels,
    values,
  };
}

export async function slideWriterNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { slideTitles, documentText, config, styleDna, extractedSlideContent, reviewFeedback, slides: previousSlides } = state;
  const llm = createLLM();

  // Build source content: per-slide if extraction ran, raw text otherwise
  const sourceContent = extractedSlideContent.length > 0
    ? extractedSlideContent
        .map((s) => `=== Slide ${s.slideIndex} (${s.topic}) ===\n${s.content}`)
        .join('\n\n')
    : documentText.slice(0, 6000);

  const guidelines = getPresentationGuidelines(config);

  // Build per-slide blueprint with inline type rules
  const slideBlueprintWithRules = slideTitles.map((s) => {
    const typeRules = getSlideTypeRules((s.slideType ?? 'content') as SlideType);
    const layoutLine = s.layoutHint ? `\nPreferred layout: ${s.layoutHint}` : '';
    const visualLine = s.visualKind ? `\nPreferred visual kind: ${s.visualKind}` : '';
    return `--- Slide ${s.index} [type: ${s.slideType ?? 'content'}] ---\nTitle: "${s.title}"${layoutLine}${visualLine}\n${typeRules}`;
  }).join('\n\n');

  const revisionBlock = reviewFeedback
    ? `\n\n⚠️ REVISION — your previous output was rejected. You MUST fix ALL of these issues:\n${reviewFeedback}\n\nPrevious (rejected) output for reference:\n${JSON.stringify(previousSlides)}`
    : '';

  const response = await llm.invoke([
    new SystemMessage(
      `You are an executive presentation writer. Write final slide content — crisp, zero filler.\n` +
      `Audience: ${config.audience || 'general'}. Purpose: to ${config.purpose}. Tone: ${config.tone}. Language: ${config.language}.\n\n` +
      `Match wording conventions from the Style DNA below — same headline style, register, and sentence length.\n\n` +
      `Style DNA:\n${styleDna}\n\n` +
      `${guidelines}\n\n` +
      `UNIVERSAL CONTENT RULES (apply to all slides unless the slide type rules override):\n` +
      `• Plain text only — NO markdown, NO **bold**, NO *italic*, NO "Label: explanation" patterns.\n` +
      `• Each bullet MUST be ≤ 12 words unless the slide type explicitly allows longer entries.\n` +
      `• keyMessage: ONE sentence, ≤ 15 words. No markdown.\n` +
      `• speakerNotes: 2–3 full sentences. Do NOT repeat bullet text verbatim. Conversational tone.\n` +
      `• title: concise insight headline, ideally 3–6 words, hard max 8 words.\n` +
      `• You may tighten/shorten blueprint title wording for brevity.\n` +
      `• Never use ellipsis ("..." or "…") in title, keyMessage, bullets, or speakerNotes.\n` +
      `• Never end title/keyMessage/bullets with dangling punctuation like ":" or ",".\n` +
      `• Use numbers/percentages only when source content has them — never force statistics.\n\n` +
      `VISUAL PLANNING RULES (required for each slide):\n` +
      `• layoutHint must be exactly one of: title-focus, content-single-column, content-two-column, chart-right, conclusion-focus, agenda-list, quote-callout, stats-highlight, card-grid, comparison-table.\n` +
      `  Also allowed: decision-tree, criteria-table, matrix-2x2, tier-detail-split, adoption-path.\n` +
      `• visualKind must be one of: none, plot, image, table, cards.\n` +
      `• If visualKind="plot": include plotSpec with kind (bar|line|scatter), labels[], values[], optional title/xLabel/yLabel.\n` +
      `• plotSpec values MUST come from source content. Do not invent numbers.\n` +
      `• Do NOT use years (e.g. 2024/2025), tier numbers, or reference indices as plot values.\n` +
      `• If no clean numeric series exists, set visualKind="none" and omit plotSpec.\n\n` +
      (config.blueprintId
        ? `\nBLUEPRINT MODE:\n` +
          `- Preserve blueprint slide order and intent.\n` +
          `- Keep titles close to blueprint wording; do not expand into long sentences.\n` +
          `- Respect preferred layoutHint and visualKind when provided.\n\n`
        : '') +
      `Each slide below specifies its TYPE and TYPE-SPECIFIC RULES — follow them exactly.\n\n` +
      `Output ONLY raw JSON (no markdown code fences):\n` +
      `{ "slides": [{ "index": number, "title": string, "slideType": string, "keyMessage": string, "bullets": string[], "speakerNotes": string, "visualSuggestion": string, "layoutHint": string, "visualKind": string, "plotSpec"?: { "kind": "bar"|"line"|"scatter", "title"?: string, "xLabel"?: string, "yLabel"?: string, "labels": string[], "values": number[] } }] }`
    ),
    new HumanMessage(
      `SLIDE BLUEPRINTS WITH TYPE RULES:\n\n${slideBlueprintWithRules}\n\n` +
      `SOURCE CONTENT:\n${sourceContent}${revisionBlock}`
    ),
  ]);

  const raw = (response.content as string).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(raw);
  const blueprintByIndex = new Map(
    slideTitles.map((slide) => [slide.index, slide])
  );
  const expectedTypeByIndex = new Map(
    slideTitles.map((slide) => [slide.index, normalizeSlideType(slide.slideType)])
  );
  const slides: SlideOutline[] = (
    parsed.slides as Array<{
      index: number;
      title: string;
      slideType: string;
      keyMessage: string;
      bullets: string[];
      speakerNotes: string;
      visualSuggestion: string;
      layoutHint?: string;
      visualKind?: string;
      plotSpec?: unknown;
    }>
  ).map((s) => {
    const blueprint = blueprintByIndex.get(s.index);
    const layoutHint = parseLayoutHint(s.layoutHint);
    const visualKind = parseVisualKind(s.visualKind);
    const parsedPlotSpec = parsePlotSpec(s.plotSpec, s.visualSuggestion || s.title);
    const plotSpec = visualKind === 'plot' ? parsedPlotSpec : undefined;
    const title = toConciseTitle(
      asTrimmedString(s.title) ||
        asTrimmedString(blueprint?.title) ||
        `Slide ${s.index}`
    );
    const keyMessage = sanitizeSentence(asTrimmedString(s.keyMessage));
    const speakerNotes = sanitizeSentence(asTrimmedString(s.speakerNotes));
    const visualSuggestion = sanitizeSentence(asTrimmedString(s.visualSuggestion));
    const bullets = Array.isArray(s.bullets)
      ? s.bullets.map((bullet) => sanitizeSentence(asTrimmedString(bullet))).filter(Boolean)
      : [];

    return {
      id: uuidv4(),
      index: s.index,
      title,
      slideType: (expectedTypeByIndex.get(s.index) ?? normalizeSlideType(s.slideType)) as SlideType,
      keyMessage,
      bullets,
      speakerNotes,
      visualSuggestion,
      ...(layoutHint || blueprint?.layoutHint ? { layoutHint: layoutHint ?? blueprint?.layoutHint } : {}),
      ...(visualKind || blueprint?.visualKind ? { visualKind: visualKind ?? blueprint?.visualKind } : {}),
      ...(plotSpec ? { plotSpec } : {}),
    };
  });

  return { slides };
}
