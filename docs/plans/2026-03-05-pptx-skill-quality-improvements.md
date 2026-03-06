# PPTX Skill Quality Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the Anthropic PPTX skill's design principles into the slide renderer to produce professional, visually rich PowerPoint files.

**Architecture:** Four independent improvement layers applied to the existing `src/slide-renderer/` pipeline: (1) fix a critical PptxGenJS misuse bug, (2) expand layout variety with new slide layout types, (3) improve per-slide-type specialized rendering, (4) improve chart styling. No new external dependencies required — all changes are within existing files.

**Tech Stack:** PptxGenJS (already installed), LangGraph (already wired), TypeScript

**Branch:** `ppt-dev-imprvements` (already checked out as detached HEAD — create a local tracking branch with `git switch -c ppt-dev-imprvements`)

---

## Background — What the PPTX Skill Teaches Us

After reading `SKILL.md`, `pptxgenjs.md`, and `editing.md` from `https://github.com/anthropics/skills/tree/main/skills/pptx`, the following concrete issues were found in our codebase:

| # | Issue | File | Skill Rule Violated |
|---|-------|------|---------------------|
| 1 | `bulletsToText()` prepends `•` manually, then adds the whole string as a single `addText()` call | `pptxBuilder.ts:7-8` | "Never use unicode bullets like • as this creates duplicates" |
| 2 | All bullet content is concatenated into one string — no line-height, no per-bullet font control | `pptxBuilder.ts:244,295,335` | "Create separate `<a:p>` elements for multi-item content—never concatenate into one paragraph" |
| 3 | Only 5 layout kinds — no `full-bleed-image`, `quote-callout`, `agenda-list`, `section-divider` | `types/render.ts:48-53` | "Layout variety: Mix columns, cards, and callouts across slides" |
| 4 | `agenda`, `qna`, `references` slide types have no specialized visual treatment | `planning.ts:56-64` | "Every slide needs images, charts, icons, or shapes" |
| 5 | Charts have no data labels; chart colors are partially hardcoded strings | `pptxBuilder.ts:193-217` | "Apply modern styling through color schemes... and data labels for professional appearance" |
| 6 | Body font size is 17-22pt for most slides — consistent but could use per-layout tuning | `pptxBuilder.ts:249,286,294,334` | "14-16pt for body text" |

---

## Task 1: Fix native bullets (critical PptxGenJS bug)

**Files:**
- Modify: `src/slide-renderer/pptxBuilder.ts`

**Context:**
The current `bulletsToText()` helper joins bullets with `\n• ` and passes the whole string to `addText()`. PptxGenJS natively supports bullet arrays via `addText(runs[], options)` where each run has `{ text, options: { bullet: true, breakLine: true } }`. The unicode prefix creates visual duplication when using the native bullet character and prevents per-bullet styling.

**Step 1: Write the failing test (manual verification)**

No automated test suite exists — verify by running the app and inspecting a generated PPTX. The visual symptom of the bug: opening a generated PPTX shows bullets like `• • First item` (double bullets).

**Step 2: Delete `bulletsToText` and add `makeBulletRuns`**

In `src/slide-renderer/pptxBuilder.ts`, replace lines 7-8:

```ts
// DELETE THIS:
function bulletsToText(bullets: string[]): string {
  return bullets.map((bullet) => `• ${bullet}`).join('\n');
}

// ADD THIS — fontSize goes on the container, NOT per-run, so fit:'shrink' works correctly:
function makeBulletRuns(
  bullets: string[],
  color: string,
  fontFace: string
): PptxGenJS.TextProps[] {
  return bullets.map((text, i) => ({
    text,
    options: {
      bullet: { type: 'bullet' },
      color,
      fontFace,
      breakLine: i < bullets.length - 1,
    },
  }));
}
```

> **Why fontSize is on the container:** When `fit: 'shrink'` is set on the text box, PptxGenJS scales
> the font size uniformly. If per-run `fontSize` values are set they can conflict with the shrink
> calculation. Keeping `fontSize` on the container opts is the safe pattern.

**Step 3: Update `renderSlideByLayout` to use `makeBulletRuns`**

