import PptxGenJS from 'pptxgenjs';
import type { SlideOutline } from '@/types';
import type { DeckTemplate, SlideRenderPlan } from '@/types/render';

const SLIDE_WIDTH = 13.333;

function bulletsToText(bullets: string[]): string {
  return bullets.map((bullet) => `• ${bullet}`).join('\n');
}

function splitTwoColumns<T>(items: T[]): [T[], T[]] {
  const splitIndex = Math.ceil(items.length / 2);
  return [items.slice(0, splitIndex), items.slice(splitIndex)];
}

function applySlideShell(
  pptx: PptxGenJS,
  plan: SlideRenderPlan,
  title: string,
  template: DeckTemplate
): PptxGenJS.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: template.palette.background };

  if (plan.layout === 'title-focus' && plan.image?.dataUri) {
    slide.addImage({
      data: plan.image.dataUri,
      x: 0,
      y: 0,
      w: SLIDE_WIDTH,
      h: 7.5,
      sizing: { type: 'cover', x: 0, y: 0, w: SLIDE_WIDTH, h: 7.5 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: SLIDE_WIDTH,
      h: 7.5,
      line: { color: '000000', pt: 0, transparency: 100 },
      fill: { color: '000000', transparency: 42 },
    });
  }

  applyTemplateBackgroundEffects(pptx, slide, template);

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_WIDTH,
    h: 0.16,
    line: { color: template.palette.accent, pt: 0 },
    fill: { color: template.palette.accent },
  });

  slide.addText(`Slide ${plan.index}`, {
    x: 0.5,
    y: 0.24,
    w: 2.2,
    h: 0.25,
    fontFace: template.typography.monoFont,
    fontSize: 10,
    color: template.palette.mutedText,
  });

  slide.addText(title, {
    x: 0.5,
    y: 0.56,
    w: 12.2,
    h: 1.05,
    fontFace: template.typography.titleFont,
    fontSize: plan.layout === 'title-focus' ? 40 : 30,
    bold: true,
    color: template.palette.text,
    fit: 'shrink',
  });

  return slide;
}

function applyTemplateBackgroundEffects(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  template: DeckTemplate
): void {
  switch (template.backgroundStyle) {
    case 'cool-gradient': {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: -0.9,
        y: -1.0,
        w: 6.2,
        h: 4.2,
        line: { color: template.palette.accent, pt: 0, transparency: 100 },
        fill: { color: template.palette.accentSoft, transparency: 55 },
      });
      break;
    }
    case 'dark-radial': {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 8.6,
        y: -1.6,
        w: 6.6,
        h: 4.6,
        line: { color: template.palette.surface, pt: 0, transparency: 100 },
        fill: { color: template.palette.surface, transparency: 62 },
      });
      break;
    }
    case 'warm-paper': {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.18,
        y: 0.2,
        w: 12.95,
        h: 7.08,
        line: { color: template.palette.divider, pt: 0.6, transparency: 50 },
        fill: { color: template.palette.background, transparency: 8 },
      });
      break;
    }
    case 'neon-glow': {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 8.3,
        y: -1.2,
        w: 5.9,
        h: 4.3,
        line: { color: template.palette.accent, pt: 0, transparency: 100 },
        fill: { color: template.palette.accentSoft, transparency: 40 },
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.25,
        y: 0.34,
        w: 12.8,
        h: 6.95,
        line: { color: template.palette.divider, pt: 0.8, transparency: 55 },
        fill: { color: template.palette.background, transparency: 12 },
      });
      break;
    }
    case 'solid-clean':
    default:
      break;
  }
}

function addImageToRightPanel(slide: PptxGenJS.Slide, plan: SlideRenderPlan): boolean {
  if (!plan.image?.dataUri) return false;
  slide.addImage({
    data: plan.image.dataUri,
    x: 7.15,
    y: 2.3,
    w: 5.55,
    h: 3.85,
    sizing: { type: 'cover', x: 7.15, y: 2.3, w: 5.55, h: 3.85 },
    altText: plan.image.alt,
  });
  return true;
}

function addKeyMessageBlock(slide: PptxGenJS.Slide, plan: SlideRenderPlan, template: DeckTemplate): void {
  if (!plan.keyMessage) return;

  slide.addShape('roundRect', {
    x: 0.5,
    y: 1.75,
    w: 12.3,
    h: 0.68,
    line: { color: template.palette.accentSoft, pt: 0 },
    fill: { color: template.palette.accentSoft },
  });

  slide.addText(plan.keyMessage, {
    x: 0.76,
    y: 1.95,
    w: 11.8,
    h: 0.3,
    fontFace: template.typography.bodyFont,
    fontSize: 16,
    bold: true,
    color: template.palette.text,
    fit: 'shrink',
  });
}

function addChartIfAvailable(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  plan: SlideRenderPlan,
  template: DeckTemplate
): boolean {
  if (!plan.chart) return false;

  const chartType = plan.chart.kind as 'bar' | 'pie' | 'line';

  slide.addChart(
    chartType,
    [
      {
        name: plan.chart.seriesName,
        labels: plan.chart.labels,
        values: plan.chart.values,
      },
    ],
    {
      x: 7.1,
      y: 1.95,
      w: 5.7,
      h: 4.55,
      showLegend: plan.chart.labels.length <= 6,
      legendPos: 'b',
      showTitle: false,
      catAxisLabelColor: template.palette.mutedText,
      valAxisLabelColor: template.palette.mutedText,
      chartColors: [template.palette.accent, '22C55E', 'F59E0B', 'EF4444', '6366F1'],
    } as Record<string, unknown>
  );

  return true;
}

