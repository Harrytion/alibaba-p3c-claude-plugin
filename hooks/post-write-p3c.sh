#!/usr/bin/env bash
# Post-Write hook: scan Java file after Claude writes it
set -euo pipefail

FILE_PATH="${1:-}"

# Only process Java files
if [[ "$FILE_PATH" != *.java ]]; then
  exit 0
fi

# Check if P3C is initialized (CLAUDE.md has P3C section)
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if ! grep -q "Alibaba P3C Java Coding Guidelines" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null; then
  exit 0
fi

echo "P3C: Java file written — consider running p3c-scan on $FILE_PATH to check for violations"
