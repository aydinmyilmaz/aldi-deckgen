import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import { v4 as uuidv4 } from 'uuid';
import type { PipelineState } from '../state';
import type { SlideOutline } from '@/types';

export async function slideWriterNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { slideTitles, documentText, config } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a slide content writer. For each slide title, write 3-5 concise bullet points. ` +
      `Tone: ${config.tone}. Language: ${config.language}. Use facts from the document where relevant. ` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string, "bullets": string[] }] }`
    ),
    new HumanMessage(
      `Slide titles: ${JSON.stringify(slideTitles)}\n\nSource document excerpt:\n${documentText.slice(0, 6000)}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  const slides: SlideOutline[] = (
    parsed.slides as Array<{ index: number; title: string; bullets: string[] }>
  ).map((s) => ({ ...s, id: uuidv4() }));

  return { slides };
}