function renderSlideByLayout(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  plan: SlideRenderPlan,
  template: DeckTemplate
): void {
  switch (plan.layout) {
    case 'title-focus': {
      addKeyMessageBlock(slide, plan, template);
      if (plan.bullets.length > 0) {
        slide.addText(bulletsToText(plan.bullets.slice(0, 4)), {
          x: 1.2,
          y: 3.0,
          w: 10.9,
          h: 2.8,
          fontFace: template.typography.bodyFont,
          fontSize: 22,
          color: template.palette.text,
          valign: 'top',
        });
      }
      break;
    }
    case 'chart-right': {
      addKeyMessageBlock(slide, plan, template);
      slide.addText(bulletsToText(plan.bullets), {
        x: 0.6,
        y: 2.65,
        w: 6.25,
        h: 3.75,
        fontFace: template.typography.bodyFont,
        fontSize: 17,
        color: template.palette.text,
        fit: 'shrink',
      });
      const hasChart = addChartIfAvailable(pptx, slide, plan, template);
      if (!hasChart) {
        const hasImage = addImageToRightPanel(slide, plan);
        if (!hasImage) {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 7.15,
            y: 2.3,
            w: 5.55,
            h: 3.85,
            line: { color: template.palette.divider, pt: 1 },
            fill: { color: template.palette.surface, transparency: 15 },
          });
          slide.addText('Chart/image placeholder', {
            x: 7.45,
            y: 3.8,
            w: 4.95,
            h: 0.6,
            align: 'center',
            fontFace: template.typography.bodyFont,
            fontSize: 14,
            color: template.palette.mutedText,
            italic: true,
            fit: 'shrink',
          });
        }
      }
      break;
    }
    case 'content-two-column': {
      addKeyMessageBlock(slide, plan, template);
      const [left, right] = splitTwoColumns(plan.bullets);
      slide.addText(bulletsToText(left), {
        x: 0.65,
        y: 2.65,
        w: 5.9,
        h: 3.7,
        fontFace: template.typography.bodyFont,
        fontSize: 17,
        color: template.palette.text,
        fit: 'shrink',
      });
      slide.addText(bulletsToText(right), {
        x: 6.85,
        y: 2.65,
        w: 5.9,
        h: 3.7,
        fontFace: template.typography.bodyFont,
        fontSize: 17,
        color: template.palette.text,
        fit: 'shrink',
      });
      break;
    }
    case 'conclusion-focus': {
      addKeyMessageBlock(slide, plan, template);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.9,
        y: 2.8,
        w: 11.5,
        h: 2.6,
        line: { color: template.palette.divider, pt: 1 },
        fill: { color: template.palette.surface },
      });
      const conclusionText = plan.bullets.length > 0 ? bulletsToText(plan.bullets) : plan.keyMessage;
      slide.addText(conclusionText, {
        x: 1.25,
        y: 3.15,
        w: 10.8,
        h: 1.9,
        align: 'center',
        valign: 'middle',
        fontFace: template.typography.bodyFont,
        fontSize: 20,
        color: template.palette.text,
        fit: 'shrink',
      });
      break;
    }
    case 'content-single-column':
    default: {
      addKeyMessageBlock(slide, plan, template);
      slide.addText(bulletsToText(plan.bullets), {
        x: 0.65,
        y: 2.65,
        w: 12.1,
        h: 3.8,
        fontFace: template.typography.bodyFont,
        fontSize: 18,
        color: template.palette.text,
        fit: 'shrink',
      });
      break;
    }
  }
}

function makeSafeFileName(fileName?: string): string {
  const raw = (fileName || 'generated-presentation').trim();
  const normalized = raw
    .replace(/\.pptx$/i, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${normalized || 'generated-presentation'}.pptx`;
}

export async function buildPresentationBase64(
  slides: SlideOutline[],
  plan: SlideRenderPlan[],
  template: DeckTemplate,
  fileName?: string
): Promise<{ fileName: string; base64: string }> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'ppt-generator';
  pptx.company = 'ppt-generator';
  pptx.subject = 'AI generated presentation';
  pptx.title = 'AI generated presentation';

  slides.forEach((slideData, idx) => {
    const renderPlan = plan[idx];
    if (!renderPlan) return;

    const slide = applySlideShell(pptx, renderPlan, slideData.title, template);
    renderSlideByLayout(pptx, slide, renderPlan, template);

    const noteParts = [renderPlan.speakerNotes];
    if (renderPlan.image?.attributionLine) {
      noteParts.push(renderPlan.image.attributionLine);
    }
    const combinedNotes = noteParts.filter(Boolean).join('\n\n');
    if (combinedNotes) {
      slide.addNotes(combinedNotes);
    }
  });

  const output = await pptx.write({ outputType: 'base64', compression: true });
  if (typeof output !== 'string') {
    throw new Error('Unexpected PPTX output type');
  }

  return {
    fileName: makeSafeFileName(fileName),
    base64: output,
  };
}
