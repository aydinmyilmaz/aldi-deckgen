import type { SlideOutline } from '@/types';
import type {
  ChartKind,
  RenderLayoutKind,
  SlideChartSpec,
  SlideRenderPlan,
} from '@/types/render';

const STAT_REGEX = /(\d+(?:\.\d+)?)\s*(%|percent|million|billion|thousand)?/gi;

function cleanBulletText(bullet: string): string {
  return bullet.replace(/^\s*[-•]\s*/, '').trim();
}

function compactLabel(text: string): string {
  const trimmed = text.replace(/\d+(?:\.\d+)?\s*(%|percent|million|billion|thousand)?/gi, '').trim();
  if (!trimmed) return 'Data point';
  return trimmed.length > 28 ? `${trimmed.slice(0, 25)}...` : trimmed;
}

function detectChartData(slide: SlideOutline): SlideChartSpec | null {
  const points: Array<{ label: string; value: number; isPercent: boolean }> = [];

  slide.bullets.forEach((bullet) => {
    const text = cleanBulletText(bullet);
    const matches = [...text.matchAll(STAT_REGEX)];
    if (matches.length === 0) return;

    const first = matches[0];
    const value = Number(first[1]);
    if (!Number.isFinite(value)) return;
    points.push({
      label: compactLabel(text),
      value,
      isPercent: /%|percent/i.test(first[0]),
    });
  });

  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const labels = points.map((p) => p.label);
  const allPercent = points.every((p) => p.isPercent);
  const sum = values.reduce((a, b) => a + b, 0);
  const chartKind: ChartKind = allPercent && sum > 60 && sum < 140 ? 'pie' : 'bar';

  return {
    kind: chartKind,
    title: slide.visualSuggestion || 'Key Data Snapshot',
    seriesName: slide.title,
    labels,
    values,
  };
}

function chooseLayout(slide: SlideOutline, hasChart: boolean): RenderLayoutKind {
  if (slide.slideType === 'title') return 'title-focus';
  if (slide.slideType === 'agenda') return 'agenda-list';
  if (slide.slideType === 'conclusion' || slide.slideType === 'qna') return 'conclusion-focus';
  if (hasChart || slide.slideType === 'findings' || /chart|graph|trend|distribution|breakdown/i.test(slide.visualSuggestion ?? '')) {
    return 'chart-right';
  }
  if ((slide.slideType === 'background' || slide.slideType === 'solution') && slide.keyMessage && (slide.bullets?.length ?? 0) <= 3) {
    return 'quote-callout';
  }
  if (slide.bullets.length >= 4) return 'content-two-column';
  return 'content-single-column';
}

export function buildBaseRenderPlan(slides: SlideOutline[]): SlideRenderPlan[] {
  return slides.map((slide) => {
    const layout = chooseLayout(slide, false);
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
      imageIntent: slide.imageIntent ?? 'none',
      imageQuery: imageQuery ? imageQuery : undefined,
      selectedImageUrl: slide.imageUrl?.trim() || undefined,
      selectedImageAlt: slide.imageAlt?.trim() || undefined,
      selectedImageAttributionLine: slide.imageAttributionLine?.trim() || undefined,
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

    const chart = detectChartData(sourceSlide);
    const layout =
      item.slideType === 'title' || item.slideType === 'conclusion' || item.slideType === 'qna'
        ? item.layout
        : chooseLayout(sourceSlide, Boolean(chart));

    return {
      ...item,
      layout,
      chart: chart ?? undefined,
    };
  });
}
