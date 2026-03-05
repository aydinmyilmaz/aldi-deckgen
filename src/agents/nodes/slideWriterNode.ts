import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import { getPresentationGuidelines, getSlideTypeRules } from '@/lib/presentationGuidelines';
import { normalizeSlideType } from '../slideTypeUtils';
import { v4 as uuidv4 } from 'uuid';
import type { PipelineState } from '../state';
import type { SlideOutline, SlideType } from '@/types';

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
    return `--- Slide ${s.index} [type: ${s.slideType ?? 'content'}] ---\nTitle: "${s.title}"\n${typeRules}`;
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
      `• title: use the blueprint title exactly — do not paraphrase.\n` +
      `• Use numbers/percentages only when source content has them — never force statistics.\n\n` +
      `Each slide below specifies its TYPE and TYPE-SPECIFIC RULES — follow them exactly.\n\n` +
      `Output ONLY raw JSON (no markdown code fences):\n` +
      `{ "slides": [{ "index": number, "title": string, "slideType": string, "keyMessage": string, "bullets": string[], "speakerNotes": string, "visualSuggestion": string }] }`
    ),
    new HumanMessage(
      `SLIDE BLUEPRINTS WITH TYPE RULES:\n\n${slideBlueprintWithRules}\n\n` +
      `SOURCE CONTENT:\n${sourceContent}${revisionBlock}`
    ),
  ]);

  const raw = (response.content as string).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(raw);
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
    }>
  ).map((s) => ({
    ...s,
    id: uuidv4(),
    slideType: (expectedTypeByIndex.get(s.index) ?? normalizeSlideType(s.slideType)) as SlideType,
  }));

  return { slides };
}
