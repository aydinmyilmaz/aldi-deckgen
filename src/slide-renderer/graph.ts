import { StateGraph } from '@langchain/langgraph';
import { SlideRenderState } from '@/slide-renderer/state';
import { templateResolverNode } from '@/slide-renderer/nodes/templateResolverNode';
import { layoutPlannerNode } from '@/slide-renderer/nodes/layoutPlannerNode';
import { plotSpecPlannerNode } from '@/slide-renderer/nodes/plotSpecPlannerNode';
import { chartPlannerNode } from '@/slide-renderer/nodes/chartPlannerNode';
import { plotAgentNode } from '@/slide-renderer/nodes/plotAgentNode';
import { imageSearchNode } from '@/slide-renderer/nodes/imageSearchNode';
import { renderQaNode } from '@/slide-renderer/nodes/renderQaNode';
import { deckComposerNode } from '@/slide-renderer/nodes/deckComposerNode';
import { visualQaNode } from '@/slide-renderer/nodes/visualQaNode';

const workflow = new StateGraph(SlideRenderState)
  .addNode('resolveTemplate', templateResolverNode)
  .addNode('planLayout', layoutPlannerNode)
  .addNode('planPlotSpec', plotSpecPlannerNode)
  .addNode('planCharts', chartPlannerNode)
  .addNode('planPlots', plotAgentNode)
  .addNode('searchImages', imageSearchNode)
  .addNode('renderQa', renderQaNode)
  .addNode('composeDeck', deckComposerNode)
  .addNode('visualQa', visualQaNode)
  .addEdge('__start__', 'resolveTemplate')
  .addEdge('resolveTemplate', 'planLayout')
  .addEdge('planLayout', 'planPlotSpec')
  .addEdge('planPlotSpec', 'planCharts')
  .addEdge('planCharts', 'planPlots')
  .addEdge('planPlots', 'searchImages')
  .addEdge('searchImages', 'renderQa')
  .addEdge('renderQa', 'composeDeck')
  .addEdge('composeDeck', 'visualQa')
  .addEdge('visualQa', '__end__');

export const slideRenderGraph = workflow.compile();
