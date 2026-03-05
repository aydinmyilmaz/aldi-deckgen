import PptxGenJS from 'pptxgenjs';
import type { SlideOutline } from '@/types';
import type { DeckTemplate, SlideRenderPlan } from '@/types/render';

const SLIDE_WIDTH = 13.333;

function makeBulletRuns(
  bullets: string[],
  color: string,
  fontFace: string
): PptxGenJS.TextProps[] {
  return bullets.map((text, i) => ({
    text: text.trim(),
    options: {
      bullet: { type: 'bullet' },
      color,
      fontFace,
      breakLine: i < bullets.length - 1,
    } satisfies PptxGenJS.TextPropsOptions,
  }));
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
  const chartColors = [
    template.palette.accent,
    '22C55E',
    'F59E0B',
    'EF4444',
    '6366F1',
    '0EA5E9',
    'EC4899',
    '14B8A6',
  ];

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
      // Data labels
      showValue: true,
      dataLabelFontSize: 11,
      dataLabelColor: template.palette.text,
      dataLabelPosition: chartType === 'pie' ? 'bestFit' : 'outEnd',
      // Legend
      showLegend: plan.chart.labels.length <= 6,
      legendPos: 'b',
      legendFontSize: 11,
      legendColor: template.palette.mutedText,
      // Title off — title is the slide title
      showTitle: false,
      // Axis styling
      catAxisLabelColor: template.palette.mutedText,
      catAxisLabelFontSize: 11,
      valAxisLabelColor: template.palette.mutedText,
      valAxisLabelFontSize: 11,
      valGridLine: { style: 'none' },
      // Colors
      chartColors: chartColors.slice(0, Math.max(plan.chart.labels.length, 1)),
      chartColorsOpacity: 90,
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
        // fontSize on container so fit:'shrink' scales uniformly across all runs
        slide.addText(
          makeBulletRuns(plan.bullets.slice(0, 4), template.palette.text, template.typography.bodyFont),
          { x: 1.2, y: 3.0, w: 10.9, h: 2.8, fontSize: 20, valign: 'top' }
        );
      }
      break;
    }
    case 'chart-right': {
      addKeyMessageBlock(slide, plan, template);
      if (plan.bullets.length > 0) {
        // fontSize on container so fit:'shrink' scales uniformly across all runs
        slide.addText(
          makeBulletRuns(plan.bullets, template.palette.text, template.typography.bodyFont),
          { x: 0.6, y: 2.65, w: 6.25, h: 3.75, fontSize: 15, fit: 'shrink' }
        );
      }
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
      if (left.length > 0) {
        // fontSize on container so fit:'shrink' scales uniformly across all runs
        slide.addText(
          makeBulletRuns(left, template.palette.text, template.typography.bodyFont),
          { x: 0.65, y: 2.65, w: 5.9, h: 3.7, fontSize: 15, fit: 'shrink' }
        );
      }
      if (right.length > 0) {
        // fontSize on container so fit:'shrink' scales uniformly across all runs
        slide.addText(
          makeBulletRuns(right, template.palette.text, template.typography.bodyFont),
          { x: 6.85, y: 2.65, w: 5.9, h: 3.7, fontSize: 15, fit: 'shrink' }
        );
      }
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
      const conclusionText = plan.bullets.length > 0
        ? plan.bullets.join('\n')
        : (plan.keyMessage || '');
      if (conclusionText) {
        // Conclusion is a statement — plain text, no bullet runs
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
      }
      break;
    }
    case 'agenda-list': {
      const items = plan.bullets.slice(0, 8);
      const colCount = items.length > 4 ? 2 : 1;
      const colWidth = colCount === 2 ? 5.8 : 12.0;
      const xOffsets = colCount === 2 ? [0.55, 6.75] : [0.65];
      const rowH = 0.72;
      const startY = 1.9;
      const gap = 0.18;

      items.forEach((item, i) => {
        const col = colCount === 2 ? i % 2 : 0;
        const row = colCount === 2 ? Math.floor(i / 2) : i;
        const x = xOffsets[col];
        const y = startY + row * (rowH + gap);

        // number badge circle
        slide.addShape(pptx.ShapeType.ellipse, {
          x,
          y: y + 0.06,
          w: 0.5,
          h: 0.5,
          line: { color: template.palette.accent, pt: 0 },
          fill: { color: template.palette.accent },
        });
        slide.addText(`${i + 1}`, {
          x,
          y: y + 0.06,
          w: 0.5,
          h: 0.5,
          align: 'center',
          valign: 'middle',
          fontFace: template.typography.bodyFont,
          fontSize: 14,
          bold: true,
          color: template.palette.background,
        });

        // item text
        slide.addText(item.trim(), {
          x: x + 0.62,
          y,
          w: colWidth - 0.72,
          h: rowH,
          fontFace: template.typography.bodyFont,
          fontSize: 16,
          color: template.palette.text,
          valign: 'middle',
          fit: 'shrink',
        });
      });
      break;
    }
    case 'quote-callout': {
      // Left accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 1.72,
        w: 0.22,
        h: 2.1,
        line: { color: template.palette.accent, pt: 0 },
        fill: { color: template.palette.accent },
      });

      // Large italic quote (keyMessage, or first bullet if no keyMessage)
      const quoteText = plan.keyMessage || plan.bullets[0] || '';
      if (quoteText) {
        slide.addText(quoteText, {
          x: 0.9,
          y: 1.68,
          w: 11.9,
          h: 2.15,
          fontFace: template.typography.titleFont,
          fontSize: 26,
          bold: false,
          italic: true,
          color: template.palette.text,
          valign: 'middle',
          fit: 'shrink',
        });
      }

      // Supporting bullets below
      const supportingBullets = plan.keyMessage ? plan.bullets : plan.bullets.slice(1);
      if (supportingBullets.length > 0) {
        // fontSize on container so fit:'shrink' scales uniformly across all runs
        slide.addText(
          makeBulletRuns(supportingBullets, template.palette.mutedText, template.typography.bodyFont),
          { x: 0.9, y: 4.1, w: 11.9, h: 2.8, fontSize: 15, fit: 'shrink' }
        );
      }
      break;
    }
    case 'content-single-column':
    default: {
      addKeyMessageBlock(slide, plan, template);
      if (plan.bullets.length > 0) {
        // fontSize on container so fit:'shrink' scales uniformly across all runs
        slide.addText(
          makeBulletRuns(plan.bullets, template.palette.text, template.typography.bodyFont),
          { x: 0.65, y: 2.65, w: 12.1, h: 3.8, fontSize: 16, fit: 'shrink' }
        );
      }
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
