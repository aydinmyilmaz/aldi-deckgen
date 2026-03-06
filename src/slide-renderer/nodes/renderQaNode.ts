import type { SlideRenderPipelineState } from '@/slide-renderer/state';
import type { SlideRenderPlan } from '@/types/render';

const MAX_BULLETS_SINGLE_COL = 6;
const MAX_BULLETS_TWO_COL = 10;
const MAX_BULLETS_CHART_RIGHT = 4;
const MAX_BULLETS_AGENDA = 8;
const MAX_BULLETS_TIER_SPLIT = 8;
const MAX_BULLETS_ADOPTION = 6;
const MAX_BULLETS_MATRIX = 4;
const MAX_BULLETS_DECISION_TREE = 6;
const MAX_BULLETS_CARD_GRID = 8;
const MAX_BULLETS_CRITERIA_TABLE = 8;
const MAX_BULLETS_COMPARISON_TABLE = 8;
const MAX_BULLETS_DEFAULT = 4;
const MAX_KEY_MESSAGE_WORDS = 18;
const MAX_WORDS_CHART_RIGHT = 10;
const MAX_CHARS_CHART_RIGHT_TOTAL = 210;
const MAX_CHARS_PER_BULLET_CHART_RIGHT = 78;
const MAX_CARD_GRID_TOTAL_WORDS = 62;

function truncateBullets(plan: SlideRenderPlan): SlideRenderPlan {
  const maxBullets =
    plan.layout === 'content-single-column' ? MAX_BULLETS_SINGLE_COL :
    plan.layout === 'content-two-column' ? MAX_BULLETS_TWO_COL :
    plan.layout === 'chart-right' ? MAX_BULLETS_CHART_RIGHT :
    plan.layout === 'agenda-list' ? MAX_BULLETS_AGENDA :
    plan.layout === 'tier-detail-split' ? MAX_BULLETS_TIER_SPLIT :
    plan.layout === 'adoption-path' ? MAX_BULLETS_ADOPTION :
    plan.layout === 'matrix-2x2' ? MAX_BULLETS_MATRIX :
    plan.layout === 'decision-tree' ? MAX_BULLETS_DECISION_TREE :
    plan.layout === 'card-grid' ? MAX_BULLETS_CARD_GRID :
    plan.layout === 'criteria-table' ? MAX_BULLETS_CRITERIA_TABLE :
    plan.layout === 'comparison-table' ? MAX_BULLETS_COMPARISON_TABLE :
    plan.layout === 'conclusion-focus' || plan.layout === 'title-focus' || plan.layout === 'quote-callout' ? MAX_BULLETS_TWO_COL :
    MAX_BULLETS_DEFAULT;

  if (plan.bullets.length <= maxBullets) return plan;
  return { ...plan, bullets: plan.bullets.slice(0, maxBullets) };
}

function truncateKeyMessage(plan: SlideRenderPlan): SlideRenderPlan {
  if (!plan.keyMessage) return plan;
  const words = plan.keyMessage.split(' ');
  if (words.length <= MAX_KEY_MESSAGE_WORDS) return plan;
  return { ...plan, keyMessage: words.slice(0, MAX_KEY_MESSAGE_WORDS).join(' ') + '.' };
}

