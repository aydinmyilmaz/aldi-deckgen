import { attachChartsToPlan } from '@/slide-renderer/planning';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';

export function chartPlannerNode(
  state: SlideRenderPipelineState
): Partial<SlideRenderPipelineState> {
  const renderPlan = attachChartsToPlan(state.slides, state.renderPlan);
  return { renderPlan };
}
