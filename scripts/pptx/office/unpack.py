#!/usr/bin/env python3
"""
Unpack Office files (DOCX/PPTX/XLSX) and pretty-print XML.
"""

import argparse
import zipfile
from pathlib import Path

import defusedxml.minidom


def pretty_print_xml(xml_file: Path) -> None:
    try:
        content = xml_file.read_text(encoding="utf-8")
        dom = defusedxml.minidom.parseString(content)
        xml_file.write_bytes(dom.toprettyxml(indent="  ", encoding="utf-8"))
    except Exception:
        return


def unpack(input_file: Path, output_dir: Path) -> None:
    if input_file.suffix.lower() not in {".docx", ".pptx", ".xlsx"}:
        raise ValueError("Input must be .docx/.pptx/.xlsx")

    output_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(input_file, "r") as zf:
        zf.extractall(output_dir)

    xml_files = list(output_dir.rglob("*.xml")) + list(output_dir.rglob("*.rels"))
    for xml_file in xml_files:
        pretty_print_xml(xml_file)

    print(f"Unpacked {input_file} ({len(xml_files)} XML files)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Unpack office files for editing.")
    parser.add_argument("input_file")
    parser.add_argument("output_directory")
    args = parser.parse_args()

    unpack(Path(args.input_file), Path(args.output_directory))


if __name__ == "__main__":
    main()

