import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { SlidePlotSpec, SlideVisualKind } from '@/types';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';
import type { SlideRenderPlan } from '@/types/render';

const ELIGIBLE_TYPES = new Set([
  'findings',
  'problem',
  'benefits',
  'objectives',
  'content',
]);
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
const ORDINAL_LABEL_RE = /\b(tier|step|phase|level|part|stage|option)\b/i;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeVisualKind(value: unknown): SlideVisualKind {
  if (typeof value !== 'string') return 'none';
  const normalized = value.trim().toLowerCase();
  return normalized === 'plot' ||
    normalized === 'image' ||
    normalized === 'table' ||
    normalized === 'cards'
    ? normalized
    : 'none';
}

function parsePlotSpec(value: unknown): SlidePlotSpec | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const kind = asTrimmedString(candidate.kind);
  if (kind !== 'bar' && kind !== 'line' && kind !== 'scatter') return undefined;
  const kindTyped = kind as SlidePlotSpec['kind'];

  const labels = Array.isArray(candidate.labels)
    ? candidate.labels.map((label) => asTrimmedString(label)).filter(Boolean).slice(0, 8)
    : [];
  const values = Array.isArray(candidate.values)
    ? candidate.values
        .map((num) => Number(num))
        .filter((num) => Number.isFinite(num))
        .slice(0, 8)
    : [];

  if (labels.length < 2 || values.length < 2 || labels.length !== values.length) return undefined;

  const title = asTrimmedString(candidate.title);
  const xLabel = asTrimmedString(candidate.xLabel);
  const yLabel = asTrimmedString(candidate.yLabel);

  return {
    kind: kindTyped,
    ...(title ? { title } : {}),
    ...(xLabel ? { xLabel } : {}),
    ...(yLabel ? { yLabel } : {}),
    labels,
    values,
  };
}

function extractNumericTokens(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?/g) ?? [];
  return matches
    .map((item) => Number(item))
    .filter((num) => Number.isFinite(num));
}

function valueMatchesSource(value: number, sourceNumbers: number[]): boolean {
  return sourceNumbers.some((candidate) => {
    if (Math.abs(candidate - value) < 0.0001) return true;
    // Accept percent normalization: source "62%" vs planned value 0.62
    if (value >= 0 && value <= 1 && Math.abs(candidate - value * 100) < 0.25) return true;
    return false;
  });
}

function isLikelyOrdinalSeries(values: number[]): boolean {
  if (values.length < 2) return false;
  if (!values.every((value) => Number.isInteger(value))) return false;

  const uniqueSorted = [...new Set(values.map((value) => Math.round(value)))].sort((a, b) => a - b);
  if (uniqueSorted.length < 2) return false;
  const sequential = uniqueSorted.every((value, idx) =>
    idx === 0 ? true : value - uniqueSorted[idx - 1] === 1
  );
  return sequential && uniqueSorted[0] >= 1 && uniqueSorted[uniqueSorted.length - 1] <= 8;
}

function validatePlotSpec(
  item: SlideRenderPlan,
  plotSpec: SlidePlotSpec
): string | undefined {
  if (plotSpec.values.some((value) => Number.isInteger(value) && value >= YEAR_MIN && value <= YEAR_MAX)) {
    return 'year-like values detected';
  }

  const sourceText = [item.keyMessage, ...item.bullets, item.visualSuggestion].join(' ');
  const sourceNumbers = extractNumericTokens(sourceText);
  if (sourceNumbers.length < 2) {
    return 'insufficient numeric evidence in source text';
  }

  const unmatched = plotSpec.values.filter((value) => !valueMatchesSource(value, sourceNumbers));
  if (unmatched.length > 0) {
    return `values not grounded in source text (${unmatched.join(', ')})`;
  }

  if (isLikelyOrdinalSeries(plotSpec.values) && plotSpec.labels.some((label) => ORDINAL_LABEL_RE.test(label))) {
    return 'ordinal series detected (likely tier/step numbering)';
  }

  return undefined;
}

function mapPlotKindForBlueprint(
  plotSpec: SlidePlotSpec,
  item: SlideRenderPlan,
  blueprintId: string | undefined
): SlidePlotSpec {
  if (blueprintId !== 'automation-decision-framework-13') return plotSpec;
  if (item.layout === 'chart-right') {
    return {
      ...plotSpec,
      kind: plotSpec.kind === 'scatter' ? 'bar' : plotSpec.kind,
    };
  }
  return plotSpec;
}