In `renderSlideByLayout`, replace every `bulletsToText(...)` call. The signature of `addText` accepts `TextProps[]` as the first argument when using per-run formatting. **Always guard against empty arrays** — `addText([])` produces an invisible empty box which is harmless but wasteful.

Replace the `title-focus` bullets block (around line 229):
```ts
// BEFORE:
slide.addText(bulletsToText(plan.bullets.slice(0, 4)), {
  x: 1.2, y: 3.0, w: 10.9, h: 2.8,
  fontFace: template.typography.bodyFont,
  fontSize: 22,
  color: template.palette.text,
  valign: 'top',
});

// AFTER (guard is already there in existing code — keep it):
if (plan.bullets.length > 0) {
  slide.addText(
    makeBulletRuns(plan.bullets.slice(0, 4), template.palette.text, template.typography.bodyFont),
    { x: 1.2, y: 3.0, w: 10.9, h: 2.8, fontSize: 20, valign: 'top' }
  );
}
```

Replace the `chart-right` bullets block (around line 244):
```ts
// BEFORE:
slide.addText(bulletsToText(plan.bullets), {
  x: 0.6, y: 2.65, w: 6.25, h: 3.75,
  fontFace: template.typography.bodyFont,
  fontSize: 17,
  color: template.palette.text,
  fit: 'shrink',
});

// AFTER — add empty-array guard (missing in original):
if (plan.bullets.length > 0) {
  slide.addText(
    makeBulletRuns(plan.bullets, template.palette.text, template.typography.bodyFont),
    { x: 0.6, y: 2.65, w: 6.25, h: 3.75, fontSize: 15, fit: 'shrink' }
  );
}
```

Replace the `content-two-column` left/right blocks (around lines 285-300):
```ts
// BEFORE (left):
slide.addText(bulletsToText(left), {
  x: 0.65, y: 2.65, w: 5.9, h: 3.7,
  fontFace: template.typography.bodyFont,
  fontSize: 17,
  color: template.palette.text,
  fit: 'shrink',
});
// BEFORE (right):
slide.addText(bulletsToText(right), {
  x: 6.85, y: 2.65, w: 5.9, h: 3.7,
  fontFace: template.typography.bodyFont,
  fontSize: 17,
  color: template.palette.text,
  fit: 'shrink',
});

// AFTER — guard both columns (right column can be empty if odd number of bullets):
if (left.length > 0) {
  slide.addText(
    makeBulletRuns(left, template.palette.text, template.typography.bodyFont),
    { x: 0.65, y: 2.65, w: 5.9, h: 3.7, fontSize: 15, fit: 'shrink' }
  );
}
if (right.length > 0) {
  slide.addText(
    makeBulletRuns(right, template.palette.text, template.typography.bodyFont),
    { x: 6.85, y: 2.65, w: 5.9, h: 3.7, fontSize: 15, fit: 'shrink' }
  );
}
```

Replace the `content-single-column` block (around line 334):
```ts
// BEFORE:
slide.addText(bulletsToText(plan.bullets), {
  x: 0.65, y: 2.65, w: 12.1, h: 3.8,
  fontFace: template.typography.bodyFont,
  fontSize: 18,
  color: template.palette.text,
  fit: 'shrink',
});

// AFTER — add empty-array guard (missing in original):
if (plan.bullets.length > 0) {
  slide.addText(
    makeBulletRuns(plan.bullets, template.palette.text, template.typography.bodyFont),
    { x: 0.65, y: 2.65, w: 12.1, h: 3.8, fontSize: 16, fit: 'shrink' }
  );
}
```

Replace the `conclusion-focus` block (around line 317) — keep plain string, no bullet runs:
```ts
// BEFORE:
const conclusionText = plan.bullets.length > 0 ? bulletsToText(plan.bullets) : plan.keyMessage;
slide.addText(conclusionText, {
  x: 1.25, y: 3.15, w: 10.8, h: 1.9,
  align: 'center', valign: 'middle',
  fontFace: template.typography.bodyFont,
  fontSize: 20,
  color: template.palette.text,
  fit: 'shrink',
});

// AFTER — plain join (conclusion is a statement, not a list):
const conclusionText = plan.bullets.length > 0
  ? plan.bullets.join('\n')
  : (plan.keyMessage || '');
if (conclusionText) {
  slide.addText(conclusionText, {
    x: 1.25, y: 3.15, w: 10.8, h: 1.9,
    align: 'center', valign: 'middle',
    fontFace: template.typography.bodyFont,
    fontSize: 20,
    color: template.palette.text,
    fit: 'shrink',
  });
}
```

