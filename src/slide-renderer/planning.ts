import type { LayoutHint, SlideOutline, SlidePlotSpec, SlideVisualKind } from '@/types';
import type {
  ChartKind,
  RenderLayoutKind,
  SlideChartSpec,
  SlideRenderPlan,
} from '@/types/render';

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

function isLayoutHint(value: unknown): value is LayoutHint {
  return typeof value === 'string' && VALID_LAYOUT_HINTS.has(value as LayoutHint);
}

function cleanBulletText(bullet: string): string {
  return bullet.replace(/^\s*[-•]\s*/, '').trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function isLegibleCardGrid(slide: SlideOutline): boolean {
  const cards = slide.cardItems ?? [];
  if (cards.length < 2 || cards.length > 4) return false;

  const perCardBulletLimit = 3;
  const perBulletWordLimit = cards.length === 4 ? 10 : 12;

  return cards.every((card) => {
    if (wordCount(card.title) > 6) return false;
    if (card.bullets.length < 1 || card.bullets.length > perCardBulletLimit) return false;
    return card.bullets.every((bullet) => wordCount(bullet) <= perBulletWordLimit);
  });
}

function isLegibleComparisonTable(slide: SlideOutline): boolean {
  const table = slide.tableData;
  if (!table) return false;

  const colCount = table.headers.length;
  if (colCount < 2 || colCount > 5) return false;
  if (table.rows.length < 2 || table.rows.length > 6) return false;
  if (table.headers.some((header) => wordCount(header) > 4 || header.length > 26)) return false;

  return table.rows.every((row) =>
    row.length === colCount &&
    row.every((cell) => wordCount(cell) <= 8 && cell.length <= 42)
  );
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

function normalizePlotSpec(plotSpec: SlidePlotSpec | undefined): SlidePlotSpec | undefined {
  if (!plotSpec) return undefined;
  if (plotSpec.kind !== 'bar' && plotSpec.kind !== 'line' && plotSpec.kind !== 'scatter') return undefined;

  const labels = (plotSpec.labels ?? []).map((label) => label.trim()).filter(Boolean).slice(0, 8);
  const values = (plotSpec.values ?? [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .slice(0, 8);
  if (labels.length < 2 || values.length < 2 || labels.length !== values.length) return undefined;

  return {
    kind: plotSpec.kind,
    title: plotSpec.title?.trim() || undefined,
    xLabel: plotSpec.xLabel?.trim() || undefined,
    yLabel: plotSpec.yLabel?.trim() || undefined,
    labels,
    values,
  };
}

function chartFromPlotSpec(plotSpec: SlidePlotSpec, slide: SlideOutline): SlideChartSpec {
  const chartKind: ChartKind = plotSpec.kind === 'line' ? 'line' : 'bar';
  return {
    kind: chartKind,
    title: plotSpec.title || slide.visualSuggestion || 'Key Data Snapshot',
    seriesName: slide.title,
    labels: plotSpec.labels,
    values: plotSpec.values,
  };
}

function chooseLayout(
  slide: SlideOutline,
  options: { hasChart: boolean; hasPlot: boolean }
): RenderLayoutKind {
  const { hasChart, hasPlot } = options;
  const hintedLayout = isLayoutHint(slide.layoutHint) ? slide.layoutHint : undefined;

  if (slide.slideType === 'title') return 'title-focus';
  if (slide.slideType === 'agenda') return 'agenda-list';
  if (slide.slideType === 'conclusion' || slide.slideType === 'qna') return 'conclusion-focus';
  if (hasPlot || hasChart) return 'chart-right';

  if (hintedLayout && (
    hintedLayout === 'decision-tree' ||
    hintedLayout === 'criteria-table' ||
    hintedLayout === 'matrix-2x2' ||
    hintedLayout === 'tier-detail-split' ||
    hintedLayout === 'adoption-path'
  )) {
    return hintedLayout;
  }

  if ((slide.statCards?.length ?? 0) >= 2) return 'stats-highlight';
  if (isLegibleCardGrid(slide)) return 'card-grid';
  if (isLegibleComparisonTable(slide)) return 'comparison-table';

  if (hintedLayout) {
    if (hintedLayout === 'card-grid' && !isLegibleCardGrid(slide)) {
      // ignore invalid hinted card grid
    } else if (hintedLayout === 'comparison-table' && !isLegibleComparisonTable(slide)) {
      // ignore invalid hinted table
    } else if (hintedLayout === 'stats-highlight' && (slide.statCards?.length ?? 0) < 2) {
      // ignore invalid hinted stat cards
    } else {
      return hintedLayout;
    }
  }

  if (
    (slide.slideType === 'background' || slide.slideType === 'solution') &&
    slide.keyMessage &&
    (slide.bullets?.length ?? 0) <= 3
  ) {
    return 'quote-callout';
  }
  if (slide.bullets.length >= 4) return 'content-two-column';
  return 'content-single-column';
}

export function buildBaseRenderPlan(slides: SlideOutline[]): SlideRenderPlan[] {
  return slides.map((slide) => {
    const plotSpec = normalizePlotSpec(slide.plotSpec);
    const visualKind = normalizeVisualKind(slide.visualKind);
    const hasPlot = visualKind === 'plot' && Boolean(plotSpec);
    const layout = chooseLayout(slide, { hasChart: false, hasPlot });
    const imageQuery = slide.imageQuery?.trim();

    return {
      slideId: slide.id,
      index: slide.index,
      slideType: slide.slideType ?? 'content',
      layout,
      bullets: slide.bullets.map(cleanBulletText),
      keyMessage: slide.keyMessage ?? '',
      speakerNotes: slide.speakerNotes ?? '',
      visualSuggestion: slide.visualSuggestion ?? '',
      layoutHint: isLayoutHint(slide.layoutHint) ? slide.layoutHint : undefined,
      visualKind,
      plotSpec,
      imageIntent: slide.imageIntent ?? 'none',
      imageQuery: imageQuery || undefined,
      selectedImageUrl: slide.imageUrl?.trim() || undefined,
      selectedImageAlt: slide.imageAlt?.trim() || undefined,
      selectedImageAttributionLine: slide.imageAttributionLine?.trim() || undefined,
      statCards: slide.statCards,
      cardItems: slide.cardItems,
      tableData: slide.tableData,
    };
  });
}

export function attachChartsToPlan(
  slides: SlideOutline[],
  plan: SlideRenderPlan[]
): SlideRenderPlan[] {
  const slideById = new Map(slides.map((slide) => [slide.id, slide]));

  return plan.map((item) => {
    const sourceSlide = slideById.get(item.slideId);
    if (!sourceSlide) return item;

    const plotSpec = normalizePlotSpec(sourceSlide.plotSpec) ?? normalizePlotSpec(item.plotSpec);
    const visualKind = normalizeVisualKind(sourceSlide.visualKind ?? item.visualKind);
    const chart = plotSpec ? chartFromPlotSpec(plotSpec, sourceSlide) : undefined;
    const layout =
      item.slideType === 'title' || item.slideType === 'conclusion' || item.slideType === 'qna'
        ? item.layout
        : chooseLayout(sourceSlide, {
            hasChart: Boolean(chart),
            hasPlot: visualKind === 'plot',
          });

    return {
      ...item,
      layout,
      visualKind,
      plotSpec,
      chart,
    };
  });
}
