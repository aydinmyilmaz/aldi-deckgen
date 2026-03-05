import type { SlideRenderPipelineState } from '@/slide-renderer/state';
import type { SlideRenderPlan } from '@/types/render';

const MAX_BULLETS_SINGLE_COL = 6;
const MAX_BULLETS_TWO_COL = 10;
const MAX_BULLETS_CHART_RIGHT = 5;
const MAX_BULLETS_AGENDA = 8;
const MAX_BULLETS_DEFAULT = 4;
const MAX_KEY_MESSAGE_WORDS = 18;

function truncateBullets(plan: SlideRenderPlan): SlideRenderPlan {
  const maxBullets =
    plan.layout === 'content-single-column' ? MAX_BULLETS_SINGLE_COL :
    plan.layout === 'content-two-column' ? MAX_BULLETS_TWO_COL :
    plan.layout === 'chart-right' ? MAX_BULLETS_CHART_RIGHT :
    plan.layout === 'agenda-list' ? MAX_BULLETS_AGENDA :
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

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#+\s/g, '');
}

function sanitizeBullets(plan: SlideRenderPlan): SlideRenderPlan {
  const cleaned = plan.bullets.map(stripMarkdown);
  if (cleaned.every((b, i) => b === plan.bullets[i])) return plan;
  return { ...plan, bullets: cleaned };
}

export function renderQaNode(
  state: SlideRenderPipelineState
): Partial<SlideRenderPipelineState> {
  const issues: string[] = [];

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
      issues.push(`${label}: stripped markdown from bullets`);
    }

    return fixed;
  });

  return { renderPlan: fixedPlan, qaIssues: issues };
}
