import { Annotation } from '@langchain/langgraph';
import type { PresentationConfig, SlideOutline } from '@/types';
import type {
  DeckTemplate,
  DeckTemplateId,
  SlideRenderPlan,
  SlideRenderResult,
} from '@/types/render';

const EMPTY_TEMPLATE: DeckTemplate = {
  id: 'reveal-black',
  name: '',
  description: '',
  backgroundStyle: 'solid-clean',
  source: { project: '', themeName: '', url: '', license: '' },
  palette: {
    background: '',
    surface: '',
    text: '',
    mutedText: '',
    accent: '',
    accentSoft: '',
    divider: '',
  },
  typography: {
    titleFont: '',
    bodyFont: '',
    monoFont: '',
  },
};

const EMPTY_RESULT: SlideRenderResult = {
  fileName: '',
  mimeType: '',
  base64: '',
};

export const SlideRenderState = Annotation.Root({
  slides: Annotation<SlideOutline[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  config: Annotation<PresentationConfig>({
    reducer: (_, y) => y,
    default: () => ({} as PresentationConfig),
  }),
  templateId: Annotation<DeckTemplateId>({
    reducer: (_, y) => y,
    default: () => 'reveal-black',
  }),
  fileName: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
  template: Annotation<DeckTemplate>({
    reducer: (_, y) => y,
    default: () => EMPTY_TEMPLATE,
  }),
  renderPlan: Annotation<SlideRenderPlan[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  result: Annotation<SlideRenderResult>({
    reducer: (_, y) => y,
    default: () => EMPTY_RESULT,
  }),
});

export type SlideRenderPipelineState = typeof SlideRenderState.State;
