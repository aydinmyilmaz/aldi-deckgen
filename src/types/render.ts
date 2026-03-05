import type { ImageIntent, PresentationConfig, SlideOutline, SlideType } from '@/types';

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
}

export type RenderLayoutKind =
  | 'title-focus'
  | 'content-single-column'
  | 'content-two-column'
  | 'chart-right'
  | 'conclusion-focus'
  | 'agenda-list'
  | 'quote-callout'
  | 'stats-highlight'
  | 'card-grid'
  | 'comparison-table';

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

export interface SlideRenderPlan {
  slideId: string;
  index: number;
  slideType: SlideType;
  layout: RenderLayoutKind;
  bullets: string[];
  keyMessage: string;
  speakerNotes: string;
  visualSuggestion: string;
  imageIntent: ImageIntent;
  imageQuery?: string;
  selectedImageUrl?: string;
  selectedImageAlt?: string;
  selectedImageAttributionLine?: string;
  chart?: SlideChartSpec;
  statCards?: { value: string; label: string; context?: string }[];
  cardItems?: { badge?: string; title: string; bullets: string[] }[];
  tableData?: { headers: string[]; rows: string[][] };
  image?: SlideImageAsset;
}

export interface SlideRenderRequest {
  slides: SlideOutline[];
  config: PresentationConfig;
  templateId: DeckTemplateId;
  fileName?: string;
}

export interface SlideRenderResult {
  fileName: string;
  mimeType: string;
  base64: string;
}
