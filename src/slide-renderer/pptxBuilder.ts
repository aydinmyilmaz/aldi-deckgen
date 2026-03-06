import PptxGenJS from 'pptxgenjs';
import type { SlideOutline } from '@/types';
import type { DeckTemplate, SlideRenderPlan } from '@/types/render';

const SLIDE_WIDTH = 13.333;
const POINTS_PER_INCH = 72;

type FitTextOptions = {
  text: string;
  boxW: number;
  boxH: number;
  minFont: number;
  maxFont: number;
  lineHeight?: number;
  isBold?: boolean;
  paddingX?: number;
  paddingY?: number;
};

function estimateWrappedLineCount(text: string, fontSize: number, boxW: number, isBold: boolean): number {
  const sanitized = text.replace(/\r/g, '').trim();
  if (!sanitized) return 1;

  const paragraphs = sanitized.split('\n');
  const avgCharWidthFactor = isBold ? 0.52 : 0.47;
  const usableW = Math.max(boxW, 0.2);
  const charsPerLine = Math.max(
    1,
    Math.floor((usableW * POINTS_PER_INCH) / Math.max(fontSize * avgCharWidthFactor, 0.1))
  );

  let lines = 0;
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines += 1;
      continue;
    }
    let currentLineLen = 0;
    let paragraphLines = 1;
    for (const word of words) {
      const nextLen = currentLineLen === 0 ? word.length : currentLineLen + 1 + word.length;
      if (nextLen <= charsPerLine) {
        currentLineLen = nextLen;
      } else {
        paragraphLines += 1;
        currentLineLen = word.length;
      }
    }
    lines += paragraphLines;
  }

  return Math.max(lines, 1);
}

