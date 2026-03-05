import { buildPresentationBase64 } from '@/slide-renderer/pptxBuilder';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export async function deckComposerNode(
  state: SlideRenderPipelineState
): Promise<Partial<SlideRenderPipelineState>> {
  const { base64, fileName } = await buildPresentationBase64(
    state.slides,
    state.renderPlan,
    state.template,
    state.fileName
  );

  return {
    result: {
      fileName,
      mimeType: PPTX_MIME,
      base64,
    },
  };
}
