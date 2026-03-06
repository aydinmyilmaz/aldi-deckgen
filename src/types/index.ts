export type Tone = 'Standard' | 'Professional' | 'Casual' | 'Academic';
export type Language = 'English' | 'Turkish' | 'Spanish' | 'French' | 'German';
export type Purpose = 'inform' | 'align' | 'decide' | 'sell';
export type ImageIntent = 'none' | 'optional' | 'required';
export type DesignMode = 'general' | 'blueprint' | 'hybrid';
export type QualityGate = 'fast' | 'balanced' | 'strict';
export type TopicPaletteMode = 'auto' | 'fixed';
export type BlueprintId = 'automation-decision-framework-13';
export type LayoutHint =
  | 'title-focus'
  | 'content-single-column'
  | 'content-two-column'
  | 'chart-right'
  | 'conclusion-focus'
  | 'agenda-list'
  | 'quote-callout'
  | 'stats-highlight'
  | 'card-grid'
  | 'comparison-table'
  | 'decision-tree'
  | 'criteria-table'
  | 'matrix-2x2'
  | 'tier-detail-split'
  | 'adoption-path';

export type SlideVisualKind = 'none' | 'plot' | 'image' | 'table' | 'cards';
export type PlotKind = 'bar' | 'line' | 'scatter';

export interface SlidePlotSpec {
  kind: PlotKind;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  labels: string[];
  values: number[];
}

export interface TopicDesignProfile {
  motif: string;
  palette: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    accentSoft: string;
    divider: string;
  };
}

export type SlideType =
  | 'title'          // Slide 1: title, author, org, date
  | 'agenda'         // Table of contents
  | 'background'     // Context / why it matters
  | 'problem'        // Problem statement + evidence
  | 'objectives'     // Goals / what to achieve
  | 'method'         // Approach / methodology
  | 'findings'       // Data, analysis, insights
  | 'solution'       // Proposed solution / recommendation
  | 'implementation' // Steps, timeline, resources
  | 'benefits'       // Expected outcomes, ROI
  | 'conclusion'     // Key takeaways, final message
  | 'qna'            // Q&A slide
  | 'references'     // Citations / sources
  | 'content';       // Generic content slide

export interface PresentationConfig {
  tone: Tone;
  slideCount: number;
  language: Language;
  userPrompt: string;
  audience: string;
  purpose: Purpose;
  useLlmExtraction: boolean; // NEW
  useRelatedImages: boolean; // NEW
  designMode: DesignMode;
  blueprintId?: BlueprintId;
  qualityGate: QualityGate;
  topicPalette: TopicPaletteMode;
  topicDesignProfile?: TopicDesignProfile;
}

export interface ExtractedSlideContent {
  slideIndex: number;
  topic: string;
  content: string;
}

export interface StatCard { value: string; label: string; context?: string; }
export interface CardItem { badge?: string; title: string; bullets: string[]; }
export interface TableData { headers: string[]; rows: string[][]; }

export interface SlideOutline {
  id: string;
  index: number;
  title: string;
  slideType: SlideType;
  bullets: string[];
  keyMessage?: string;
  speakerNotes?: string;
  visualSuggestion?: string;
  layoutHint?: LayoutHint;
  visualKind?: SlideVisualKind;
  plotSpec?: SlidePlotSpec;
  imageIntent?: ImageIntent;
  imageQuery?: string;
  imageUrl?: string;
  imageThumbUrl?: string;
  imageAlt?: string;
  imagePhotographer?: string;
  imagePhotographerUrl?: string;
  imagePexelsUrl?: string;
  imageAttributionLine?: string;
  statCards?: StatCard[];
  cardItems?: CardItem[];
  tableData?: TableData;
}

export interface GenerateRequest {
  config: PresentationConfig;
  documentText: string;
}

export interface GenerateResponse {
  slides: SlideOutline[];
  error?: string;
}
