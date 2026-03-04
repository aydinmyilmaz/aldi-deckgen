import { StateGraph } from '@langchain/langgraph';
import { GraphState } from './state';
import { documentExtractionNode } from './nodes/documentExtractionNode';
import { styleDnaNode as extractStyleDnaNode } from './nodes/styleDnaNode';
import { contentStructureNode } from './nodes/contentStructureNode';
import { outlineNode } from './nodes/outlineNode';
import { slideWriterNode } from './nodes/slideWriterNode';
import type { PipelineState } from './state';

function routeEntry(state: PipelineState): string {
  return state.config.useLlmExtraction ? 'documentExtraction' : 'extractStyleDna';
}

const workflow = new StateGraph(GraphState)
  .addNode('documentExtraction', documentExtractionNode)
  .addNode('extractStyleDna', extractStyleDnaNode)
  .addNode('contentStructure', contentStructureNode)
  .addNode('outline', outlineNode)
  .addNode('slideWriter', slideWriterNode)
  .addConditionalEdges('__start__', routeEntry, {
    documentExtraction: 'documentExtraction',
    extractStyleDna: 'extractStyleDna',
  })
  .addEdge('documentExtraction', 'extractStyleDna')
  .addEdge('extractStyleDna', 'contentStructure')
  .addEdge('contentStructure', 'outline')
  .addEdge('outline', 'slideWriter')
  .addEdge('slideWriter', '__end__');

export const presentationGraph = workflow.compile();
