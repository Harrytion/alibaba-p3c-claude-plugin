#!/usr/bin/env bash
# Context injection hook: remind Claude about P3C guidelines
set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if ! grep -q "Alibaba P3C Java Coding Guidelines" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null; then
  exit 0
fi

echo "P3C: 当前项目已启用阿里巴巴 Java 开发规范。编写 Java 代码时请遵循 P3C 规范。使用 /p3c-scan 检查违规。"
