export type Tone = 'Standard' | 'Professional' | 'Casual' | 'Academic';
export type Language = 'English' | 'Turkish' | 'Spanish' | 'French' | 'German';

export interface PresentationConfig {
  tone: Tone;
  slideCount: number;
  language: Language;
  userPrompt: string;
}

export interface SlideOutline {
  id: string;
  index: number;
  title: string;
  bullets: string[];
}

export interface GenerateRequest {
  config: PresentationConfig;
  documentText: string; // extracted plain text from uploaded file
}

export interface GenerateResponse {
  slides: SlideOutline[];
  error?: string;
}