**Step 4: Verify**

Generate a test presentation. Open the `.pptx` file. Bullets should show as single-character bullets (one `•` per item), each on its own line, without the unicode doubling artifact.

**Step 5: Commit**
```bash
git add src/slide-renderer/pptxBuilder.ts
git commit -m "fix: replace unicode bullet string concat with native PptxGenJS bullet runs"
```

---

## Task 2: Add `agenda-list` and `quote-callout` layout types

**Files:**
- Modify: `src/types/render.ts`
- Modify: `src/slide-renderer/planning.ts`
- Modify: `src/slide-renderer/pptxBuilder.ts`

**Context:**
The PPTX skill calls out "layout variety: Mix columns, cards, and callouts across slides." Currently `agenda` slides get `content-single-column` (generic bullets). A proper agenda layout uses numbered boxes. `quote-callout` is missing entirely and is perfect for `background`, `solution`, and `conclusion` slides with a strong `keyMessage`.

### Step 1: Add types to `src/types/render.ts`

Modify `RenderLayoutKind` (line 48):
```ts
// BEFORE:
export type RenderLayoutKind =
  | 'title-focus'
  | 'content-single-column'
  | 'content-two-column'
  | 'chart-right'
  | 'conclusion-focus';

// AFTER:
export type RenderLayoutKind =
  | 'title-focus'
  | 'content-single-column'
  | 'content-two-column'
  | 'chart-right'
  | 'conclusion-focus'
  | 'agenda-list'
  | 'quote-callout';
```

### Step 2: Wire layout selection in `src/slide-renderer/planning.ts`

Update `chooseLayout` (lines 56-64):
```ts
function chooseLayout(slide: SlideOutline, hasChart: boolean): RenderLayoutKind {
  if (slide.slideType === 'title') return 'title-focus';
  if (slide.slideType === 'agenda') return 'agenda-list';
  if (slide.slideType === 'conclusion' || slide.slideType === 'qna') return 'conclusion-focus';
  if (slide.slideType === 'background' || slide.slideType === 'solution') {
    // quote-callout when there's a strong keyMessage and few bullets
    if (slide.keyMessage && (slide.bullets?.length ?? 0) <= 3) return 'quote-callout';
  }
  if (hasChart || slide.slideType === 'findings' || /chart|graph|trend|distribution|breakdown/i.test(slide.visualSuggestion ?? '')) {
    return 'chart-right';
  }
  if (slide.bullets.length >= 4) return 'content-two-column';
  return 'content-single-column';
}
```

### Step 3: Implement `agenda-list` renderer in `pptxBuilder.ts`

Add a new case to the `renderSlideByLayout` switch (before the `default` case):

```ts
case 'agenda-list': {
  // Render each bullet as a numbered card box
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

    // number badge
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
    slide.addText(item, {
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
```

### Step 4: Implement `quote-callout` renderer in `pptxBuilder.ts`

Add case right after `agenda-list`:

```ts
case 'quote-callout': {
  // Large accent bar left + big quote in the center + bullets below
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.72,
    w: 0.22,
    h: 2.1,
    line: { color: template.palette.accent, pt: 0 },
    fill: { color: template.palette.accent },
  });

  slide.addText(plan.keyMessage || plan.bullets[0] || '', {
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

  const supportingBullets = plan.keyMessage ? plan.bullets : plan.bullets.slice(1);
  if (supportingBullets.length > 0) {
    slide.addText(
      makeBulletRuns(supportingBullets, template.palette.mutedText, template.typography.bodyFont),
      { x: 0.9, y: 4.1, w: 11.9, h: 2.8, fontSize: 15, fit: 'shrink' }
    );
  }
  break;
}
```

