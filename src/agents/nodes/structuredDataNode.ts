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

const STRUCTURED_VISUAL_RE = /statistic|percent|comparison|card|table|grid|highlight|tier|framework|use case|decision tree|criteria|matrix|adoption path/i;
const STRUCTURED_LAYOUT_HINTS = new Set(['stats-highlight', 'card-grid', 'list-cards', 'comparison-table', 'criteria-table']);

function isEligible(slide: SlideOutline): boolean {
  if (slide.layoutHint && STRUCTURED_LAYOUT_HINTS.has(slide.layoutHint)) return true;
  return STRUCTURED_SLIDE_TYPES.has(slide.slideType) ||
    STRUCTURED_VISUAL_RE.test(slide.visualSuggestion ?? '');
}

function asText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/(\.\.\.|…)+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[,:;\-—]\s*$/g, '')
    .trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function limitWords(text: string, maxWords: number): string {
  const words = asText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

function sanitizeStatCards(input: unknown): StatCard[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const cards = input
    .map((candidate) => (candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : null))
    .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate))
    .map((candidate) => {
      const value = asText(candidate.value);
      const label = limitWords(asText(candidate.label), 5);
      const context = limitWords(asText(candidate.context), 8);
      if (!value || !label) return undefined;
      return {
        value: value.slice(0, 20),
        label,
        ...(context ? { context } : {}),
      } satisfies StatCard;
    })
    .filter((card): card is StatCard => Boolean(card))
    .slice(0, 4);

  if (cards.length < 2) return undefined;
  return cards;
}

function sanitizeCardItems(input: unknown): CardItem[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const raw = input
    .map((candidate) => (candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : null))
    .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate))
    .map((candidate) => {
      const badge = limitWords(asText(candidate.badge), 2);
      const title = limitWords(asText(candidate.title), 6);
      const bullets = Array.isArray(candidate.bullets)
        ? candidate.bullets
            .map((bullet) => asText(bullet))
            .filter(Boolean)
        : [];
      if (!title) return undefined;
      return {
        ...(badge ? { badge } : {}),
        title,
        bullets,
      };
    })
    .filter((item): item is { badge?: string; title: string; bullets: string[] } => Boolean(item))
    .slice(0, 5);

  if (raw.length < 2) return undefined;

  const perCardBulletLimit = 3;
  const perBulletWordLimit = raw.length >= 4 ? 10 : 12;

  const cards = raw
    .map((item) => {
      const bullets = item.bullets
        .map((bullet) => limitWords(bullet, perBulletWordLimit))
        .filter(Boolean)
        .slice(0, perCardBulletLimit);
      if (bullets.length === 0) return undefined;
      return {
        ...(item.badge ? { badge: item.badge } : {}),
        title: item.title,
        bullets,
      } satisfies CardItem;
    })
    .filter((item): item is CardItem => Boolean(item));

  if (cards.length < 2) return undefined;
  return cards;
}

function sanitizeTableData(input: unknown): TableData | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const candidate = input as Record<string, unknown>;
  const headersRaw = Array.isArray(candidate.headers) ? candidate.headers : [];
  const headers = headersRaw
    .map((header) => limitWords(asText(header), 4))
    .filter((header) => header.length > 0)
    .slice(0, 5);

  if (headers.length < 2) return undefined;
  const colCount = headers.length;

  const rowsRaw = Array.isArray(candidate.rows) ? candidate.rows : [];
  const rows = rowsRaw
    .map((row) => {
      if (!Array.isArray(row)) return undefined;
      const cells = row
        .slice(0, colCount)
        .map((cell) => limitWords(asText(cell), 8));
      if (cells.length !== colCount || cells.some((cell) => !cell)) return undefined;
      return cells;
    })
    .filter((row): row is string[] => Boolean(row))
    .slice(0, 6);

  if (rows.length < 2) return undefined;
  return { headers, rows };
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
      `- "cardItems": for slides listing 2–5 distinct concepts/options/steps/tier blocks. Each card has optional "badge" (category label, ≤2 words), "title" (card heading, ≤6 words), and "bullets" (2–3 supporting points, each ≤10 words).\n` +
      `  Use 2–4 cards for grid layout (card-grid), use 3–5 cards for full-width stacked layout (list-cards).\n` +
      `  Prefer "cardItems" for tiered frameworks (Tier 1/2/3), decision branches, and side-by-side use-case blocks.\n` +
      `- "tableData": for slides comparing items across attributes. "headers" is the column labels array; "rows" is a 2D array of cell strings. 2–5 columns, 2–6 data rows, concise cell text.\n` +
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
    (parsed.results ?? [])
      .filter((r) => r.type !== 'none')
      .map((r) => [r.index, r])
  );

  const updatedSlides = state.slides.map((slide) => {
    const update = updateByIndex.get(slide.index);
    if (!update) return slide;
    const statCards = update.type === 'statCards' ? sanitizeStatCards(update.statCards) : undefined;
    const cardItems = update.type === 'cardItems' ? sanitizeCardItems(update.cardItems) : undefined;
    const tableData = update.type === 'tableData' ? sanitizeTableData(update.tableData) : undefined;

    return {
      ...slide,
      ...(statCards ? { statCards } : {}),
      ...(cardItems ? { cardItems } : {}),
      ...(tableData ? { tableData } : {}),
    };
  });

  return { slides: updatedSlides };
}
