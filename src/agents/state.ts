import { Annotation } from '@langchain/langgraph';
import type { PresentationConfig, SlideOutline, ExtractedSlideContent } from '@/types';

export const GraphState = Annotation.Root({
  // Inputs — set once before graph runs
  documentText: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
  config: Annotation<PresentationConfig>({
    reducer: (_, y) => y,
    default: () => ({} as PresentationConfig),
  }),

  // styleDnaNode output — stored as JSON string, passed to all downstream nodes
  styleDna: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),

  // documentExtractionNode output (only populated when config.useLlmExtraction = true)
  extractedSlideContent: Annotation<ExtractedSlideContent[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),

  // Agent 1 output
  mainTopic: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
  keyThemes: Annotation<string[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),

  // Agent 2 output
  slideTitles: Annotation<Array<{ index: number; title: string }>>({
    reducer: (_, y) => y,
    default: () => [],
  }),

  // Agent 3 output — final result
  slides: Annotation<SlideOutline[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
});

export type PipelineState = typeof GraphState.State;
