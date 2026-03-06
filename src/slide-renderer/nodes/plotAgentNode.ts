import { spawn } from 'node:child_process';
import path from 'node:path';
import type { SlidePlotSpec } from '@/types';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';

const PLOT_SCRIPT_PATH = path.join(process.cwd(), 'src', 'slide-renderer', 'scripts', 'render_plot.py');
const PLOT_TIMEOUT_MS = 16_000;

type PlotRenderResult = {
  dataUri: string;
  engine: string;
};

function buildSeabornCode(spec: SlidePlotSpec): string {
  const labels = JSON.stringify(spec.labels);
  const values = JSON.stringify(spec.values);
  const title = JSON.stringify(spec.title || '');
  const xLabel = JSON.stringify(spec.xLabel || '');
  const yLabel = JSON.stringify(spec.yLabel || '');
  const renderer =
    spec.kind === 'line'
      ? 'sns.lineplot(x=labels, y=values, marker="o", linewidth=2.4, color=accent, ax=ax)'
      : spec.kind === 'scatter'
      ? 'sns.scatterplot(x=labels, y=values, s=90, color=accent, ax=ax)'
      : 'sns.barplot(x=labels, y=values, color=accent, ax=ax)';

  return [
    'import seaborn as sns',
    'import matplotlib.pyplot as plt',
    `labels = ${labels}`,
    `values = ${values}`,
    `title = ${title}`,
    `x_label = ${xLabel}`,
    `y_label = ${yLabel}`,
    "accent = '#2563EB'",
    "sns.set_theme(style='whitegrid')",
    'fig, ax = plt.subplots(figsize=(7.0, 4.2), dpi=180)',
    renderer,
    "if title: ax.set_title(title)",
    "if x_label: ax.set_xlabel(x_label)",
    "if y_label: ax.set_ylabel(y_label)",
    'fig.tight_layout()',
  ].join('\n');
}

function renderPlotWithPython(
  spec: SlidePlotSpec,
  palette: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    divider: string;
  }
): Promise<PlotRenderResult> {
  const payload = JSON.stringify({
    kind: spec.kind,
    title: spec.title || '',
    xLabel: spec.xLabel || '',
    yLabel: spec.yLabel || '',
    labels: spec.labels,
    values: spec.values,
    palette,
  });

  return new Promise((resolve, reject) => {
    const child = spawn('python3', [PLOT_SCRIPT_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Plot renderer timeout'));
    }, PLOT_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', () => {
      clearTimeout(timeout);
      if (!stdout.trim()) {
        reject(new Error(stderr.trim() || 'No plot output'));
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as {
          ok: boolean;
          base64?: string;
          engine?: string;
          error?: string;
        };
        if (!parsed.ok || !parsed.base64) {
          reject(new Error(parsed.error || 'Plot render failed'));
          return;
        }
        resolve({
          dataUri: `data:image/png;base64,${parsed.base64}`,
          engine: parsed.engine || 'unknown',
        });
      } catch (error) {
        reject(
          new Error(
            `Invalid plot renderer response: ${error instanceof Error ? error.message : 'unknown error'}`
          )
        );
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

export async function plotAgentNode(
  state: SlideRenderPipelineState
): Promise<Partial<SlideRenderPipelineState>> {
  const issues: string[] = [...state.qaIssues];

  const updatedPlan = await Promise.all(
    state.renderPlan.map(async (item) => {
      if (item.visualKind !== 'plot' || !item.plotSpec) {
        return { ...item, plot: undefined };
      }

      const code = buildSeabornCode(item.plotSpec);
      try {
        const result = await renderPlotWithPython(item.plotSpec, {
          background: state.template.palette.background,
          surface: state.template.palette.surface,
          text: state.template.palette.text,
          mutedText: state.template.palette.mutedText,
          accent: state.template.palette.accent,
          divider: state.template.palette.divider,
        });

        if (result.engine !== 'seaborn') {
          issues.push(
            `Slide ${item.index}: seaborn not found, matplotlib fallback used.`
          );
        }

        return {
          ...item,
          layout: 'chart-right' as const,
          plot: {
            kind: item.plotSpec.kind,
            dataUri: result.dataUri,
            code,
          },
        };
      } catch (error) {
        issues.push(
          `Slide ${item.index}: plot render failed (${error instanceof Error ? error.message : 'unknown error'}).`
        );
        return item;
      }
    })
  );

  return { renderPlan: updatedPlan, qaIssues: issues };
}
