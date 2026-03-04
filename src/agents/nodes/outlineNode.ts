import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function outlineNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { mainTopic, keyThemes, summary, config } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a presentation architect. Create exactly ${config.slideCount} slide titles ` +
      `for a ${config.tone.toLowerCase()} presentation. Slide 1 is always the title/intro slide. ` +
      `Respond in ${config.language}. ` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string }] }`
    ),
    new HumanMessage(
      `Topic: ${mainTopic}\nSummary: ${summary}\nKey themes: ${keyThemes.join(', ')}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  return { slideTitles: parsed.slides };
}