function shouldSendToLlm(item: SlideRenderPlan): boolean {
  if (item.plotSpec) return false;
  if (item.visualKind === 'plot') return true;
  if (item.layout === 'chart-right') return true;
  return ELIGIBLE_TYPES.has(item.slideType);
}

export async function plotSpecPlannerNode(
  state: SlideRenderPipelineState
): Promise<Partial<SlideRenderPipelineState>> {
  const candidates = state.renderPlan.filter(shouldSendToLlm);
  if (candidates.length === 0) return {};

  const llm = createLLM();
  const slideById = new Map(state.slides.map((slide) => [slide.id, slide]));
  const inputSlides = candidates.map((item) => ({
    index: item.index,
    title: slideById.get(item.slideId)?.title ?? '',
    slideType: item.slideType,
    keyMessage: item.keyMessage,
    bullets: item.bullets,
    visualSuggestion: item.visualSuggestion,
    currentLayout: item.layout,
    currentVisualKind: item.visualKind ?? 'none',
  }));

  try {
    const response = await llm.invoke([
      new SystemMessage(
        `You are a plot planning assistant for presentation slides.\n` +
          `For each slide input, decide whether a plot should be generated.\n` +
          `Return ONLY JSON with this schema:\n` +
          `{ "results": [{ "index": number, "visualKind": "plot"|"none", "plotSpec"?: { "kind": "bar"|"line"|"scatter", "title"?: string, "xLabel"?: string, "yLabel"?: string, "labels": string[], "values": number[] } }] }\n\n` +
          `Rules:\n` +
          `- Use only explicit numeric values from provided content.\n` +
          `- Never invent numbers.\n` +
          `- Never use years (e.g. 2024, 2025), tier indices, step numbers, or reference IDs as metrics.\n` +
          `- Reject ordinal-looking series such as 1,2,3 for Tier/Step labels.\n` +
          `- If there is no clean numeric series with at least 2 data points, set visualKind to "none".\n` +
          `- Keep labels concise (max 4 words each).`
      ),
      new HumanMessage(`Slides:\n${JSON.stringify(inputSlides)}`),
    ]);

    const raw = (response.content as string)
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '');
    const parsed = JSON.parse(raw) as {
      results?: Array<{
        index: number;
        visualKind?: string;
        plotSpec?: unknown;
      }>;
    };

    const updates = new Map<number, { visualKind: SlideVisualKind; plotSpec?: SlidePlotSpec }>();
    const candidateByIndex = new Map(candidates.map((item) => [item.index, item]));
    const rejectionIssues: string[] = [];
    for (const result of parsed.results ?? []) {
      if (!Number.isInteger(result.index)) continue;
      const visualKind = normalizeVisualKind(result.visualKind);
      const plotSpec = visualKind === 'plot' ? parsePlotSpec(result.plotSpec) : undefined;
      if (visualKind === 'plot' && !plotSpec) continue;
      if (visualKind === 'plot' && plotSpec) {
        const item = candidateByIndex.get(result.index);
        if (!item) continue;
        const mappedPlotSpec = mapPlotKindForBlueprint(plotSpec, item, state.config.blueprintId);
        const validationError = validatePlotSpec(item, mappedPlotSpec);
        if (validationError) {
          rejectionIssues.push(`Slide ${result.index}: dropped plot (${validationError}).`);
          updates.set(result.index, { visualKind: 'none' as const });
          continue;
        }
        updates.set(result.index, {
          visualKind,
          plotSpec: mappedPlotSpec,
        });
        continue;
      }
      updates.set(result.index, {
        visualKind,
        plotSpec,
      });
    }

    const renderPlan = state.renderPlan.map((item) => {
      const update = updates.get(item.index);
      if (!update) return item;

      if (update.visualKind === 'plot' && update.plotSpec) {
        return {
          ...item,
          visualKind: 'plot' as const,
          plotSpec: update.plotSpec,
          layout: 'chart-right' as const,
        };
      }

      return {
        ...item,
        visualKind: 'none' as const,
        plotSpec: undefined,
      };
    });

    return { renderPlan, qaIssues: [...state.qaIssues, ...rejectionIssues] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'plotSpecPlanner failed';
    return { qaIssues: [...state.qaIssues, `plotSpecPlanner: ${message}`] };
  }
}