function cleanSentence(text: string): string {
  return text
    .replace(/(\.\.\.|…)+/g, '')
    .replace(/[,:;\-—]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#+\s/g, '');
}

function sanitizeBullets(plan: SlideRenderPlan): SlideRenderPlan {
  const cleaned = plan.bullets.map((bullet) => cleanSentence(stripMarkdown(bullet))).filter(Boolean);
  if (cleaned.every((b, i) => b === plan.bullets[i])) return plan;
  return { ...plan, bullets: cleaned };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function limitWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ');
}

function sanitizeCardGridContent(
  plan: SlideRenderPlan
): { plan: SlideRenderPlan; changed: boolean; tooDense: boolean } {
  if (!plan.cardItems || plan.cardItems.length === 0) {
    return { plan, changed: false, tooDense: false };
  }

  const cards = plan.cardItems.slice(0, 4);
  const perCardBulletLimit = cards.length === 4 ? 2 : 3;
  const perBulletWordLimit = cards.length === 4 ? 8 : 10;

  const sanitized = cards
    .map((card) => {
      const title = limitWords(cleanSentence(card.title), 6);
      const badge = cleanSentence(card.badge ?? '');
      const bullets = card.bullets
        .map((bullet) => limitWords(cleanSentence(stripMarkdown(bullet)), perBulletWordLimit))
        .filter(Boolean)
        .slice(0, perCardBulletLimit);
      if (!title || bullets.length === 0) return undefined;
      return {
        ...(badge ? { badge } : {}),
        title,
        bullets,
      };
    })
    .filter((card): card is NonNullable<typeof card> => Boolean(card));

  if (sanitized.length === 0) {
    return {
      changed: true,
      tooDense: false,
      plan: {
        ...plan,
        cardItems: undefined,
      },
    };
  }

  const totalWords = sanitized.reduce((sum, card) => {
    const bulletWords = card.bullets.reduce((acc, bullet) => acc + wordCount(bullet), 0);
    return sum + wordCount(card.title) + bulletWords;
  }, 0);
  const tooDense = sanitized.length === 4 && totalWords > MAX_CARD_GRID_TOTAL_WORDS;

  const changed =
    sanitized.length !== plan.cardItems.length ||
    sanitized.some((card, idx) => {
      const prev = plan.cardItems?.[idx];
      if (!prev) return true;
      if ((prev.badge ?? '') !== (card.badge ?? '')) return true;
      if (prev.title !== card.title) return true;
      if (prev.bullets.length !== card.bullets.length) return true;
      return prev.bullets.some((bullet, bulletIdx) => bullet !== card.bullets[bulletIdx]);
    });

  return {
    changed,
    tooDense,
    plan: {
      ...plan,
      cardItems: sanitized,
    },
  };
}

function applyCardGridFallback(
  plan: SlideRenderPlan,
  tooDense: boolean
): { plan: SlideRenderPlan; changed: boolean } {
  if (plan.layout !== 'card-grid') return { plan, changed: false };
  if (!plan.cardItems || plan.cardItems.length < 2 || tooDense) {
    const fallbackLayout = plan.bullets.length >= 4 ? 'content-two-column' : 'content-single-column';
    return {
      changed: true,
      plan: {
        ...plan,
        layout: fallbackLayout,
      },
    };
  }
  return { plan, changed: false };
}

function applyLegibilityFallback(plan: SlideRenderPlan): { plan: SlideRenderPlan; changed: boolean } {
  if (plan.layout !== 'chart-right') return { plan, changed: false };

  const totalChars = plan.bullets.reduce((sum, bullet) => sum + bullet.length, 0);
  const hasVerboseBullets = plan.bullets.some(
    (bullet) =>
      bullet.length > MAX_CHARS_PER_BULLET_CHART_RIGHT || wordCount(bullet) > MAX_WORDS_CHART_RIGHT
  );

  if (!hasVerboseBullets && totalChars <= MAX_CHARS_CHART_RIGHT_TOTAL) {
    return { plan, changed: false };
  }

  const fallbackLayout = plan.bullets.length >= 4 ? 'content-two-column' : 'content-single-column';
  return {
    changed: true,
    plan: {
      ...plan,
      layout: fallbackLayout,
      chart: undefined,
      plot: undefined,
      image: undefined,
      visualKind: plan.visualKind === 'plot' ? 'none' : plan.visualKind,
    },
  };
}

export function renderQaNode(
  state: SlideRenderPipelineState
): Partial<SlideRenderPipelineState> {
  const issues: string[] = [...state.qaIssues];

  const fixedPlan = state.renderPlan.map((plan) => {
    let fixed = plan;
    const label = `Slide ${plan.index} (${plan.slideType})`;

    const prevBulletCount = fixed.bullets.length;
    fixed = truncateBullets(fixed);
    if (fixed.bullets.length < prevBulletCount) {
      issues.push(`${label}: truncated bullets ${prevBulletCount}→${fixed.bullets.length} for layout "${fixed.layout}"`);
    }

    const prevKm = fixed.keyMessage;
    fixed = truncateKeyMessage(fixed);
    if (fixed.keyMessage !== prevKm) {
      issues.push(`${label}: keyMessage truncated to ${MAX_KEY_MESSAGE_WORDS} words`);
    }

    const prevBullets = fixed.bullets.slice();
    fixed = sanitizeBullets(fixed);
    if (fixed.bullets.some((b, i) => b !== prevBullets[i])) {
      issues.push(`${label}: normalized bullet formatting artifacts`);
    }

    const cleanedKeyMessage = cleanSentence(stripMarkdown(fixed.keyMessage));
    if (cleanedKeyMessage !== fixed.keyMessage) {
      fixed = { ...fixed, keyMessage: cleanedKeyMessage };
      issues.push(`${label}: cleaned keyMessage formatting artifacts`);
    }

    const legibility = applyLegibilityFallback(fixed);
    fixed = legibility.plan;
    if (legibility.changed) {
      issues.push(`${label}: switched from chart-right to ${fixed.layout} for readability`);
    }

    const cardCleanup = sanitizeCardGridContent(fixed);
    fixed = cardCleanup.plan;
    if (cardCleanup.changed) {
      issues.push(`${label}: normalized card-grid content density`);
    }

    const cardFallback = applyCardGridFallback(fixed, cardCleanup.tooDense);
    fixed = cardFallback.plan;
    if (cardFallback.changed) {
      issues.push(`${label}: switched from card-grid to ${fixed.layout} for readability`);
    }

    return fixed;
  });

  return { renderPlan: fixedPlan, qaIssues: issues };
}
