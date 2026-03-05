import { buildBaseRenderPlan } from '@/slide-renderer/planning';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';

export function layoutPlannerNode(
  state: SlideRenderPipelineState
): Partial<SlideRenderPipelineState> {
  const renderPlan = buildBaseRenderPlan(state.slides);
  return { renderPlan };
}
