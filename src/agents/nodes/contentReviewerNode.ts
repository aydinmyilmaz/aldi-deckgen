import { getNumericDensityThreshold } from '@/lib/presentationGuidelines';
import type { PipelineState } from '../state';

const MAX_BULLET_WORDS = 12;
const MAX_KEY_MESSAGE_WORDS = 15;
const MAX_TITLE_WORDS = 8;
const MAX_TITLE_CHARS = 64;
const MAX_BULLET_CHARS = 88;
const MAX_RETRIES = 4;

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

function hasEllipsis(text: string): boolean {
  return /(\.\.\.|…)/.test(text);
}

function hasDanglingEnding(text: string): boolean {
  return /[,:;\-—]\s*$/.test(text.trim());
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
    const titleWords = wordCount(slide.title || '');
    if ((slide.title || '').trim().length > MAX_TITLE_CHARS) {
      issues.push(
        `Slide ${slide.index} [${type}]: title is too long (${slide.title.trim().length} chars, max ${MAX_TITLE_CHARS}).`
      );
    }
    if (titleWords > MAX_TITLE_WORDS) {
      issues.push(
        `Slide ${slide.index} [${type}]: title is ${titleWords} words (max ${MAX_TITLE_WORDS}). Shorten to a concise headline.`
      );
    }
    if (hasEllipsis(slide.title || '')) {
      issues.push(`Slide ${slide.index} [${type}]: title contains ellipsis. Use a complete concise title.`);
    }
    if (hasDanglingEnding(slide.title || '')) {
      issues.push(`Slide ${slide.index} [${type}]: title appears incomplete (dangling punctuation).`);
    }

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
      if (type !== 'references' && bullet.length > MAX_BULLET_CHARS) {
        issues.push(
          `Slide ${slide.index} [${type}], bullet ${i + 1}: ${bullet.length} chars (max ${MAX_BULLET_CHARS}) for readability.`
        );
      }
      if (hasEllipsis(bullet)) {
        issues.push(
          `Slide ${slide.index} [${type}], bullet ${i + 1}: contains ellipsis. Write complete statement without "...".`
        );
      }
      if (hasDanglingEnding(bullet)) {
        issues.push(
          `Slide ${slide.index} [${type}], bullet ${i + 1}: appears truncated (dangling punctuation).`
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
    if (slide.keyMessage && hasEllipsis(slide.keyMessage)) {
      issues.push(
        `Slide ${slide.index} [${type}]: keyMessage contains ellipsis. Use a complete sentence.`
      );
    }
    if (slide.keyMessage && hasDanglingEnding(slide.keyMessage)) {
      issues.push(
        `Slide ${slide.index} [${type}]: keyMessage appears truncated (dangling punctuation).`
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

    const cardItems = slide.cardItems;
    if (cardItems?.length) {
      if (cardItems.length < 2 || cardItems.length > 4) {
        issues.push(
          `Slide ${slide.index} [${type}]: cardItems count should be 2-4 (currently ${cardItems.length}).`
        );
      }
      const perCardBulletMax = cardItems.length === 4 ? 2 : 3;
      cardItems.forEach((card, cardIdx) => {
        const titleWc = wordCount(card.title);
        if (titleWc > 6) {
          issues.push(
            `Slide ${slide.index} [${type}], card ${cardIdx + 1}: title is ${titleWc} words (max 6).`
          );
        }
        if (card.bullets.length < 1 || card.bullets.length > perCardBulletMax) {
          issues.push(
            `Slide ${slide.index} [${type}], card ${cardIdx + 1}: should have 1-${perCardBulletMax} bullets (currently ${card.bullets.length}).`
          );
        }
        card.bullets.forEach((bullet, bulletIdx) => {
          const wc = wordCount(bullet);
          const cardBulletMaxWords = cardItems.length === 4 ? 8 : 10;
          if (wc > cardBulletMaxWords) {
            issues.push(
              `Slide ${slide.index} [${type}], card ${cardIdx + 1}, bullet ${bulletIdx + 1}: ${wc} words (max ${cardBulletMaxWords}).`
            );
          }
          if (hasEllipsis(bullet) || hasDanglingEnding(bullet)) {
            issues.push(
              `Slide ${slide.index} [${type}], card ${cardIdx + 1}, bullet ${bulletIdx + 1}: appears truncated.`
            );
          }
        });
      });
    }

    if (slide.tableData) {
      const colCount = slide.tableData.headers.length;
      const rowCount = slide.tableData.rows.length;
      if (colCount < 2 || colCount > 5) {
        issues.push(
          `Slide ${slide.index} [${type}]: table headers should have 2-5 columns (currently ${colCount}).`
        );
      }
      if (rowCount < 2 || rowCount > 6) {
        issues.push(
          `Slide ${slide.index} [${type}]: table rows should have 2-6 rows (currently ${rowCount}).`
        );
      }
      slide.tableData.headers.forEach((header, colIdx) => {
        if (wordCount(header) > 4 || header.length > 26) {
          issues.push(
            `Slide ${slide.index} [${type}]: table header ${colIdx + 1} is too long for readability.`
          );
        }
      });
      slide.tableData.rows.forEach((row, rowIdx) => {
        if (row.length !== colCount) {
          issues.push(
            `Slide ${slide.index} [${type}]: table row ${rowIdx + 1} column count mismatch.`
          );
        }
        row.forEach((cell, colIdx) => {
          if (wordCount(cell) > 8 || cell.length > 42) {
            issues.push(
              `Slide ${slide.index} [${type}]: table cell r${rowIdx + 1}c${colIdx + 1} is too long for slide readability.`
            );
          }
        });
      });
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
