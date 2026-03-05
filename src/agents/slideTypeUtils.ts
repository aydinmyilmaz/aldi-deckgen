import type { SlideType } from '@/types';

const VALID_SLIDE_TYPES = new Set<SlideType>([
  'title',
  'agenda',
  'background',
  'problem',
  'objectives',
  'method',
  'findings',
  'solution',
  'implementation',
  'benefits',
  'conclusion',
  'qna',
  'references',
  'content',
]);

export interface OutlineBlueprint {
  index: number;
  title: string;
  slideType: SlideType;
  keyMessage: string;
  visualSuggestion: string;
}

function asNonEmptyString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function normalizeSlideType(slideType: unknown): SlideType {
  if (typeof slideType !== 'string') return 'content';
  const normalized = slideType.trim().toLowerCase() as SlideType;
  return VALID_SLIDE_TYPES.has(normalized) ? normalized : 'content';
}

export function normalizeOutlineBlueprint(
  rawSlides: unknown,
  slideCount: number
): OutlineBlueprint[] {
  const byIndex = new Map<number, OutlineBlueprint>();
  const source = Array.isArray(rawSlides) ? rawSlides : [];

  for (const raw of source) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as Record<string, unknown>;
    const index = Number(candidate.index);
    if (!Number.isInteger(index) || index < 1 || index > slideCount) continue;
    if (byIndex.has(index)) continue;

    byIndex.set(index, {
      index,
      title: asNonEmptyString(candidate.title, `Slide ${index}`),
      slideType: normalizeSlideType(candidate.slideType),
      keyMessage: asNonEmptyString(candidate.keyMessage, ''),
      visualSuggestion: asNonEmptyString(candidate.visualSuggestion, ''),
    });
  }

  const slides: OutlineBlueprint[] = [];
  for (let index = 1; index <= slideCount; index += 1) {
    slides.push(
      byIndex.get(index) ?? {
        index,
        title: `Slide ${index}`,
        slideType: 'content',
        keyMessage: '',
        visualSuggestion: '',
      }
    );
  }

  if (slides.length > 0) {
    slides[0].slideType = 'title';
  }
  if (slides.length > 1) {
    slides[slides.length - 1].slideType = 'conclusion';
  }

  if (slides.length >= 3) {
    const middle = slides.slice(1, -1);
    const hasContentSlide = middle.some((slide) => slide.slideType === 'content');
    if (!hasContentSlide) {
      middle[0].slideType = 'content';
    }
  }

  return slides;
}
