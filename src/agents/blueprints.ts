import type { BlueprintId, LayoutHint, SlideType, SlideVisualKind } from '@/types';

export interface BlueprintSlideSeed {
  index: number;
  title: string;
  slideType: SlideType;
  keyMessage: string;
  visualSuggestion: string;
  layoutHint?: LayoutHint;
  visualKind?: SlideVisualKind;
}

const AUTOMATION_KEYWORDS = [
  /automation decision framework/i,
  /tier\s*1/i,
  /tier\s*2/i,
  /tier\s*3/i,
  /agentic/i,
  /deterministic/i,
  /ai-enhanced/i,
];

export function detectAutomationBlueprintIntent(text: string): boolean {
  return AUTOMATION_KEYWORDS.some((pattern) => pattern.test(text));
}

export function getBlueprintSlides(blueprintId: BlueprintId): BlueprintSlideSeed[] {
  if (blueprintId !== 'automation-decision-framework-13') return [];

  return [
    {
      index: 1,
      title: 'Automation Decision Framework',
      slideType: 'title',
      keyMessage: 'Pick the right automation tier for reliability, speed, and control.',
      visualSuggestion: 'Title slide with tier motif and governance signal.',
      layoutHint: 'title-focus',
      visualKind: 'none',
    },
    {
      index: 2,
      title: 'Why This Matters Now',
      slideType: 'findings',
      keyMessage: 'Adoption is high, but production-grade scaling still lags.',
      visualSuggestion: 'Evidence chart with three adoption and scale metrics.',
      layoutHint: 'chart-right',
      visualKind: 'plot',
    },
    {
      index: 3,
      title: 'Three Tiers At A Glance',
      slideType: 'content',
      keyMessage: 'Classical, AI-enhanced, and agentic tiers solve different problems.',
      visualSuggestion: 'Three-card tier overview with progression arrows.',
      layoutHint: 'card-grid',
      visualKind: 'cards',
    },
    {
      index: 4,
      title: 'Decision Tree For Tier Choice',
      slideType: 'method',
      keyMessage: 'Use deterministic gates before escalating autonomy.',
      visualSuggestion: 'Branching decision tree with yes/no gates.',
      layoutHint: 'decision-tree',
      visualKind: 'none',
    },
    {
      index: 5,
      title: 'Key Decision Criteria',
      slideType: 'objectives',
      keyMessage: 'Six questions quickly identify the right tier.',
      visualSuggestion: 'Criteria table with decision guidance.',
      layoutHint: 'criteria-table',
      visualKind: 'table',
    },
    {
      index: 6,
      title: 'Tier 1 Classical Automation',
      slideType: 'content',
      keyMessage: 'Choose Tier 1 for stable, structured, high-volume processes.',
      visualSuggestion: 'Split layout: choose-when on left, use-cases on right.',
      layoutHint: 'tier-detail-split',
      visualKind: 'cards',
    },
    {
      index: 7,
      title: 'Tier 2 AI-Enhanced Workflow',
      slideType: 'content',
      keyMessage: 'Choose Tier 2 when unstructured steps need bounded intelligence.',
      visualSuggestion: 'Split layout: choose-when on left, use-cases on right.',
      layoutHint: 'tier-detail-split',
      visualKind: 'cards',
    },
    {
      index: 8,
      title: 'Tier 3 Agentic AI',
      slideType: 'content',
      keyMessage: 'Choose Tier 3 only for dynamic planning with strong controls.',
      visualSuggestion: 'Split layout: choose-when on left, use-cases on right.',
      layoutHint: 'tier-detail-split',
      visualKind: 'cards',
    },
    {
      index: 9,
      title: 'Tier Comparison Across Dimensions',
      slideType: 'findings',
      keyMessage: 'Compare tiers across precision, complexity, control, and risk.',
      visualSuggestion: 'Comparison table across key operating dimensions.',
      layoutHint: 'comparison-table',
      visualKind: 'table',
    },
    {
      index: 10,
      title: 'Complexity Versus Precision',
      slideType: 'findings',
      keyMessage: 'Different tier patterns land in distinct operating quadrants.',
      visualSuggestion: '2x2 matrix mapping tier patterns by complexity and precision.',
      layoutHint: 'matrix-2x2',
      visualKind: 'none',
    },
    {
      index: 11,
      title: 'Governance Must Scale With Autonomy',
      slideType: 'implementation',
      keyMessage: 'Higher autonomy demands stronger runtime governance controls.',
      visualSuggestion: 'Tiered governance requirements with control stack.',
      layoutHint: 'content-two-column',
      visualKind: 'cards',
    },
    {
      index: 12,
      title: 'Adoption Path To Tiered Maturity',
      slideType: 'implementation',
      keyMessage: 'Move in stages from deterministic baseline to selective agentic use.',
      visualSuggestion: 'Four-stage adoption roadmap from pilot to scale.',
      layoutHint: 'adoption-path',
      visualKind: 'none',
    },
    {
      index: 13,
      title: 'Key Takeaways',
      slideType: 'conclusion',
      keyMessage: 'Default deterministic, escalate intentionally, govern continuously.',
      visualSuggestion: 'Summary callout with five strategic takeaways.',
      layoutHint: 'conclusion-focus',
      visualKind: 'none',
    },
  ];
}

