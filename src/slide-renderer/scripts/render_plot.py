#!/usr/bin/env python3
import base64
import io
import json
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402


def _hex_color(value: str, fallback: str) -> str:
    if not value:
        return fallback
    cleaned = value.strip().lstrip("#")
    if len(cleaned) not in (3, 6):
        return fallback
    for ch in cleaned:
        if ch.lower() not in "0123456789abcdef":
            return fallback
    if len(cleaned) == 3:
        cleaned = "".join(ch * 2 for ch in cleaned)
    return f"#{cleaned}"


def _as_float_list(values):
    out = []
    for value in values:
        try:
            out.append(float(value))
        except Exception:
            pass
    return out


def _write_response(payload):
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def main():
    raw = sys.stdin.read().strip()
    if not raw:
        _write_response({"ok": False, "error": "empty_input"})
        return

    try:
        payload = json.loads(raw)
    except Exception:
        _write_response({"ok": False, "error": "invalid_json"})
        return

    kind = str(payload.get("kind", "")).strip().lower()
    labels = [str(item).strip() for item in payload.get("labels", []) if str(item).strip()]
    values = _as_float_list(payload.get("values", []))
    if kind not in {"bar", "line", "scatter"}:
        _write_response({"ok": False, "error": "unsupported_kind"})
        return
    if len(labels) < 2 or len(values) < 2 or len(labels) != len(values):
        _write_response({"ok": False, "error": "invalid_series"})
        return

    palette = payload.get("palette", {}) if isinstance(payload.get("palette"), dict) else {}
    color_background = _hex_color(str(palette.get("background", "")), "#F5F7FA")
    color_surface = _hex_color(str(palette.get("surface", "")), "#FFFFFF")
    color_text = _hex_color(str(palette.get("text", "")), "#1E293B")
    color_muted = _hex_color(str(palette.get("mutedText", "")), "#64748B")
    color_accent = _hex_color(str(palette.get("accent", "")), "#2563EB")
    color_divider = _hex_color(str(palette.get("divider", "")), "#CBD5E1")

    engine = "seaborn"
    sns = None
    try:
        import seaborn as sns  # type: ignore
    except Exception:
        engine = "matplotlib"

    if sns:
        sns.set_theme(style="whitegrid")

    fig, ax = plt.subplots(figsize=(7.0, 4.2), dpi=180)
    fig.patch.set_facecolor(color_background)
    ax.set_facecolor(color_surface)

    if kind == "bar":
        if sns:
            sns.barplot(x=labels, y=values, ax=ax, color=color_accent, edgecolor=color_divider)
        else:
            ax.bar(labels, values, color=color_accent, edgecolor=color_divider, linewidth=0.8)
    elif kind == "line":
        if sns:
            sns.lineplot(x=labels, y=values, ax=ax, marker="o", linewidth=2.4, color=color_accent)
        else:
            ax.plot(labels, values, marker="o", linewidth=2.4, color=color_accent)
    elif kind == "scatter":
        if sns:
            sns.scatterplot(x=labels, y=values, ax=ax, s=90, color=color_accent)
        else:
            ax.scatter(labels, values, s=90, color=color_accent)

    title = str(payload.get("title", "")).strip()
    if title:
        ax.set_title(title, fontsize=13, color=color_text, pad=12, fontweight="bold")

    x_label = str(payload.get("xLabel", "")).strip()
    y_label = str(payload.get("yLabel", "")).strip()
    if x_label:
        ax.set_xlabel(x_label, fontsize=10, color=color_muted, labelpad=8)
    if y_label:
        ax.set_ylabel(y_label, fontsize=10, color=color_muted, labelpad=8)

    ax.tick_params(axis="x", colors=color_muted, labelsize=9)
    ax.tick_params(axis="y", colors=color_muted, labelsize=9)
    if max(len(label) for label in labels) > 12 or len(labels) > 5:
        plt.setp(ax.get_xticklabels(), rotation=20, ha="right")

    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.spines["left"].set_color(color_divider)
    ax.spines["bottom"].set_color(color_divider)
    ax.grid(axis="y", color=color_divider, alpha=0.35, linewidth=0.8)

    fig.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png")
    plt.close(fig)

    image_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
    _write_response({"ok": True, "base64": image_b64, "engine": engine})


if __name__ == "__main__":
    main()
