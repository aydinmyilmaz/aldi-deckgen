export type Tone = 'Standard' | 'Professional' | 'Casual' | 'Academic';
export type Language = 'English' | 'Turkish' | 'Spanish' | 'French' | 'German';
export type Purpose = 'inform' | 'align' | 'decide' | 'sell';

export interface PresentationConfig {
  tone: Tone;
  slideCount: number;
  language: Language;
  userPrompt: string;
  audience: string;
  purpose: Purpose;
}

export interface SlideOutline {
  id: string;
  index: number;
  title: string;
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
