import { presentationGraph } from './graph';
import type { PresentationConfig, SlideOutline } from '@/types';

export async function runGenerationPipeline(
  documentText: string,
  config: PresentationConfig
): Promise<SlideOutline[]> {
  const result = await presentationGraph.invoke({ documentText, config });
  return result.slides;
}
