import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function contentStructureNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { documentText, config } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a content analyst. Given document text and a user's presentation goal, ` +
      `extract the main topic, 3-7 key themes, and a 2-sentence summary. ` +
      `Respond in ${config.language}. ` +
      `Output ONLY valid JSON: { "mainTopic": string, "keyThemes": string[], "summary": string }`
    ),
    new HumanMessage(
      `User goal: ${config.userPrompt}\n\nDocument text:\n${documentText.slice(0, 8000)}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  return {
    mainTopic: parsed.mainTopic,
    keyThemes: parsed.keyThemes,
    summary: parsed.summary,
  };
}
