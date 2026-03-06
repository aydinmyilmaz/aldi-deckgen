import type {
  BlueprintId,
  CardItem,
  ImageIntent,
  LayoutHint,
  PlotKind,
  PresentationConfig,
  SlideOutline,
  SlidePlotSpec,
  SlideType,
  SlideVisualKind,
  StatCard,
  TableData,
} from '@/types';

export type DeckTemplateId =
  | 'reveal-black'
  | 'reveal-white'
  | 'reveal-league'
  | 'reveal-sky'
  | 'reveal-solarized'
  | 'reveal-dracula'
  | 'reveal-blood'
  | 'reveal-beige'
  | 'reveal-moon';

export type DeckBackgroundStyle =
  | 'solid-clean'
  | 'cool-gradient'
  | 'dark-radial'
  | 'warm-paper'
  | 'neon-glow';

export interface DeckTemplate {
  id: DeckTemplateId;
  name: string;
  description: string;
  backgroundStyle: DeckBackgroundStyle;
  source: {
    project: string;
    themeName: string;
    url: string;
    license: string;
  };
  palette: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    accentSoft: string;
    divider: string;
  };
  typography: {
    titleFont: string;
    bodyFont: string;
    monoFont: string;
  };
  renderProfile?: {
    topBar: 'solid' | 'none';
    showSlideIndex: boolean;
    motifStyle: 'minimal' | 'geometric';
  };
}

export type RenderLayoutKind = LayoutHint;

export type ChartKind = 'bar' | 'pie' | 'line';

export interface SlideChartSpec {
  kind: ChartKind;
  title: string;
  seriesName: string;
  labels: string[];
  values: number[];
}

export interface SlideImageAsset {
  query: string;
  dataUri: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  attributionLine: string;
}

export interface RenderPlotAsset {
  kind: PlotKind;
  dataUri: string;
  code: string;
}

export interface SlideRenderPlan {
  slideId: string;
  index: number;
  slideType: SlideType;
  layout: RenderLayoutKind;
  bullets: string[];
  keyMessage: string;
  speakerNotes: string;
  visualSuggestion: string;
  layoutHint?: LayoutHint;
  visualKind?: SlideVisualKind;
  plotSpec?: SlidePlotSpec;
  imageIntent: ImageIntent;
  imageQuery?: string;
  selectedImageUrl?: string;
  selectedImageAlt?: string;
  selectedImageAttributionLine?: string;
  chart?: SlideChartSpec;
  plot?: RenderPlotAsset;
  statCards?: StatCard[];
  cardItems?: CardItem[];
  tableData?: TableData;
  image?: SlideImageAsset;
}

export interface SlideRenderRequest {
  slides: SlideOutline[];
  config: PresentationConfig;
  templateId: DeckTemplateId;
  fileName?: string;
  blueprintId?: BlueprintId;
}

export interface SlideRenderResult {
  fileName: string;
  mimeType: string;
  base64: string;
  qaReport?: {
    passed: boolean;
    issues: string[];
    artifactDir?: string;
    scoredSlides?: number;
  };
  artifacts?: {
    pdfPath?: string;
    imageDir?: string;
  };
}
