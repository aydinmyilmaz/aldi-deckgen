import { presentationGraph } from './graph';
import type { PresentationConfig, SlideOutline } from '@/types';
import { normalizePresentationConfig } from '@/lib/config';

export type PipelineEvent =
  | { type: 'stage'; node: string }
  | { type: 'done'; slides: SlideOutline[] }
  | { type: 'error'; message: string };

export async function* streamGenerationPipeline(
  documentText: string,
  config: PresentationConfig
): AsyncGenerator<PipelineEvent> {
  const normalizedConfig = normalizePresentationConfig(config);
  let slides: SlideOutline[] = [];

  const stream = await presentationGraph.stream(
    { documentText, config: normalizedConfig },
    { streamMode: 'updates' }
  );

  for await (const chunk of stream) {
    const node = Object.keys(chunk)[0];
    yield { type: 'stage', node };
    const nodeState = chunk[node as keyof typeof chunk] as { slides?: SlideOutline[] } | undefined;
    if (nodeState?.slides) {
      slides = nodeState.slides;
    }
  }

  yield { type: 'done', slides };
}

export async function runGenerationPipeline(
  documentText: string,
  config: PresentationConfig
): Promise<SlideOutline[]> {
  const result = await presentationGraph.invoke({
    documentText,
    config: normalizePresentationConfig(config),
  });
  return result.slides;
}