function computeFontSizeForBox(options: FitTextOptions): number {
  const {
    text,
    boxW,
    boxH,
    minFont,
    maxFont,
    lineHeight = 1.24,
    isBold = false,
    paddingX = 0.06,
    paddingY = 0.04,
  } = options;

  const usableW = Math.max(0.2, boxW - paddingX * 2);
  const usableH = Math.max(0.2, boxH - paddingY * 2);
  let low = Math.max(6, Math.floor(minFont));
  let high = Math.max(low, Math.floor(maxFont));
  let best = low;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const wrappedLines = estimateWrappedLineCount(text, mid, usableW, isBold);
    const neededH = wrappedLines * mid * lineHeight;
    const availableH = usableH * POINTS_PER_INCH;

    if (neededH <= availableH) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

function makeBulletRuns(
  bullets: string[],
  color: string,
  fontFace: string
): PptxGenJS.TextProps[] {
  return bullets.map((text, i) => ({
    text: `• ${text.trim()}`,
    options: {
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
  const renderProfile = template.renderProfile ?? {
    topBar: 'solid',
    showSlideIndex: true,
    motifStyle: 'minimal' as const,
  };
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

  if (renderProfile.topBar === 'solid') {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: SLIDE_WIDTH,
      h: 0.16,
      line: { color: template.palette.accent, pt: 0 },
      fill: { color: template.palette.accent },
    });
  }

  if (renderProfile.showSlideIndex) {
    slide.addText(`Slide ${plan.index}`, {
      x: 0.5,
      y: 0.24,
      w: 2.2,
      h: 0.25,
      fontFace: template.typography.monoFont,
      fontSize: 10,
      color: template.palette.mutedText,
    });
  }

  const titleFontSize = computeFontSizeForBox({
    text: title,
    boxW: 12.2,
    boxH: 1.15,
    minFont: plan.layout === 'title-focus' ? 30 : 24,
    maxFont: plan.layout === 'title-focus' ? 42 : 34,
    lineHeight: 1.12,
    isBold: true,
  });

  slide.addText(title, {
    x: 0.5,
    y: 0.56,
    w: 12.2,
    h: 1.15,
    fontFace: template.typography.titleFont,
    fontSize: titleFontSize,
    bold: true,
    color: template.palette.text,
  });

  addSlideTypeAccent(pptx, slide, plan, template);

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

  const keyMessageFontSize = computeFontSizeForBox({
    text: plan.keyMessage,
    boxW: 11.8,
    boxH: 0.3,
    minFont: 11,
    maxFont: 16,
    lineHeight: 1.1,
    isBold: true,
    paddingY: 0,
  });

  slide.addText(plan.keyMessage, {
    x: 0.76,
    y: 1.95,
    w: 11.8,
    h: 0.3,
    fontFace: template.typography.bodyFont,
    fontSize: keyMessageFontSize,
    bold: true,
    color: template.palette.text,
  });
}

function addSlideTypeAccent(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  plan: SlideRenderPlan,
  template: DeckTemplate
): void {
  switch (plan.slideType) {
    case 'problem':
    case 'findings': {
      // Bottom-right corner triangle accent
      slide.addShape(pptx.ShapeType.rtTriangle, {
        x: 11.8,
        y: 5.8,
        w: 1.55,
        h: 1.7,
        line: { color: template.palette.accentSoft, pt: 0 },
        fill: { color: template.palette.accentSoft, transparency: 30 },
      });
      break;
    }
    case 'solution':
    case 'benefits': {
      // Top-right circle outline accent
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 11.9,
        y: 0.6,
        w: 1.05,
        h: 1.05,
        line: { color: template.palette.accent, pt: 1.5 },
        fill: { color: template.palette.background, transparency: 100 },
      });
      break;
    }
    case 'implementation': {
      // Dashed horizontal divider line near top of content area
      slide.addShape(pptx.ShapeType.line, {
        x: 0.55,
        y: 2.52,
        w: 12.2,
        h: 0,
        line: { color: template.palette.divider, pt: 1, dashType: 'dash' },
      });
      break;
    }
    case 'references': {
      // Large muted quotation mark watermark
      slide.addText('\u201C', {
        x: 10.5,
        y: 4.8,
        w: 2.8,
        h: 2.8,
        fontFace: template.typography.titleFont,
        fontSize: 180,
        color: template.palette.divider,
        align: 'right',
        valign: 'bottom',
      });
      break;
    }
    default:
      break;
  }
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

function addPlotIfAvailable(
  slide: PptxGenJS.Slide,
  plan: SlideRenderPlan
): boolean {
  if (!plan.plot?.dataUri) return false;
  slide.addImage({
    data: plan.plot.dataUri,
    x: 7.1,
    y: 1.95,
    w: 5.7,
    h: 4.55,
    sizing: { type: 'contain', x: 7.1, y: 1.95, w: 5.7, h: 4.55 },
    altText: `${plan.plot.kind} plot`,
  });
  return true;
}

function addFallbackMotif(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  template: DeckTemplate
): void {
  const motifStyle = template.renderProfile?.motifStyle ?? 'minimal';

  if (motifStyle === 'geometric') {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 11.55,
      y: 5.95,
      w: 0.52,
      h: 0.52,
      line: { color: template.palette.accent, pt: 0 },
      fill: { color: template.palette.accent, transparency: 10 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 12.12,
      y: 5.82,
      w: 0.58,
      h: 0.28,
      line: { color: template.palette.accentSoft, pt: 0 },
      fill: { color: template.palette.accentSoft, transparency: 8 },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 11.45,
      y: 6.58,
      w: 1.45,
      h: 0,
      line: { color: template.palette.divider, pt: 0.7, dashType: 'sysDot' },
    });
    return;
  }

  slide.addShape(pptx.ShapeType.ellipse, {
    x: 12.05,
    y: 6.2,
    w: 0.42,
    h: 0.42,
    line: { color: template.palette.divider, pt: 0.4 },
    fill: { color: template.palette.surface, transparency: 10 },
  });
}

function splitBulletsByKeyword(
  bullets: string[]
): { left: string[]; right: string[] } {
  const choose: string[] = [];
  const examples: string[] = [];

  for (const bullet of bullets) {
    if (/\b(choose|when|fit|use when|criteria|good for)\b/i.test(bullet)) {
      choose.push(bullet);
    } else {
      examples.push(bullet);
    }
  }

  if (choose.length === 0 || examples.length === 0) {
    const split = Math.ceil(bullets.length / 2);
    return { left: bullets.slice(0, split), right: bullets.slice(split) };
  }
  return { left: choose, right: examples };
}

function renderSlideByLayout(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  plan: SlideRenderPlan,
  template: DeckTemplate
): void {
  let hasPrimaryVisual = false;
  switch (plan.layout) {
    case 'title-focus': {
      hasPrimaryVisual = Boolean(plan.image?.dataUri);
      addKeyMessageBlock(slide, plan, template);

      if (plan.bullets.length > 0) {
        const titleBullets = plan.bullets.slice(0, 4);
        const titleBulletsFontSize = computeFontSizeForBox({
          text: titleBullets.join('\n'),
          boxW: 10.9,
          boxH: 2.8,
          minFont: 14,
          maxFont: 28,
          lineHeight: 1.28,
        });
        slide.addText(
          makeBulletRuns(titleBullets, template.palette.text, template.typography.bodyFont),
          { x: 1.2, y: 3.0, w: 10.9, h: 2.8, fontSize: titleBulletsFontSize, valign: 'top' }
        );
      } else if (plan.speakerNotes) {
        // Fallback: show speaker notes as italic subtitle when no bullets
        const notesFontSize = computeFontSizeForBox({
          text: plan.speakerNotes,
          boxW: 10.9,
          boxH: 1.8,
          minFont: 13,
          maxFont: 18,
          lineHeight: 1.28,
        });
        slide.addText(plan.speakerNotes, {
          x: 1.2,
          y: 3.1,
          w: 10.9,
          h: 1.8,
          fontFace: template.typography.bodyFont,
          fontSize: notesFontSize,
          color: template.palette.mutedText,
          italic: true,
        });
      }
      break;
    }
    case 'chart-right': {
      addKeyMessageBlock(slide, plan, template);
      if (plan.bullets.length > 0) {
        const bulletsText = plan.bullets.join('\n');
        const bulletsFontSize = computeFontSizeForBox({
          text: bulletsText,
          boxW: 6.25,
          boxH: 3.75,
          minFont: 14,
          maxFont: 28,
          lineHeight: 1.28,
        });
        // Use a computed container size so bullet runs stay readable and within bounds.
        slide.addText(
          makeBulletRuns(plan.bullets, template.palette.text, template.typography.bodyFont),
          { x: 0.6, y: 2.65, w: 6.25, h: 3.75, fontSize: bulletsFontSize, valign: 'middle' }
        );
      }
      const hasPlot = addPlotIfAvailable(slide, plan);
      const hasChart = hasPlot ? false : addChartIfAvailable(pptx, slide, plan, template);
      if (!hasPlot && !hasChart) {
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
        hasPrimaryVisual = true;
      } else {
        hasPrimaryVisual = true;
      }
      break;
    }
    case 'content-two-column': {
      addKeyMessageBlock(slide, plan, template);
      const [left, right] = splitTwoColumns(plan.bullets);
      if (left.length > 0) {
        const leftFontSize = computeFontSizeForBox({
          text: left.join('\n'),
          boxW: 5.9,
          boxH: 3.7,
          minFont: 14,
          maxFont: 32,
          lineHeight: 1.28,
        });
        // Use a computed container size so bullet runs stay readable and within bounds.
        slide.addText(
          makeBulletRuns(left, template.palette.text, template.typography.bodyFont),
          { x: 0.65, y: 2.65, w: 5.9, h: 3.7, fontSize: leftFontSize, valign: 'middle' }
        );
      }
      if (right.length > 0) {
        const rightFontSize = computeFontSizeForBox({
          text: right.join('\n'),
          boxW: 5.9,
          boxH: 3.7,
          minFont: 14,
          maxFont: 32,
          lineHeight: 1.28,
        });
        // Use a computed container size so bullet runs stay readable and within bounds.
        slide.addText(
          makeBulletRuns(right, template.palette.text, template.typography.bodyFont),
          { x: 6.85, y: 2.65, w: 5.9, h: 3.7, fontSize: rightFontSize, valign: 'middle' }
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
      const hasConclusionBullets = plan.bullets.length > 0;
      const conclusionText = hasConclusionBullets
        ? plan.bullets.join('\n')
        : (plan.keyMessage || '');
      if (conclusionText) {
        const conclusionFontSize = computeFontSizeForBox({
          text: conclusionText,
          boxW: 10.8,
          boxH: 1.9,
          minFont: 14,
          maxFont: 28,
          lineHeight: 1.26,
        });
        if (hasConclusionBullets) {
          slide.addText(
            makeBulletRuns(plan.bullets, template.palette.text, template.typography.bodyFont),
            { x: 1.25, y: 3.15, w: 10.8, h: 1.9, fontSize: conclusionFontSize, valign: 'middle' }
          );
        } else {
          slide.addText(conclusionText, {
            x: 1.25,
            y: 3.15,
            w: 10.8,
            h: 1.9,
            align: 'center',
            valign: 'middle',
            fontFace: template.typography.bodyFont,
            fontSize: conclusionFontSize,
            color: template.palette.text,
          });
        }
      }
      break;
    }
    case 'agenda-list': {
      hasPrimaryVisual = true;
      addKeyMessageBlock(slide, plan, template);
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
        const agendaItemFontSize = computeFontSizeForBox({
          text: item.trim(),
          boxW: colWidth - 0.72,
          boxH: rowH,
          minFont: 13,
          maxFont: 17,
          lineHeight: 1.18,
        });
        slide.addText(item.trim(), {
          x: x + 0.62,
          y,
          w: colWidth - 0.72,
          h: rowH,
          fontFace: template.typography.bodyFont,
          fontSize: agendaItemFontSize,
          color: template.palette.text,
          valign: 'middle',
        });
      });
      break;
    }
    case 'quote-callout': {
      hasPrimaryVisual = true;
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
        const quoteFontSize = computeFontSizeForBox({
          text: quoteText,
          boxW: 11.9,
          boxH: 2.15,
          minFont: 16,
          maxFont: 26,
          lineHeight: 1.22,
        });
        slide.addText(quoteText, {
          x: 0.9,
          y: 1.68,
          w: 11.9,
          h: 2.15,
          fontFace: template.typography.titleFont,
          fontSize: quoteFontSize,
          bold: false,
          italic: true,
          color: template.palette.text,
          valign: 'middle',
        });
      }

      // Supporting bullets below
      const supportingBullets = plan.keyMessage ? plan.bullets : plan.bullets.slice(1);
      if (supportingBullets.length > 0) {
        const supportingFontSize = computeFontSizeForBox({
          text: supportingBullets.join('\n'),
          boxW: 11.9,
          boxH: 2.8,
          minFont: 12,
          maxFont: 24,
          lineHeight: 1.28,
        });
        // Use a computed container size so bullet runs stay readable and within bounds.
        slide.addText(
          makeBulletRuns(supportingBullets, template.palette.mutedText, template.typography.bodyFont),
          { x: 0.9, y: 4.1, w: 11.9, h: 2.8, fontSize: supportingFontSize }
        );
      }
      break;
    }
    case 'stats-highlight': {
      const cards = plan.statCards ?? [];
      const count = Math.min(cards.length, 4);
      if (count === 0) break;
      hasPrimaryVisual = true;

      const cardW = (12.3 - (count - 1) * 0.3) / count;
      const startX = 0.5;
      const cardY = 2.1;
      const cardH = 3.8;

      cards.slice(0, count).forEach((card, i) => {
        const x = startX + i * (cardW + 0.3);
        const valueFontSize = computeFontSizeForBox({
          text: card.value,
          boxW: cardW - 0.3,
          boxH: 1.5,
          minFont: 28,
          maxFont: 72,
          lineHeight: 1.0,
          isBold: true,
        });
        const labelFontSize = computeFontSizeForBox({
          text: card.label,
          boxW: cardW - 0.3,
          boxH: 0.85,
          minFont: 10,
          maxFont: 14,
          lineHeight: 1.2,
        });

        // Card background
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y: cardY,
          w: cardW,
          h: cardH,
          line: { color: template.palette.divider, pt: 1 },
          fill: { color: template.palette.surface },
        });

        // Big value
        slide.addText(card.value, {
          x: x + 0.15,
          y: cardY + 0.45,
          w: cardW - 0.3,
          h: 1.5,
          align: 'center',
          fontFace: template.typography.titleFont,
          fontSize: valueFontSize,
          bold: true,
          color: template.palette.accent,
        });

        // Label
        slide.addText(card.label, {
          x: x + 0.15,
          y: cardY + 2.1,
          w: cardW - 0.3,
          h: 0.85,
          align: 'center',
          fontFace: template.typography.bodyFont,
          fontSize: labelFontSize,
          color: template.palette.text,
        });

        // Optional context footnote
        if (card.context) {
          const contextFontSize = computeFontSizeForBox({
            text: card.context,
            boxW: cardW - 0.3,
            boxH: 0.55,
            minFont: 8,
            maxFont: 10,
            lineHeight: 1.15,
          });
          slide.addText(card.context, {
            x: x + 0.15,
            y: cardY + 3.1,
            w: cardW - 0.3,
            h: 0.55,
            align: 'center',
            fontFace: template.typography.bodyFont,
            fontSize: contextFontSize,
            color: template.palette.mutedText,
            italic: true,
          });
        }
      });
      break;
    }
    case 'card-grid': {
      const cards = plan.cardItems ?? [];
      const count = Math.min(cards.length, 4);
      if (count === 0) break;
      hasPrimaryVisual = true;

      // 2–3 cards: single row. 4 cards: 2×2 grid.
      const cols = count <= 3 ? count : 2;
      const rows = Math.ceil(count / cols);
      const cardW = (12.3 - (cols - 1) * 0.35) / cols;
      const cardH = rows === 1 ? 3.9 : 2.15;
      const startX = 0.5;
      const startY = 2.0;
      const gapX = 0.35;
      const gapY = 0.25;
      const cardAccentColors = [
        template.palette.accent,
        '1F9BC1',
        '7C3AED',
        '22C55E',
      ];

      cards.slice(0, count).forEach((card, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);
        const accentColor = cardAccentColors[i % cardAccentColors.length];

        // Card background
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y,
          w: cardW,
          h: cardH,
          line: { color: template.palette.divider, pt: 0.8 },
          fill: { color: template.palette.surface },
        });

        // Top accent strip
        slide.addShape(pptx.ShapeType.rect, {
          x,
          y,
          w: cardW,
          h: 0.12,
          line: { color: accentColor, pt: 0 },
          fill: { color: accentColor },
        });

        // Badge rect (filled accent color, top-left)
        if (card.badge) {
          const badgeW = Math.min(card.badge.length * 0.12 + 0.4, cardW - 0.36);
          slide.addShape(pptx.ShapeType.roundRect, {
            x: x + 0.18,
            y: y + 0.18,
            w: badgeW,
            h: 0.36,
            line: { color: accentColor, pt: 0 },
            fill: { color: accentColor },
          });
          slide.addText(card.badge.toUpperCase(), {
            x: x + 0.18,
            y: y + 0.18,
            w: badgeW,
            h: 0.36,
            align: 'center',
            valign: 'middle',
            fontFace: template.typography.bodyFont,
            fontSize: 10,
            bold: true,
            color: template.palette.background,
          });
        }

        const titleY = card.badge ? y + 0.65 : y + 0.22;
        const titleH = 0.62;
        const cardTitleFontSize = computeFontSizeForBox({
          text: card.title,
          boxW: cardW - 0.36,
          boxH: titleH,
          minFont: 12,
          maxFont: 16,
          lineHeight: 1.16,
          isBold: true,
        });

        // Card title
        slide.addText(card.title, {
          x: x + 0.18,
          y: titleY,
          w: cardW - 0.36,
          h: titleH,
          fontFace: template.typography.bodyFont,
          fontSize: cardTitleFontSize,
          bold: true,
          color: template.palette.text,
        });

        // Bullets
        if (card.bullets.length > 0) {
          const bulletsBoxH = cardH - (titleY - y) - titleH - 0.2;
          const cardBulletsFontSize = computeFontSizeForBox({
            text: card.bullets.join('\n'),
            boxW: cardW - 0.36,
            boxH: bulletsBoxH,
            minFont: 11,
            maxFont: 13,
            lineHeight: 1.28,
          });
          slide.addText(
            makeBulletRuns(card.bullets.slice(0, 3), template.palette.mutedText, template.typography.bodyFont),
            {
              x: x + 0.18,
              y: titleY + titleH + 0.1,
              w: cardW - 0.36,
              h: bulletsBoxH,
              fontSize: cardBulletsFontSize,
            }
          );
        }
      });

      if (count === 3 && rows === 1) {
        [0, 1].forEach((i) => {
          const arrowX = startX + (i + 1) * cardW + i * gapX + gapX / 2 - 0.08;
          slide.addText('>', {
            x: arrowX,
            y: startY + cardH * 0.45,
            w: 0.16,
            h: 0.35,
            align: 'center',
            valign: 'middle',
            fontFace: template.typography.titleFont,
            fontSize: 28,
            bold: true,
            color: template.palette.mutedText,
          });
        });
      }
      break;
    }
    case 'decision-tree': {
      hasPrimaryVisual = true;
      addKeyMessageBlock(slide, plan, template);

      const nodes = (plan.cardItems?.slice(0, 3).map((card) => card.title) ?? [])
        .concat(plan.bullets.slice(0, 3))
        .filter(Boolean)
        .slice(0, 3);
      const labels = nodes.length >= 3 ? nodes : ['Q1: Stable Input?', 'Q2: Planning Needed?', 'Tier Outcome'];
      const boxW = 3.6;
      const boxH = 1.35;
      const startX = 0.9;
      const y = 3.05;

      labels.forEach((label, i) => {
        const x = startX + i * 4.05;
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y,
          w: boxW,
          h: boxH,
          line: { color: template.palette.divider, pt: 0.8 },
          fill: { color: template.palette.surface },
        });
        slide.addShape(pptx.ShapeType.rect, {
          x,
          y,
          w: boxW,
          h: 0.12,
          line: { color: template.palette.accent, pt: 0 },
          fill: { color: template.palette.accent },
        });
        slide.addText(label, {
          x: x + 0.18,
          y: y + 0.3,
          w: boxW - 0.36,
          h: boxH - 0.4,
          align: 'center',
          valign: 'middle',
          fontFace: template.typography.bodyFont,
          fontSize: 16,
          bold: true,
          color: template.palette.text,
        });

        if (i < labels.length - 1) {
          slide.addShape(pptx.ShapeType.chevron, {
            x: x + boxW + 0.22,
            y: y + 0.4,
            w: 0.42,
            h: 0.55,
            line: { color: template.palette.mutedText, pt: 0.6 },
            fill: { color: template.palette.background, transparency: 100 },
          });
        }
      });
      break;
    }
    case 'criteria-table': {
      hasPrimaryVisual = true;
      addKeyMessageBlock(slide, plan, template);
      const rows = (plan.tableData?.rows?.length ?? 0) > 0
        ? plan.tableData?.rows ?? []
        : plan.bullets.slice(0, 6).map((bullet) => [bullet, 'YES / NO']);
      const headers = plan.tableData?.headers?.length
        ? plan.tableData.headers.slice(0, 2)
        : ['Decision Criteria', 'Check'];
      if (headers.length < 2 || rows.length === 0) break;

      const allRows = [headers, ...rows];
      const tableRows: PptxGenJS.TableRow[] = allRows.map((row, rowIdx) =>
        row.slice(0, 2).map((cell): PptxGenJS.TableCell => ({
          text: cell,
          options: {
            fontFace: template.typography.bodyFont,
            bold: rowIdx === 0,
            fontSize: rowIdx === 0 ? 13 : 12,
            fit: 'shrink',
            color: rowIdx === 0 ? template.palette.background : template.palette.text,
            align: rowIdx === 0 ? 'center' : 'left',
            valign: 'middle',
            fill: {
              color:
                rowIdx === 0
                  ? template.palette.accent
                  : rowIdx % 2 === 0
                  ? template.palette.surface
                  : template.palette.background,
            },
          } as PptxGenJS.TableCellProps,
        }))
      );

      slide.addTable(tableRows, {
        x: 0.75,
        y: 2.55,
        w: 11.9,
        colW: [8.9, 3.0],
        rowH: allRows.map((_, i) => (i === 0 ? 0.52 : 0.56)),
        border: { type: 'solid', pt: 0.8, color: template.palette.divider },
      });
      break;
    }
    case 'matrix-2x2': {
      hasPrimaryVisual = true;
      addKeyMessageBlock(slide, plan, template);

      const matrixX = 1.2;
      const matrixY = 2.6;
      const matrixW = 10.8;
      const matrixH = 3.9;
      const midX = matrixX + matrixW / 2;
      const midY = matrixY + matrixH / 2;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: matrixX,
        y: matrixY,
        w: matrixW,
        h: matrixH,
        line: { color: template.palette.divider, pt: 1 },
        fill: { color: template.palette.surface },
      });
      slide.addShape(pptx.ShapeType.line, {
        x: matrixX,
        y: midY,
        w: matrixW,
        h: 0,
        line: { color: template.palette.divider, pt: 0.8, dashType: 'dash' },
      });
      slide.addShape(pptx.ShapeType.line, {
        x: midX,
        y: matrixY,
        w: 0,
        h: matrixH,
        line: { color: template.palette.divider, pt: 0.8, dashType: 'dash' },
      });

      slide.addText('PRECISION', {
        x: matrixX + matrixW - 1.6,
        y: matrixY + matrixH + 0.05,
        w: 1.4,
        h: 0.3,
        align: 'right',
        fontFace: template.typography.bodyFont,
        fontSize: 10,
        bold: true,
        color: template.palette.mutedText,
      });
      slide.addText('COMPLEXITY', {
        x: matrixX - 0.6,
        y: matrixY - 0.25,
        w: 0.55,
        h: 1.2,
        rotate: 270,
        align: 'center',
        fontFace: template.typography.bodyFont,
        fontSize: 10,
        bold: true,
        color: template.palette.mutedText,
      });

      const points = plan.bullets.slice(0, 4);
      const defaultPoints = ['Tier 1 / Rule Based', 'Tier 2 / Bounded AI', 'Tier 3 / Agentic', 'Reserved Zone'];
      const labels = points.length >= 3 ? points.concat(defaultPoints).slice(0, 4) : defaultPoints;
      const positions: Array<{ x: number; y: number }> = [
        { x: matrixX + 1.1, y: matrixY + 0.8 },
        { x: matrixX + 6.2, y: matrixY + 0.8 },
        { x: matrixX + 6.2, y: matrixY + 2.65 },
        { x: matrixX + 1.1, y: matrixY + 2.65 },
      ];
      labels.forEach((label, i) => {
        const pos = positions[i];
        slide.addShape(pptx.ShapeType.ellipse, {
          x: pos.x,
          y: pos.y,
          w: 0.28,
          h: 0.28,
          line: { color: template.palette.accent, pt: 0 },
          fill: { color: template.palette.accent },
        });
        slide.addText(label, {
          x: pos.x + 0.38,
          y: pos.y - 0.01,
          w: 3.7,
          h: 0.32,
          fontFace: template.typography.bodyFont,
          fontSize: 13,
          color: template.palette.text,
        });
      });
      break;
    }
    case 'tier-detail-split': {
      hasPrimaryVisual = true;
      addKeyMessageBlock(slide, plan, template);
      const split = splitBulletsByKeyword(plan.bullets);
      const leftTitle = 'Choose When';
      const rightTitle = 'Example Use Cases';

      const panel = (
        x: number,
        title: string,
        accentColor: string,
        bullets: string[]
      ) => {
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y: 2.55,
          w: 5.8,
          h: 3.55,
          line: { color: template.palette.divider, pt: 0.9 },
          fill: { color: template.palette.surface },
        });
        slide.addShape(pptx.ShapeType.rect, {
          x,
          y: 2.55,
          w: 0.11,
          h: 3.55,
          line: { color: accentColor, pt: 0 },
          fill: { color: accentColor },
        });
        slide.addText(title, {
          x: x + 0.25,
          y: 2.78,
          w: 5.4,
          h: 0.4,
          fontFace: template.typography.bodyFont,
          fontSize: 20,
          bold: true,
          color: template.palette.text,
        });
        const normalized = bullets.length > 0 ? bullets : ['Add concrete points for this section'];
        const panelBulletsFontSize = computeFontSizeForBox({
          text: normalized.join('\n'),
          boxW: 5.35,
          boxH: 2.65,
          minFont: 14,
          maxFont: 28,
          lineHeight: 1.26,
        });
        slide.addText(
          makeBulletRuns(normalized.slice(0, 5), template.palette.text, template.typography.bodyFont),
          {
            x: x + 0.25,
            y: 3.28,
            w: 5.35,
            h: 2.65,
            fontSize: panelBulletsFontSize,
            valign: 'middle',
          }
        );
      };

      panel(0.8, leftTitle, template.palette.accent, split.left);
      panel(6.75, rightTitle, template.palette.divider, split.right);
      break;
    }
    case 'adoption-path': {
      hasPrimaryVisual = true;
      addKeyMessageBlock(slide, plan, template);

      const steps = plan.bullets.slice(0, 4);
      const labels = steps.length > 0 ? steps : ['Baseline', 'Pilot', 'Scale', 'Optimize'];
      const stepCount = Math.min(labels.length, 4);
      const cardW = (11.9 - (stepCount - 1) * 0.4) / stepCount;
      const startX = 0.7;
      const y = 3.0;

      labels.slice(0, stepCount).forEach((label, i) => {
        const x = startX + i * (cardW + 0.4);
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y,
          w: cardW,
          h: 2.15,
          line: { color: template.palette.divider, pt: 0.8 },
          fill: { color: template.palette.surface },
        });
        slide.addShape(pptx.ShapeType.ellipse, {
          x: x + cardW / 2 - 0.22,
          y: y - 0.33,
          w: 0.44,
          h: 0.44,
          line: { color: template.palette.accent, pt: 0 },
          fill: { color: template.palette.accent },
        });
        slide.addText(String(i + 1), {
          x: x + cardW / 2 - 0.22,
          y: y - 0.33,
          w: 0.44,
          h: 0.44,
          align: 'center',
          valign: 'middle',
          fontFace: template.typography.bodyFont,
          fontSize: 12,
          bold: true,
          color: template.palette.background,
        });
        slide.addText(label, {
          x: x + 0.18,
          y: y + 0.48,
          w: cardW - 0.36,
          h: 1.35,
          align: 'center',
          valign: 'middle',
          fontFace: template.typography.bodyFont,
          fontSize: 14,
          bold: true,
          color: template.palette.text,
        });
        if (i < stepCount - 1) {
          slide.addText('>', {
            x: x + cardW + 0.1,
            y: y + 0.85,
            w: 0.2,
            h: 0.4,
            fontFace: template.typography.titleFont,
            fontSize: 24,
            bold: true,
            color: template.palette.mutedText,
            align: 'center',
          });
        }
      });
      break;
    }
    case 'comparison-table': {
      const tableData = plan.tableData;
      if (!tableData || tableData.headers.length === 0) break;
      hasPrimaryVisual = true;

      const allRows = [tableData.headers, ...tableData.rows];
      const colCount = tableData.headers.length;
      const colW = Array.from({ length: colCount }, () => 12.3 / colCount);
      const headerH = 0.55;
      const dataRowH = Math.min(0.52, (4.8 - headerH) / Math.max(tableData.rows.length, 1));
      const rowH = allRows.map((_, rowIdx) => (rowIdx === 0 ? headerH : dataRowH));

      const tableRows: PptxGenJS.TableRow[] = allRows.map((row, rowIdx) =>
        row.map((cell): PptxGenJS.TableCell => {
          if (rowIdx === 0) {
            const options: PptxGenJS.TableCellProps = {
              bold: true,
              color: template.palette.background,
              fill: { color: template.palette.accent },
              fontFace: template.typography.bodyFont,
              align: 'center',
              valign: 'middle',
              fontSize: 13,
            };
            return { text: cell, options };
          }

          const dataRowIdx = rowIdx - 1;
          const options: PptxGenJS.TableCellProps = {
            color: template.palette.text,
            fill: {
              color:
                dataRowIdx % 2 === 0 ? template.palette.surface : template.palette.background,
            },
            fontFace: template.typography.bodyFont,
            align: 'center',
            valign: 'middle',
            fontSize: 12,
          };
          return { text: cell, options };
        })
      );

      slide.addTable(tableRows, {
        x: 0.5,
        y: 2.1,
        w: 12.3,
        colW,
        rowH,
        border: { type: 'solid', pt: 0.8, color: template.palette.divider },
      });
      break;
    }
    case 'content-single-column':
    default: {
      addKeyMessageBlock(slide, plan, template);
      if (plan.bullets.length > 0) {
        const bodyFontSize = computeFontSizeForBox({
          text: plan.bullets.join('\n'),
          boxW: 12.1,
          boxH: 3.8,
          minFont: 14,
          maxFont: 32,
          lineHeight: 1.28,
        });
        // Use a computed container size so bullet runs stay readable and within bounds.
        slide.addText(
          makeBulletRuns(plan.bullets, template.palette.text, template.typography.bodyFont),
          { x: 0.65, y: 2.65, w: 12.1, h: 3.8, fontSize: bodyFontSize, valign: 'middle' }
        );
      }
      break;
    }
  }

  if (!hasPrimaryVisual) {
    addFallbackMotif(pptx, slide, template);
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
