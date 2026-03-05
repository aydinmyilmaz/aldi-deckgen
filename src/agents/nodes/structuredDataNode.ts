import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';
import type { SlideOutline, StatCard, CardItem, TableData } from '@/types';

const STRUCTURED_SLIDE_TYPES = new Set([
  'findings',
  'problem',
  'solution',
  'benefits',
  'implementation',
  'background',
  'objectives',
]);

const STRUCTURED_VISUAL_RE = /statistic|percent|comparison|card|table|grid|highlight/i;

function isEligible(slide: SlideOutline): boolean {
  return STRUCTURED_SLIDE_TYPES.has(slide.slideType) ||
    STRUCTURED_VISUAL_RE.test(slide.visualSuggestion ?? '');
}

export async function structuredDataNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const eligible = state.slides.filter(isEligible);
  if (eligible.length === 0) return {};

  const llm = createLLM();

  const slideDescriptions = eligible.map((s) =>
    `Slide ${s.index} [type: ${s.slideType}]\nTitle: "${s.title}"\nBullets:\n${s.bullets.map((b) => `- ${b}`).join('\n')}\nVisual suggestion: ${s.visualSuggestion ?? 'none'}`
  ).join('\n\n---\n\n');

  const response = await llm.invoke([
    new SystemMessage(
      `You are a data structuring assistant for presentation slides.\n` +
      `For each slide provided, decide which ONE structured layout it best fits and return data for it:\n\n` +
      `- "statCards": for slides with 2–4 key statistics/metrics. Each card has a "value" (big number/%, e.g. "78%"), "label" (descriptor, ≤5 words), and optional "context" (footnote, ≤8 words).\n` +
      `- "cardItems": for slides listing 2–4 distinct concepts/options/steps. Each card has optional "badge" (category label, ≤2 words), "title" (card heading, ≤6 words), and "bullets" (2–3 supporting points, each ≤10 words).\n` +
      `- "tableData": for slides comparing items across attributes. "headers" is the column labels array; "rows" is a 2D array of cell strings. 2–5 columns, 2–6 data rows.\n` +
      `- "none": if no structured layout fits.\n\n` +
      `Output ONLY raw JSON (no markdown fences):\n` +
      `{ "results": [{ "index": number, "type": "statCards"|"cardItems"|"tableData"|"none", "statCards"?: [...], "cardItems"?: [...], "tableData"?: { "headers": [...], "rows": [[...]] } }] }`
    ),
    new HumanMessage(
      `Slides to structure:\n\n${slideDescriptions}`
    ),
  ]);

  const raw = (response.content as string).trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');

  let parsed: { results: Array<{ index: number; type: string; statCards?: unknown; cardItems?: unknown; tableData?: unknown }> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // If LLM output is invalid JSON, skip structured data silently
    return {};
  }

  const updateByIndex = new Map(
    parsed.results
      .filter((r) => r.type !== 'none')
      .map((r) => [r.index, r])
  );

  const updatedSlides = state.slides.map((slide) => {
    const update = updateByIndex.get(slide.index);
    if (!update) return slide;
    return {
      ...slide,
      ...(update.type === 'statCards' && update.statCards ? { statCards: update.statCards as StatCard[] } : {}),
      ...(update.type === 'cardItems' && update.cardItems ? { cardItems: update.cardItems as CardItem[] } : {}),
      ...(update.type === 'tableData' && update.tableData ? { tableData: update.tableData as TableData } : {}),
    };
  });

  return { slides: updatedSlides };
}
