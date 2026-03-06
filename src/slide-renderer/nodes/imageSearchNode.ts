import { fetchPexelsImageAsset, imageAssetFromUrl } from '@/slide-renderer/pexels';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';

export async function imageSearchNode(
  state: SlideRenderPipelineState
): Promise<Partial<SlideRenderPipelineState>> {
  const apiKey = process.env.PEXELS_API_KEY?.trim() || '';

  const updatedPlan = await Promise.all(
    state.renderPlan.map(async (item) => {
      if (item.plot?.dataUri) return { ...item, image: undefined };
      if (item.chart) return { ...item, image: undefined };
      if (item.selectedImageUrl) {
        try {
          const image = await imageAssetFromUrl(item.selectedImageUrl, {
            query: item.imageQuery || 'slide image',
            alt: item.selectedImageAlt,
            attributionLine: item.selectedImageAttributionLine,
          });
          if (!image) return { ...item, image: undefined };
          const shouldUseVisualPanel = item.layout !== 'title-focus' && item.layout !== 'conclusion-focus';
          return {
            ...item,
            layout: shouldUseVisualPanel ? 'chart-right' : item.layout,
            image,
          };
        } catch {
          return { ...item, image: undefined };
        }
      }

      if (!state.config.useRelatedImages) return { ...item, image: undefined };
      if (!apiKey) return { ...item, image: undefined };
      if (item.imageIntent === 'none') return { ...item, image: undefined };
      if (!item.imageQuery) return { ...item, image: undefined };

      try {
        const image = await fetchPexelsImageAsset(item.imageQuery, apiKey);
        if (!image) return { ...item, image: undefined };
        const shouldUseVisualPanel =
          item.layout !== 'title-focus' &&
          item.layout !== 'conclusion-focus' &&
          !item.chart;
        return {
          ...item,
          layout: shouldUseVisualPanel ? 'chart-right' : item.layout,
          image,
        };
      } catch {
        return { ...item, image: undefined };
      }
    })
  );

  return { renderPlan: updatedPlan };
}
