#!/usr/bin/env python3
"""
Pack an unpacked Office directory back into a .pptx/.docx/.xlsx file.
"""

import argparse
import zipfile
from pathlib import Path

import defusedxml.minidom


def condense_xml(xml_file: Path) -> None:
    try:
        with xml_file.open(encoding="utf-8") as fh:
            dom = defusedxml.minidom.parse(fh)
        xml_file.write_bytes(dom.toxml(encoding="UTF-8"))
    except Exception:
        return


def pack(input_dir: Path, output_file: Path) -> None:
    if not input_dir.is_dir():
        raise ValueError("Input directory does not exist")
    if output_file.suffix.lower() not in {".docx", ".pptx", ".xlsx"}:
        raise ValueError("Output file must be .docx/.pptx/.xlsx")

    for xml_file in list(input_dir.rglob("*.xml")) + list(input_dir.rglob("*.rels")):
        condense_xml(xml_file)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in input_dir.rglob("*"):
            if file.is_file():
                zf.write(file, file.relative_to(input_dir))

    print(f"Packed {input_dir} -> {output_file}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Pack office files.")
    parser.add_argument("input_directory")
    parser.add_argument("output_file")
    parser.add_argument("--original", required=False)  # compatibility only
    parser.add_argument("--validate", required=False, default="true")
    args = parser.parse_args()

    pack(Path(args.input_directory), Path(args.output_file))


if __name__ == "__main__":
    main()

