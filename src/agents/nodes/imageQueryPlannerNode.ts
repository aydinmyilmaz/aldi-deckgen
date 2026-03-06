import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { ImageIntent, SlideOutline, SlideType } from '@/types';
import type { PipelineState } from '../state';

const NON_VISUAL_TYPES = new Set<SlideType>(['agenda', 'qna', 'references']);

function normalizeImageIntent(intent: unknown, slideType: SlideType): ImageIntent {
  if (NON_VISUAL_TYPES.has(slideType)) return 'none';
  if (typeof intent !== 'string') return 'optional';
  const normalized = intent.trim().toLowerCase();
  if (normalized === 'required' || normalized === 'optional' || normalized === 'none') {
    return normalized;
  }
  return 'optional';
}

function normalizeImageQuery(query: unknown): string | undefined {
  if (typeof query !== 'string') return undefined;
  const cleaned = query.replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;
  return cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
}

function clearImageFields(slides: SlideOutline[]): SlideOutline[] {
  return slides.map((slide) => ({
    ...slide,
    imageIntent: 'none',
    imageQuery: undefined,
  }));
}

export async function imageQueryPlannerNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { slides, config } = state;

  if (!config.useRelatedImages) {
    return { slides: clearImageFields(slides) };
  }

  if (slides.length === 0) {
    return { slides };
  }

  try {
    const { mainTopic, summary, keyThemes } = state;
    const llm = createLLM();
    const contextLines: string[] = [];
    if (mainTopic) contextLines.push(`Topic: ${mainTopic}`);
    if (summary) contextLines.push(`Summary: ${summary}`);
    if (keyThemes?.length) contextLines.push(`Key themes: ${keyThemes.join(', ')}`);
    const contextBlock = contextLines.length
      ? `\n\nPresentation context:\n${contextLines.join('\n')}`
      : '';
    const response = await llm.invoke([
      new SystemMessage(
        `You are a visual research planner for slides. ` +
        `Given slide content, decide if a stock image is useful and generate an image query only when it adds value. ` +
        `Return ONLY JSON with this schema:\n` +
        `{ "slides": [{ "index": number, "imageIntent": "none"|"optional"|"required", "imageQuery": string }] }\n\n` +
        `Rules:\n` +
        `- For agenda, qna, references: imageIntent must be "none".\n` +
        `- Queries must be concise (3-8 words), concrete visual nouns, no brand names.\n` +
        `- Prefer photo-friendly concepts (people, workplace, technology scenes, industry objects).\n` +
        `- If the concept is too abstract, set imageIntent to "none".\n` +
        `- Ground queries in the overall presentation topic and themes when relevant.\n` +
        `- Keep response language in English for search compatibility.`
      ),
      new HumanMessage(
        `Slides:\n${JSON.stringify(
          slides.map((slide) => ({
            index: slide.index,
            title: slide.title,
            slideType: slide.slideType,
            keyMessage: slide.keyMessage ?? '',
            bullets: slide.bullets.slice(0, 4),
          }))
        )}${contextBlock}`
      ),
    ]);

    const raw = (response.content as string)
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '');
    const parsed = JSON.parse(raw) as {
      slides?: Array<{ index: number; imageIntent?: string; imageQuery?: string }>;
    };
    const byIndex = new Map<number, { imageIntent?: string; imageQuery?: string }>();
    (parsed.slides ?? []).forEach((item) => {
      if (!Number.isInteger(item.index)) return;
      byIndex.set(item.index, item);
    });

    const mergedSlides = slides.map((slide) => {
      const suggestion = byIndex.get(slide.index);
      const intent = normalizeImageIntent(suggestion?.imageIntent, slide.slideType);
      const query = normalizeImageQuery(suggestion?.imageQuery);
      return {
        ...slide,
        imageIntent: intent,
        imageQuery: intent === 'none' ? undefined : query,
      };
    });

    return { slides: mergedSlides };
  } catch {
    // Never fail the generation flow because image-query planning is optional.
    return { slides };
  }
}
