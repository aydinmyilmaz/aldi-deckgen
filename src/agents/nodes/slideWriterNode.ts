import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import { v4 as uuidv4 } from 'uuid';
import type { PipelineState } from '../state';
import type { SlideOutline } from '@/types';

export async function slideWriterNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { slideTitles, documentText, config, styleDna } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are an executive presentation writer. ` +
      `Write the final slide content — crisp, non-academic, no filler. ` +
      `Audience: ${config.audience || 'general'}. Purpose: to ${config.purpose}. Tone: ${config.tone}. Language: ${config.language}. ` +
      `\n\nCritical: match the wording conventions from the Style DNA below exactly — ` +
      `same headline style, bullet style, sentence length, and register. ` +
      `\n\nStyle DNA:\n${styleDna}` +
      `\n\nFor each slide produce:
- bullets: 3-5 concise bullet points using the source document facts
- speakerNotes: 1-2 sentences for the presenter (what to say, not what's on the slide)
` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string, "keyMessage": string, "bullets": string[], "speakerNotes": string, "visualSuggestion": string }] }`
    ),
    new HumanMessage(
      `Slide blueprint: ${JSON.stringify(slideTitles)}\n\nSource document excerpt:\n${documentText.slice(0, 6000)}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  const slides: SlideOutline[] = (
    parsed.slides as Array<{
      index: number;
      title: string;
      keyMessage: string;
      bullets: string[];
      speakerNotes: string;
      visualSuggestion: string;
    }>
  ).map((s) => ({ ...s, id: uuidv4() }));

  return { slides };
}
