import { getDeckTemplateById, getDefaultDeckTemplate } from '@/slide-renderer/templates';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';

export function templateResolverNode(
  state: SlideRenderPipelineState
): Partial<SlideRenderPipelineState> {
  const template = getDeckTemplateById(state.templateId) ?? getDefaultDeckTemplate();
  return { template };
}
