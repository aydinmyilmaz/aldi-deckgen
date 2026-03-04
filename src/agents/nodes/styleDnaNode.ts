import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function styleDnaNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { documentText } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a presentation style analyst. Your job is to extract the "Style DNA" from a document — ` +
      `how the author communicates, not what they communicate. ` +
      `Analyze the text and produce a concise style guide. ` +
      `Output ONLY valid JSON with these exact keys:
{
  "toneAndWording": string,      // sentence length, formality, verb style, certainty level, use of qualifiers
  "narrativePattern": string,    // how the story flows (e.g. "context → insight → implication → action")
  "headlineStyle": string,       // how titles/headings are typically phrased (verb-first, noun phrase, question, etc.)
  "bulletStyle": string,         // short fragments vs full sentences, numbers vs words, level of detail
  "communicationRegister": string // executive-ready / academic / technical / conversational
}`
    ),
    new HumanMessage(
      `Document text (first 6000 chars):\n${documentText.slice(0, 6000)}`
    ),
  ]);

  return { styleDna: response.content as string };
}