### Step 5: Verify visually

Generate a presentation that includes an `agenda` slide and a `solution` or `background` slide. Check that:
- Agenda shows numbered card items
- Solution/background with short bullets shows a large italic quote with left accent bar

### Step 6: Commit
```bash
git add src/types/render.ts src/slide-renderer/planning.ts src/slide-renderer/pptxBuilder.ts
git commit -m "feat: add agenda-list and quote-callout layout types for richer slide variety"
```

---

## Task 3: Improve chart styling with data labels and cleaner aesthetics

**Files:**
- Modify: `src/slide-renderer/pptxBuilder.ts`

**Context:**
The PPTX skill says: "Apply modern styling through color schemes, grid customization, and data labels for professional appearance." Currently, charts have no data labels, a generic 5-color array with hardcoded values, and no axis formatting.

### Step 1: Rewrite `addChartIfAvailable` in `pptxBuilder.ts` (lines 183-217)

```ts
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
```

### Step 2: Verify

Generate a presentation containing a `findings` slide with numeric data (e.g., `"Market share: 45%"`, `"Growth rate: 32%"`, `"Retention: 78%"` as bullets). Open the PPTX and confirm:
- Data labels appear on the bars/pie segments
- Grid lines are gone (clean look)
- Axis labels use the template muted text color

### Step 3: Commit
```bash
git add src/slide-renderer/pptxBuilder.ts
git commit -m "feat: improve chart styling with data labels, no grid lines, and theme-aware axis colors"
```

---

## Task 4: Add slide-type decorative accents (visual richness per slide type)

**Files:**
- Modify: `src/slide-renderer/pptxBuilder.ts`

**Context:**
The PPTX skill says "Every slide needs images, charts, icons, or shapes." Currently, slides that have no image and no chart are entirely text-only except for the header bar and optional keyMessage block. Adding a simple decorative shape per slide type (a colored corner triangle, a large muted number, a divider line) costs zero external dependencies and immediately lifts visual quality.

### Step 1: Add `addSlideTypeAccent` helper after `addKeyMessageBlock`

```ts
function addSlideTypeAccent(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  plan: SlideRenderPlan,
  template: DeckTemplate
): void {
  switch (plan.slideType) {
    case 'problem':
    case 'findings': {
      // Bottom-right corner accent triangle (triangle pointing to data)
      slide.addShape(pptx.ShapeType.rtTriangle, {
        x: 11.8,
        y: 5.8,
        w: 1.55,
        h: 1.7,
        line: { color: template.palette.accent, pt: 0, transparency: 100 },
        fill: { color: template.palette.accentSoft, transparency: 30 },
      });
      break;
    }
    case 'solution':
    case 'benefits': {
      // Subtle check mark circle in top-right
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
      // Horizontal step divider line near top of content area
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
      // Muted large quotation mark behind content
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
```

### Step 2: Call `addSlideTypeAccent` inside `applySlideShell` after the existing accent bar

In `applySlideShell`, after the `addText(title, ...)` call (around line 75):

```ts
// existing: slide.addText(title, { ... });
addSlideTypeAccent(pptx, slide, plan, template);
return slide;
```

Note: `pptx` is already available in `applySlideShell`'s scope.

### Step 3: Verify

Generate a presentation with `problem`, `solution`, `implementation`, and `references` slides. Open the PPTX and confirm each has a small decorative shape that doesn't overlap content areas.

### Step 4: Commit
```bash
git add src/slide-renderer/pptxBuilder.ts
git commit -m "feat: add per-slide-type decorative accents for visual richness"
```

---

## Task 5: QA node — render plan self-check before building PPTX

**Files:**
- Create: `src/slide-renderer/nodes/renderQaNode.ts`
- Modify: `src/slide-renderer/graph.ts`
- Modify: `src/slide-renderer/state.ts`

**Context:**
The PPTX skill requires: "Assume problems exist. Use subagents to inspect converted slide images for overlapping elements, text overflow, low contrast, placeholder text remnants. Complete at least one fix-and-verify cycle before declaring success."

