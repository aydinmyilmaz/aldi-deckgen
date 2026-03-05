import { slideRenderGraph } from '@/slide-renderer/graph';
import { listDeckTemplates } from '@/slide-renderer/templates';
import type { DeckTemplate, SlideRenderRequest, SlideRenderResult } from '@/types/render';

export type SlideRenderPipelineEvent =
  | { type: 'stage'; node: string }
  | { type: 'done'; result: SlideRenderResult }
  | { type: 'error'; message: string };

export async function* streamSlideRenderPipeline(
  request: SlideRenderRequest
): AsyncGenerator<SlideRenderPipelineEvent> {
  let result: SlideRenderResult | null = null;

  const stream = await slideRenderGraph.stream(request, { streamMode: 'updates' });
  for await (const chunk of stream) {
    const node = Object.keys(chunk)[0];
    yield { type: 'stage', node };
    const nodeState = chunk[node as keyof typeof chunk] as { result?: SlideRenderResult } | undefined;
    if (nodeState?.result) result = nodeState.result;
  }

  if (!result) {
    throw new Error('Render pipeline did not produce output');
  }

  yield { type: 'done', result };
}

export async function runSlideRenderPipeline(
  request: SlideRenderRequest
): Promise<SlideRenderResult> {
  const state = await slideRenderGraph.invoke(request);
  if (!state.result?.base64) {
    throw new Error('Render pipeline returned empty result');
  }
  return state.result;
}

export function getTemplateLibrary(): DeckTemplate[] {
  return listDeckTemplates();
}
