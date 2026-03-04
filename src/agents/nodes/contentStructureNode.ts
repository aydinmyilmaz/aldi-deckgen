import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function contentStructureNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { documentText, config, styleDna } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a senior content strategist. ` +
      `Analyze a document and extract the core content needed for a presentation. ` +
      `The presentation is for: ${config.audience || 'a general audience'}. ` +
      `Its purpose is to ${config.purpose}: make every extracted point serve that goal. ` +
      `\n\nStyle DNA of the source document (match this communication style in all output):\n${styleDna}` +
      `\n\nRespond in ${config.language}. ` +
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