We cannot render and inspect images server-side easily. Instead, we implement a lightweight LLM-based pre-flight check: an LLM reviews the final `renderPlan[]` JSON and flags slides where content is likely to overflow (e.g., 10+ bullets assigned to `content-single-column`, or `keyMessage` > 15 words) and auto-corrects them.

### Step 1: Add `qaIssues` field to render state

In `src/slide-renderer/state.ts`, add to the `SlideRenderState` Annotation:

```ts
// existing fields stay unchanged; add:
qaIssues: Annotation<string[]>({
  reducer: (_, next) => next,
  default: () => [],
}),
```

Also add `qaIssues: string[]` to the `SlideRenderPipelineState` interface.

### Step 2: Create `src/slide-renderer/nodes/renderQaNode.ts`

```ts
import type { SlideRenderPipelineState } from '@/slide-renderer/state';
import type { SlideRenderPlan } from '@/types/render';

const MAX_BULLETS_SINGLE_COL = 6;
const MAX_BULLETS_TWO_COL = 10;
const MAX_BULLETS_CHART_RIGHT = 5;
const MAX_KEY_MESSAGE_WORDS = 18;

function truncateBullets(plan: SlideRenderPlan): SlideRenderPlan {
  const maxBullets =
    plan.layout === 'content-single-column' ? MAX_BULLETS_SINGLE_COL :
    plan.layout === 'content-two-column' ? MAX_BULLETS_TWO_COL :
    plan.layout === 'chart-right' ? MAX_BULLETS_CHART_RIGHT :
    plan.layout === 'agenda-list' ? 8 :
    4;

  if (plan.bullets.length <= maxBullets) return plan;
  return { ...plan, bullets: plan.bullets.slice(0, maxBullets) };
}

function truncateKeyMessage(plan: SlideRenderPlan): SlideRenderPlan {
  if (!plan.keyMessage) return plan;
  const words = plan.keyMessage.split(' ');
  if (words.length <= MAX_KEY_MESSAGE_WORDS) return plan;
  return { ...plan, keyMessage: words.slice(0, MAX_KEY_MESSAGE_WORDS).join(' ') + '.' };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // bold
    .replace(/\*(.*?)\*/g, '$1')       // italic
    .replace(/`(.*?)`/g, '$1')         // inline code
    .replace(/#+\s/g, '');             // headings
}

function sanitizeBullets(plan: SlideRenderPlan): SlideRenderPlan {
  const cleaned = plan.bullets.map(stripMarkdown);
  if (cleaned.every((b, i) => b === plan.bullets[i])) return plan;
  return { ...plan, bullets: cleaned };
}

export function renderQaNode(
  state: SlideRenderPipelineState
): Partial<SlideRenderPipelineState> {
  const issues: string[] = [];
  const fixedPlan = state.renderPlan.map((plan) => {
    let fixed = plan;
    const slideLabel = `Slide ${plan.index} (${plan.slideType})`;

    const originalBulletCount = fixed.bullets.length;
    fixed = truncateBullets(fixed);
    if (fixed.bullets.length < originalBulletCount) {
      issues.push(`${slideLabel}: truncated bullets from ${originalBulletCount} to ${fixed.bullets.length} for layout "${fixed.layout}"`);
    }

    const originalKm = fixed.keyMessage;
    fixed = truncateKeyMessage(fixed);
    if (fixed.keyMessage !== originalKm) {
      issues.push(`${slideLabel}: keyMessage exceeded ${MAX_KEY_MESSAGE_WORDS} words, truncated`);
    }

    const preMarkdown = fixed.bullets.slice();
    fixed = sanitizeBullets(fixed);
    const markdownStripped = fixed.bullets.some((b, i) => b !== preMarkdown[i]);
    if (markdownStripped) {
      issues.push(`${slideLabel}: stripped markdown formatting from bullets`);
    }

    return fixed;
  });

  return {
    renderPlan: fixedPlan,
    qaIssues: issues,
  };
}
```

### Step 3: Wire into `src/slide-renderer/graph.ts`

