import { getNumericDensityThreshold } from '@/lib/presentationGuidelines';
import type { PipelineState } from '../state';

const MAX_BULLET_WORDS = 12;
const MAX_KEY_MESSAGE_WORDS = 15;
const MAX_RETRIES = 2;

// Slide types where the standard bullet-count / word-count rules are relaxed
const RELAXED_BULLET_TYPES = new Set(['title', 'qna', 'references', 'agenda']);
// Slide types where statistics in bullets are expected/allowed
const STATS_ALLOWED_TYPES = new Set(['findings', 'problem', 'benefits', 'objectives']);
// Slide types where bullets should start with verbs
const VERB_FIRST_TYPES = new Set(['objectives', 'implementation', 'conclusion']);

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function hasMarkdown(text: string): boolean {
  return /\*\*|__|\*(?!\*)/.test(text);
}

function startsWithVerb(text: string): boolean {
  return /^[A-Z][a-z]+/.test(text.trim()) && !/^\d/.test(text.trim());
}

export function contentReviewerNode(
  state: PipelineState
): Partial<PipelineState> {
  const { slides, reviewAttempts, config } = state;
  const issues: string[] = [];
  const sortedSlides = [...slides].sort((a, b) => a.index - b.index);

  const firstSlide = sortedSlides.find((slide) => slide.index === 1) ?? sortedSlides[0];
  if (firstSlide && firstSlide.slideType !== 'title') {
    issues.push(`Slide 1 must be [title], got [${firstSlide.slideType}].`);
  }

  const lastSlide =
    sortedSlides.find((slide) => slide.index === config.slideCount) ??
    sortedSlides[sortedSlides.length - 1];
  if (lastSlide && lastSlide.slideType !== 'conclusion') {
    issues.push(`Final slide must be [conclusion], got [${lastSlide.slideType}].`);
  }

  if (config.slideCount >= 3) {
    const middleSlides = sortedSlides.filter(
      (slide) => slide.index > 1 && slide.index < config.slideCount
    );
    if (middleSlides.length > 0 && !middleSlides.some((slide) => slide.slideType === 'content')) {
      issues.push(`Slides 2-${config.slideCount - 1} must include at least one [content] slide.`);
    }
  }

  for (const slide of slides) {
    const type = slide.slideType ?? 'content';
    const isRelaxed = RELAXED_BULLET_TYPES.has(type);

    // ── Bullet count ──────────────────────────────────────────────────────
    if (type === 'qna') {
      if (slide.bullets.length > 2) {
        issues.push(`Slide ${slide.index} [qna]: max 2 bullets allowed (currently ${slide.bullets.length}).`);
      }
    } else if (type === 'agenda') {
      if (slide.bullets.length < 3 || slide.bullets.length > 8) {
        issues.push(`Slide ${slide.index} [agenda]: should have 3–8 items (currently ${slide.bullets.length}).`);
      }
    } else if (!isRelaxed) {
      if (slide.bullets.length < 3) {
        issues.push(`Slide ${slide.index} [${type}]: only ${slide.bullets.length} bullets — add more (minimum 3).`);
      }
      if (slide.bullets.length > 5) {
        issues.push(`Slide ${slide.index} [${type}]: ${slide.bullets.length} bullets — reduce to maximum 5.`);
      }
    }

    // ── Per-bullet checks ─────────────────────────────────────────────────
    slide.bullets.forEach((bullet, i) => {
      // Word count — relaxed for references, agenda labels
      const maxWords = type === 'references' ? 30 : type === 'agenda' ? 6 : MAX_BULLET_WORDS;
      const wc = wordCount(bullet);
      if (wc > maxWords) {
        issues.push(
          `Slide ${slide.index} [${type}], bullet ${i + 1}: ${wc} words (max ${maxWords}). ` +
          `Shorten: "${bullet.slice(0, 60)}${bullet.length > 60 ? '…' : ''}"`
        );
      }

      // Markdown
      if (hasMarkdown(bullet)) {
        issues.push(
          `Slide ${slide.index} [${type}], bullet ${i + 1}: contains markdown formatting. Remove all **bold** and *italic*.`
        );
      }

      // Verb-first types
      if (VERB_FIRST_TYPES.has(type) && !startsWithVerb(bullet)) {
        issues.push(
          `Slide ${slide.index} [${type}], bullet ${i + 1}: should start with an action verb (e.g. "Prioritize", "Invest", "Build"). Got: "${bullet.slice(0, 40)}"`
        );
      }
    });

    // ── Key message length ────────────────────────────────────────────────
    if (slide.keyMessage && wordCount(slide.keyMessage) > MAX_KEY_MESSAGE_WORDS) {
      issues.push(
        `Slide ${slide.index} [${type}]: keyMessage is ${wordCount(slide.keyMessage)} words (max ${MAX_KEY_MESSAGE_WORDS}). Shorten it.`
      );
    }

    // ── Statistics in wrong slide types ───────────────────────────────────
    if (!STATS_ALLOWED_TYPES.has(type) && type !== 'content') {
      const statsPattern = /\d+%|\d+\s*(?:percent|million|billion|thousand)/i;
      const statBullets = slide.bullets.filter((b) => statsPattern.test(b));
      if (statBullets.length > 1) {
        issues.push(
          `Slide ${slide.index} [${type}]: ${statBullets.length} bullets contain statistics. ` +
          `This slide type should use insights/statements, not raw numbers. Keep at most 1 if essential.`
        );
      }
    }
  }

  // ── Global: numeric density across all slides ─────────────────────────
  const statsPattern = /\d+%|\d+\s*(?:percent|million|billion|thousand)/i;
  const numericBullets = slides
    .filter((s) => !STATS_ALLOWED_TYPES.has(s.slideType ?? 'content'))
    .flatMap((s) => s.bullets)
    .filter((b) => statsPattern.test(b));
  const threshold = getNumericDensityThreshold(config);
  if (numericBullets.length > threshold) {
    issues.push(
      `Too many statistics in non-data slides (${numericBullets.length} bullets with numbers, threshold ${threshold}). ` +
      `Curate: keep only the 1–2 most impactful numbers per slide, replace others with insight-driven statements.`
    );
  }

  // ── Purpose-specific: sell deck needs CTA ────────────────────────────
  if (config.purpose === 'sell') {
    const lastSlide = slides.find((s) => s.index === config.slideCount);
    const ctaPattern = /\b(start|try|contact|book|schedule|sign up|join|get|buy|request|demo|pilot|apply)\b/i;
    if (lastSlide && !ctaPattern.test(lastSlide.keyMessage ?? '') && !lastSlide.bullets.some((b) => ctaPattern.test(b))) {
      issues.push(
        `Slide ${config.slideCount} (sell deck): missing a clear call to action. ` +
        `Add a specific CTA in keyMessage or a bullet (e.g. "Book a 30-min demo this week").`
      );
    }
  }

  // ── Purpose-specific: decide deck needs recommendation ───────────────
  if (config.purpose === 'decide') {
    const hasRecommendation = slides.some((s) =>
      /\b(recommend|propose|suggest|our view|decision|approve|proceed)\b/i.test(
        [s.keyMessage ?? '', ...s.bullets].join(' ')
      )
    );
    if (!hasRecommendation) {
      issues.push(
        `Decide deck: no clear recommendation found. At least one slide must state a direct recommendation or decision.`
      );
    }
  }

  const newAttempts = reviewAttempts + 1;

  if (issues.length === 0 || newAttempts > MAX_RETRIES) {
    return { reviewFeedback: '', reviewAttempts: newAttempts };
  }

  return {
    reviewFeedback:
      `REVISION REQUIRED. Fix these specific issues:\n` +
      issues.map((issue, n) => `${n + 1}. ${issue}`).join('\n'),
    reviewAttempts: newAttempts,
  };
}
