export type Tone = 'Standard' | 'Professional' | 'Casual' | 'Academic';
export type Language = 'English' | 'Turkish' | 'Spanish' | 'French' | 'German';
export type Purpose = 'inform' | 'align' | 'decide' | 'sell';

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
}

export interface ExtractedSlideContent {
  slideIndex: number;
  topic: string;
  content: string;
}

export interface SlideOutline {
  id: string;
  index: number;
  title: string;
  slideType: SlideType;
  bullets: string[];
  keyMessage?: string;
  speakerNotes?: string;
  visualSuggestion?: string;
}

export interface GenerateRequest {
  config: PresentationConfig;
  documentText: string;
}

export interface GenerateResponse {
  slides: SlideOutline[];
  error?: string;
}