```ts
// ADD import:
import { renderQaNode } from '@/slide-renderer/nodes/renderQaNode';

// ADD node and edge between imageSearch and composeDeck:
const workflow = new StateGraph(SlideRenderState)
  .addNode('resolveTemplate', templateResolverNode)
  .addNode('planLayout', layoutPlannerNode)
  .addNode('planCharts', chartPlannerNode)
  .addNode('searchImages', imageSearchNode)
  .addNode('renderQa', renderQaNode)        // NEW
  .addNode('composeDeck', deckComposerNode)
  .addEdge('__start__', 'resolveTemplate')
  .addEdge('resolveTemplate', 'planLayout')
  .addEdge('planLayout', 'planCharts')
  .addEdge('planCharts', 'searchImages')
  .addEdge('searchImages', 'renderQa')      // NEW
  .addEdge('renderQa', 'composeDeck')       // CHANGED from searchImages
  .addEdge('composeDeck', '__end__');
```

### Step 4: Expose QA issues in API response (optional visibility)

In `src/app/api/render/route.ts`, if the result includes `qaIssues`, add them to the response JSON so the frontend can optionally show them:

Read the file first to understand its current structure, then add `qaIssues` to the returned JSON if `state.qaIssues?.length > 0`.

### Step 5: Verify

Generate a presentation where a slide has 8+ bullets. Confirm:
- The output PPTX has at most 6 bullets on single-column slides
- If `console.log` is added to the node temporarily, issues array is populated

### Step 6: Commit
```bash
git add src/slide-renderer/nodes/renderQaNode.ts src/slide-renderer/graph.ts src/slide-renderer/state.ts
git commit -m "feat: add renderQaNode pre-flight check to auto-fix bullet overflow and markdown artifacts"
```

---

## Task 6: Improve title slide visual impact

**Files:**
- Modify: `src/slide-renderer/pptxBuilder.ts`

**Context:**
The PPTX skill emphasizes "36pt+ for titles." The title slide currently has 40pt title (good) but a weak subtitle area. The `title-focus` layout should display org/date metadata as styled sub-elements, not just bullets.

### Step 1: Add metadata block to `title-focus` case in `renderSlideByLayout`

In the `title-focus` case (around line 226), after `addKeyMessageBlock`:

```ts
case 'title-focus': {
  addKeyMessageBlock(slide, plan, template);

  // Decorative separator line below keyMessage
  slide.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 2.55,
    w: 4.0,
    h: 0,
    line: { color: template.palette.accent, pt: 1.5 },
  });

  if (plan.bullets.length > 0) {
    slide.addText(
      makeBulletRuns(plan.bullets.slice(0, 4), template.palette.text, template.typography.bodyFont),
      { x: 1.2, y: 3.0, w: 10.9, h: 2.8, fontSize: 20, valign: 'top' }
    );
  }

  // Speaker notes preview as subtitle (only if no bullets)
  if (plan.bullets.length === 0 && plan.speakerNotes) {
    slide.addText(plan.speakerNotes, {
      x: 1.2,
      y: 3.1,
      w: 10.9,
      h: 1.8,
      fontFace: template.typography.bodyFont,
      fontSize: 18,
      color: template.palette.mutedText,
      italic: true,
      fit: 'shrink',
    });
  }
  break;
}
```

### Step 2: Commit
```bash
git add src/slide-renderer/pptxBuilder.ts
git commit -m "feat: enhance title slide with accent separator line and speaker notes subtitle fallback"
```

---

## Summary of Changes

| Task | File(s) | What Changes |
|------|---------|--------------|
| 1 | `pptxBuilder.ts` | Replace unicode bullet concat with native PptxGenJS bullet runs |
| 2 | `types/render.ts`, `planning.ts`, `pptxBuilder.ts` | Add `agenda-list` + `quote-callout` layouts |
| 3 | `pptxBuilder.ts` | Chart data labels, clean grid, theme-aware axis |
| 4 | `pptxBuilder.ts` | Per-slide-type decorative accent shapes |
| 5 | `renderQaNode.ts`, `graph.ts`, `state.ts` | Pre-flight QA: auto-truncate overflow bullets, strip markdown |
| 6 | `pptxBuilder.ts` | Title slide separator line + speaker notes subtitle |

Each task is independently committable and delivers visible quality improvement on its own.
