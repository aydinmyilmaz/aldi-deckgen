import { Annotation } from '@langchain/langgraph';
import type {
  ExtractedSlideContent,
  LayoutHint,
  PresentationConfig,
  SlideOutline,
  SlideType,
  SlideVisualKind,
  TopicDesignProfile,
} from '@/types';

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
  slideTitles: Annotation<Array<{
    index: number;
    title: string;
    slideType: SlideType;
    keyMessage: string;
    visualSuggestion: string;
    layoutHint?: LayoutHint;
    visualKind?: SlideVisualKind;
  }>>({
    reducer: (_, y) => y,
    default: () => [],
  }),

  topicDesignProfile: Annotation<TopicDesignProfile | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),

  // Agent 3 output — final result
  slides: Annotation<SlideOutline[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),

  // Content reviewer — feedback loop state
  reviewFeedback: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
  reviewAttempts: Annotation<number>({
    reducer: (_, y) => y,
    default: () => 0,
  }),
});

export type PipelineState = typeof GraphState.State;
