import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runGenerationPipeline } from '@/agents';
import { slideRenderGraph } from '@/slide-renderer/graph';
import type { LayoutHint, PresentationConfig } from '@/types';

type Suite = {
  name: string;
  documentText: string;
  config: PresentationConfig;
  requiredLayouts?: LayoutHint[];
};

const OUT_DIR = '/tmp/ppt-acceptance';

const BASE_CONFIG: Omit<PresentationConfig, 'slideCount' | 'userPrompt'> = {
  tone: 'Professional',
  language: 'English',
  audience: 'Executive leadership',
  purpose: 'decide',
  useLlmExtraction: false,
  useRelatedImages: false,
  designMode: 'hybrid',
  qualityGate: 'balanced',
  topicPalette: 'auto',
};

const suites: Suite[] = [
  {
    name: 'suite-5',
    documentText:
      'Automation should default to deterministic workflows, escalate to AI-enhanced for unstructured bottlenecks, and reserve agentic systems for dynamic planning with governance controls.',
    config: {
      ...BASE_CONFIG,
      slideCount: 5,
      userPrompt: 'Build a concise 5-slide automation decision briefing.',
    },
  },
  {
    name: 'suite-13',
    documentText:
      'Automation Decision Framework across three tiers. Include adoption evidence, decision tree, decision criteria, tier deep dives, comparison dimensions, 2x2 complexity versus precision, governance model, and phased adoption path.',
    config: {
      ...BASE_CONFIG,
      slideCount: 13,
      userPrompt:
        'Create a 13-slide automation decision framework with tier-based guidance and governance.',
      designMode: 'blueprint',
      blueprintId: 'automation-decision-framework-13',
    },
    requiredLayouts: [
      'decision-tree',
      'criteria-table',
      'matrix-2x2',
      'tier-detail-split',
      'adoption-path',
      'comparison-table',
    ],
  },
];

async function runSuite(suite: Suite): Promise<void> {
  const dir = path.join(OUT_DIR, suite.name);
  mkdirSync(dir, { recursive: true });

  const slides = await runGenerationPipeline(suite.documentText, suite.config);
  writeFileSync(path.join(dir, 'slides.json'), JSON.stringify(slides, null, 2));

  const state = await slideRenderGraph.invoke({
    slides,
    config: suite.config,
    templateId: 'reveal-beige',
    fileName: `${suite.name}.pptx`,
  });

  writeFileSync(path.join(dir, 'render-state.json'), JSON.stringify(state, null, 2));

  const qa = state.result?.qaReport;
  if (!qa) throw new Error(`${suite.name}: missing qaReport`);
  if (!qa.passed) {
    throw new Error(`${suite.name}: qa failed -> ${qa.issues.join(' | ')}`);
  }

  if (suite.requiredLayouts?.length) {
    const layouts = new Set((state.renderPlan ?? []).map((item) => item.layout));
    const missing = suite.requiredLayouts.filter((layout) => !layouts.has(layout));
    if (missing.length > 0) {
      throw new Error(`${suite.name}: missing required layouts: ${missing.join(', ')}`);
    }
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const suite of suites) {
    await runSuite(suite);
  }
  console.log(JSON.stringify({ ok: true, outDir: OUT_DIR }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
