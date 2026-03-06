#!/usr/bin/env bash
set -euo pipefail

echo "Checking PPTX QA tooling..."

missing=0

check_cmd() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "  [ok] $cmd: $(command -v "$cmd")"
  else
    echo "  [missing] $cmd"
    missing=$((missing + 1))
  fi
}

check_py_module() {
  local mod="$1"
  if python3 -c "import ${mod}" >/dev/null 2>&1; then
    echo "  [ok] python module: ${mod}"
  else
    echo "  [missing] python module: ${mod}"
    missing=$((missing + 1))
  fi
}

check_cmd python3
check_cmd soffice
check_cmd pdftoppm
check_cmd gcc

check_py_module defusedxml
check_py_module PIL
check_py_module markitdown

if [[ "$missing" -gt 0 ]]; then
  echo "Missing ${missing} requirement(s)."
  echo "Install python deps with: pip install -r requirements-pptx-qa.txt"
  exit 1
fi

echo "All PPTX QA tools are available."
