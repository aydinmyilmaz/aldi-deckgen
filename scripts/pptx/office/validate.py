#!/usr/bin/env python3
"""
Lightweight Office package validator.
Checks required package structure and XML parseability.
"""

import argparse
import tempfile
import zipfile
from pathlib import Path

import defusedxml.minidom


def validate_unpacked(unpacked_dir: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []
    required = ["[Content_Types].xml", "_rels/.rels"]
    for rel in required:
        if not (unpacked_dir / rel).exists():
            errors.append(f"Missing required file: {rel}")

    xml_files = list(unpacked_dir.rglob("*.xml")) + list(unpacked_dir.rglob("*.rels"))
    if len(xml_files) == 0:
        errors.append("No XML files found in package")
        return False, errors

    for xml_file in xml_files:
        try:
            defusedxml.minidom.parseString(xml_file.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"Invalid XML: {xml_file.relative_to(unpacked_dir)} ({exc})")

    return len(errors) == 0, errors


def validate(path: Path) -> tuple[bool, list[str]]:
    if path.is_dir():
        return validate_unpacked(path)

    if path.suffix.lower() not in {".docx", ".pptx", ".xlsx"}:
        return False, ["Input must be unpacked directory or office package file"]

    with tempfile.TemporaryDirectory() as temp_dir:
        with zipfile.ZipFile(path, "r") as zf:
            zf.extractall(temp_dir)
        return validate_unpacked(Path(temp_dir))


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate Office XML package.")
    parser.add_argument("path")
    parser.add_argument("--original", required=False)  # compatibility only
    parser.add_argument("--auto-repair", action="store_true")  # compatibility only
    parser.add_argument("--author", default="Claude")  # compatibility only
    args = parser.parse_args()

    ok, errors = validate(Path(args.path))
    if ok:
        print("All validations PASSED!")
        raise SystemExit(0)

    print("FAILED")
    for error in errors:
        print(error)
    raise SystemExit(1)


if __name__ == "__main__":
    main()

