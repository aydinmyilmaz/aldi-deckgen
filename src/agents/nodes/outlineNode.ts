import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function outlineNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { mainTopic, keyThemes, summary, config, styleDna } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a presentation architect and storyteller. ` +
      `Design exactly ${config.slideCount} slides for a ${config.tone.toLowerCase()} deck. ` +
      `Audience: ${config.audience || 'general'}. Purpose: to ${config.purpose}. ` +
      `\n\nNarrative rule: follow the narrative pattern from the Style DNA below. ` +
      `Slide 1 is always the title/intro. The final slide must reinforce the purpose (${config.purpose}). ` +
      `\n\nStyle DNA:\n${styleDna}` +
      `\n\nRespond in ${config.language}. ` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string, "keyMessage": string, "visualSuggestion": string }] }`
    ),
    new HumanMessage(
      `Topic: ${mainTopic}\nSummary: ${summary}\nKey themes: ${keyThemes.join(', ')}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  // Store full blueprint in slideTitles (extended shape used by slideWriterNode)
  return { slideTitles: parsed.slides };
}
