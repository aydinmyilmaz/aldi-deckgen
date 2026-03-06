import { StateGraph } from '@langchain/langgraph';
import { GraphState } from './state';
import { documentExtractionNode } from './nodes/documentExtractionNode';
import { styleDnaNode as extractStyleDnaNode } from './nodes/styleDnaNode';
import { contentStructureNode } from './nodes/contentStructureNode';
import { blueprintRouterNode } from './nodes/blueprintRouterNode';
import { topicDesignNode } from './nodes/topicDesignNode';
import { outlineNode } from './nodes/outlineNode';
import { slideWriterNode } from './nodes/slideWriterNode';
import { structuredDataNode } from './nodes/structuredDataNode';
import { imageQueryPlannerNode } from './nodes/imageQueryPlannerNode';
import { contentReviewerNode } from './nodes/contentReviewerNode';
import type { PipelineState } from './state';

function routeEntry(state: PipelineState): string {
  return state.config.useLlmExtraction ? 'documentExtraction' : 'extractStyleDna';
}

function routeAfterReview(state: PipelineState): string {
  return state.reviewFeedback ? 'slideWriter' : 'imageQueryPlanner';
}

const workflow = new StateGraph(GraphState)
  .addNode('documentExtraction', documentExtractionNode)
  .addNode('extractStyleDna', extractStyleDnaNode)
  .addNode('contentStructure', contentStructureNode)
  .addNode('blueprintRouter', blueprintRouterNode)
  .addNode('topicDesign', topicDesignNode)
  .addNode('outline', outlineNode)
  .addNode('slideWriter', slideWriterNode)
  .addNode('structuredData', structuredDataNode)
  .addNode('imageQueryPlanner', imageQueryPlannerNode)
  .addNode('contentReviewer', contentReviewerNode)
  .addConditionalEdges('__start__', routeEntry, {
    documentExtraction: 'documentExtraction',
    extractStyleDna: 'extractStyleDna',
  })
  .addEdge('documentExtraction', 'extractStyleDna')
  .addEdge('extractStyleDna', 'contentStructure')
  .addEdge('contentStructure', 'blueprintRouter')
  .addEdge('blueprintRouter', 'topicDesign')
  .addEdge('topicDesign', 'outline')
  .addEdge('outline', 'slideWriter')
  .addEdge('slideWriter', 'structuredData')
  .addEdge('structuredData', 'contentReviewer')
  .addConditionalEdges('contentReviewer', routeAfterReview, {
    slideWriter: 'slideWriter',
    imageQueryPlanner: 'imageQueryPlanner',
  });
workflow.addEdge('imageQueryPlanner', '__end__');

export const presentationGraph = workflow.compile();
