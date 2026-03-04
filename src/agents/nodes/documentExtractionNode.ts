import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function documentExtractionNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { documentText, config } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a document content organizer. ` +
      `Read this document and divide its content into exactly ${config.slideCount} sections — one per slide. ` +
      `For each section provide: the slide index (1-based), a short topic label (3-6 words), ` +
      `and the verbatim key facts from the document that belong on that slide. ` +
      `Do NOT summarize or rewrite — extract and group the actual document content. ` +
      `Respond in ${config.language}. ` +
      `Output ONLY valid JSON: { "slides": [{ "slideIndex": number, "topic": string, "content": string }] }`
    ),
    new HumanMessage(
      `Document text:\n${documentText.slice(0, 10000)}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  return { extractedSlideContent: parsed.slides };
}
