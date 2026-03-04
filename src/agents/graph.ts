import { StateGraph } from '@langchain/langgraph';
import { GraphState } from './state';
import { styleDnaNode } from './nodes/styleDnaNode';
import { contentStructureNode } from './nodes/contentStructureNode';
import { outlineNode } from './nodes/outlineNode';
import { slideWriterNode } from './nodes/slideWriterNode';

const workflow = new StateGraph(GraphState)
  .addNode('styleDna', styleDnaNode)
  .addNode('contentStructure', contentStructureNode)
  .addNode('outline', outlineNode)
  .addNode('slideWriter', slideWriterNode)
  .addEdge('__start__', 'styleDna')
  .addEdge('styleDna', 'contentStructure')
  .addEdge('contentStructure', 'outline')
  .addEdge('outline', 'slideWriter')
  .addEdge('slideWriter', '__end__');

export const presentationGraph = workflow.compile();
