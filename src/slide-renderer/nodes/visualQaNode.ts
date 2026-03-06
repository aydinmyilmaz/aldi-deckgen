import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';

type Severity = 'critical' | 'minor';

type QaIssue = {
  severity: Severity;
  message: string;
};

function commandExists(cmd: string): boolean {
  const result = spawnSync('bash', ['-lc', `command -v ${cmd}`], { encoding: 'utf8' });
  return result.status === 0;
}

function hasEllipsis(text: string): boolean {
  return /(\.\.\.|…)/.test(text);
}

function estimateDenseTextRisk(layout: string, bullets: string[]): boolean {
  const wordTotal = bullets.reduce((sum, bullet) => sum + bullet.split(/\s+/).filter(Boolean).length, 0);
  if (layout === 'content-single-column') return wordTotal > 52;
  if (layout === 'content-two-column') return wordTotal > 62;
  if (layout === 'chart-right') return wordTotal > 34;
  if (layout === 'card-grid') return wordTotal > 48;
  return wordTotal > 56;
}

function decidePass(issues: QaIssue[], gate: SlideRenderPipelineState['config']['qualityGate']): boolean {
  if (gate === 'strict') return issues.length === 0;
  if (gate === 'fast') return issues.every((issue) => issue.severity !== 'critical');
  return issues.every((issue) => issue.severity !== 'critical');
}

export function visualQaNode(
  state: SlideRenderPipelineState
): Partial<SlideRenderPipelineState> {
  const result = state.result;
  if (!result.base64) return {};

  const issues: QaIssue[] = [];
  const now = Date.now();
  const artifactDir = path.join(tmpdir(), `ppt-generator-qa-${now}`);
  mkdirSync(artifactDir, { recursive: true });

  const pptxPath = path.join(artifactDir, result.fileName || 'deck.pptx');
  writeFileSync(pptxPath, Buffer.from(result.base64, 'base64'));

  const hasSoffice = commandExists('soffice');
  const hasPdftoppm = commandExists('pdftoppm');
  let pdfPath: string | undefined;
  let imageDir: string | undefined;

  if (!hasSoffice || !hasPdftoppm) {
    issues.push({
      severity: state.config.qualityGate === 'strict' ? 'critical' : 'minor',
      message: 'Visual QA tools missing (soffice/pdftoppm); screenshot checks skipped.',
    });
  } else {
    const convertPdf = spawnSync(
      'soffice',
      ['--headless', '--convert-to', 'pdf', '--outdir', artifactDir, pptxPath],
      { encoding: 'utf8' }
    );
    pdfPath = path.join(
      artifactDir,
      `${path.basename(result.fileName || 'deck.pptx', '.pptx')}.pdf`
    );
    if (convertPdf.status !== 0 || !existsSync(pdfPath)) {
      issues.push({
        severity: 'critical',
        message: `PPTX→PDF conversion failed: ${convertPdf.stderr || convertPdf.stdout || 'unknown error'}`,
      });
    } else {
      imageDir = path.join(artifactDir, 'slides');
      mkdirSync(imageDir, { recursive: true });
      const imagePrefix = path.join(imageDir, 'slide');
      const convertImages = spawnSync(
        'pdftoppm',
        ['-png', '-rx', '180', '-ry', '180', pdfPath, imagePrefix],
        { encoding: 'utf8' }
      );
      if (convertImages.status !== 0) {
        issues.push({
          severity: 'critical',
          message: `PDF→PNG conversion failed: ${convertImages.stderr || convertImages.stdout || 'unknown error'}`,
        });
      }
    }
  }

  for (const slide of state.slides) {
    if (hasEllipsis(slide.title)) {
      issues.push({
        severity: 'critical',
        message: `Slide ${slide.index}: title contains ellipsis.`,
      });
    }
    if ((slide.title || '').split(/\s+/).filter(Boolean).length > 8) {
      issues.push({
        severity: 'minor',
        message: `Slide ${slide.index}: title longer than 8 words.`,
      });
    }
  }

  for (const plan of state.renderPlan) {
    if (plan.bullets.some((bullet) => hasEllipsis(bullet))) {
      issues.push({
        severity: 'critical',
        message: `Slide ${plan.index}: bullet contains ellipsis.`,
      });
    }
    if (estimateDenseTextRisk(plan.layout, plan.bullets)) {
      issues.push({
        severity: 'minor',
        message: `Slide ${plan.index}: dense text risk for layout "${plan.layout}".`,
      });
    }
  }

  const qaIssuesFromRender = state.qaIssues.map((message) => {
    const severity: Severity =
      /failed|timeout|error|truncated bullets|contains ellipsis|invalid/i.test(message)
        ? 'critical'
        : 'minor';
    return { severity, message } satisfies QaIssue;
  });
  issues.push(...qaIssuesFromRender);

  const passed = decidePass(issues, state.config.qualityGate);

  return {
    result: {
      ...result,
      qaReport: {
        passed,
        issues: issues.map((issue) => `[${issue.severity}] ${issue.message}`),
        artifactDir,
        scoredSlides: state.slides.length,
      },
      artifacts: {
        ...(pdfPath ? { pdfPath } : {}),
        ...(imageDir ? { imageDir } : {}),
      },
    },
  };
}

