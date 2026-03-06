#!/usr/bin/env python3
"""
Create thumbnail grids from PowerPoint slides for quick visual inspection.
"""

import argparse
import subprocess
import tempfile
from pathlib import Path

from office.soffice import get_soffice_env
from PIL import Image, ImageDraw, ImageFont


def convert_to_images(pptx_path: Path, out_dir: Path) -> list[Path]:
    pdf_path = out_dir / f"{pptx_path.stem}.pdf"
    to_pdf = subprocess.run(
        [
            "soffice",
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(out_dir),
            str(pptx_path),
        ],
        capture_output=True,
        text=True,
        env=get_soffice_env(),
    )
    if to_pdf.returncode != 0 or not pdf_path.exists():
        raise RuntimeError(to_pdf.stderr or "PPTX to PDF conversion failed")

    to_images = subprocess.run(
        [
            "pdftoppm",
            "-jpeg",
            "-r",
            "130",
            str(pdf_path),
            str(out_dir / "slide"),
        ],
        capture_output=True,
        text=True,
    )
    if to_images.returncode != 0:
        raise RuntimeError(to_images.stderr or "PDF to image conversion failed")
    return sorted(out_dir.glob("slide-*.jpg"))


def create_grid(images: list[Path], output: Path, cols: int) -> None:
    if not images:
        raise RuntimeError("No slide images found")

    with Image.open(images[0]) as sample:
        thumb_w = 320
        thumb_h = int(sample.height * (thumb_w / sample.width))

    rows = (len(images) + cols - 1) // cols
    padding = 20
    label_h = 26
    grid_w = cols * thumb_w + (cols + 1) * padding
    grid_h = rows * (thumb_h + label_h) + (rows + 1) * padding

    grid = Image.new("RGB", (grid_w, grid_h), "white")
    draw = ImageDraw.Draw(grid)
    font = ImageFont.load_default()

    for i, img_path in enumerate(images):
        row = i // cols
        col = i % cols
        x = padding + col * (thumb_w + padding)
        y = padding + row * (thumb_h + label_h + padding)
        with Image.open(img_path) as image:
            thumb = image.resize((thumb_w, thumb_h))
            grid.paste(thumb, (x, y))
        label = f"slide {i + 1}"
        draw.text((x + 4, y + thumb_h + 4), label, fill="black", font=font)

    output.parent.mkdir(parents=True, exist_ok=True)
    grid.save(output, quality=95)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create PPTX thumbnail grid.")
    parser.add_argument("input", help="Input .pptx file")
    parser.add_argument("output_prefix", nargs="?", default="thumbnails")
    parser.add_argument("--cols", type=int, default=3)
    args = parser.parse_args()

    input_path = Path(args.input)
    if input_path.suffix.lower() != ".pptx" or not input_path.exists():
        raise SystemExit("Input must be an existing .pptx file")

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        images = convert_to_images(input_path, temp_path)
        output = Path(f"{args.output_prefix}.jpg")
        create_grid(images, output, max(1, min(6, args.cols)))
        print(output)


if __name__ == "__main__":
    main()

