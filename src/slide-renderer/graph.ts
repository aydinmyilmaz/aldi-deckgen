import { StateGraph } from '@langchain/langgraph';
import { SlideRenderState } from '@/slide-renderer/state';
import { templateResolverNode } from '@/slide-renderer/nodes/templateResolverNode';
import { layoutPlannerNode } from '@/slide-renderer/nodes/layoutPlannerNode';
import { chartPlannerNode } from '@/slide-renderer/nodes/chartPlannerNode';
import { imageSearchNode } from '@/slide-renderer/nodes/imageSearchNode';
import { renderQaNode } from '@/slide-renderer/nodes/renderQaNode';
import { deckComposerNode } from '@/slide-renderer/nodes/deckComposerNode';

const workflow = new StateGraph(SlideRenderState)
  .addNode('resolveTemplate', templateResolverNode)
  .addNode('planLayout', layoutPlannerNode)
  .addNode('planCharts', chartPlannerNode)
  .addNode('searchImages', imageSearchNode)
  .addNode('renderQa', renderQaNode)
  .addNode('composeDeck', deckComposerNode)
  .addEdge('__start__', 'resolveTemplate')
  .addEdge('resolveTemplate', 'planLayout')
  .addEdge('planLayout', 'planCharts')
  .addEdge('planCharts', 'searchImages')
  .addEdge('searchImages', 'renderQa')
  .addEdge('renderQa', 'composeDeck')
  .addEdge('composeDeck', '__end__');

export const slideRenderGraph = workflow.compile();
