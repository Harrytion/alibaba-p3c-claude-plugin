#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== 阿里巴巴 P3C Claude Code 插件安装 ==="
echo ""

# 1. Download P3C PMD JAR
echo "[1/4] 下载 P3C PMD JAR..."
bash "$SCRIPT_DIR/download-pmd.sh"

# 2. Build the MCP server
echo "[2/4] 构建 MCP Server..."
cd "$PROJECT_DIR"
npm run build

# 3. Configure Claude Code settings
echo "[3/4] 配置 Claude Code settings.json..."
SETTINGS_FILE="$HOME/.claude/settings.json"

if [ ! -f "$SETTINGS_FILE" ]; then
  mkdir -p "$(dirname "$SETTINGS_FILE")"
  echo '{}' > "$SETTINGS_FILE"
fi

# Check if already configured
if grep -q '"alibaba-p3c"' "$SETTINGS_FILE" 2>/dev/null; then
  echo "  MCP server already configured in settings.json"
else
  echo "  Adding MCP server to settings.json..."
  node -e "
    const fs = require('fs');
    const path = '$SETTINGS_FILE'.replace('$HOME', process.env.HOME);
    const settings = JSON.parse(fs.readFileSync(path, 'utf-8'));
    if (!settings.mcpServers) settings.mcpServers = {};
    settings.mcpServers['alibaba-p3c'] = {
      command: 'node',
      args: ['$PROJECT_DIR/dist/index.js'],
      env: {}
    };
    fs.writeFileSync(path, JSON.stringify(settings, null, 2));
    console.log('  ✅ MCP server added');
  "
fi

# 4. Copy skills and agents
echo "[4/4] 安装 Skills 和 Agents..."
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
AGENTS_DIR="$CLAUDE_DIR/agents"

mkdir -p "$SKILLS_DIR" "$AGENTS_DIR"

for skill in "$PROJECT_DIR"/skills/*.md; do
  cp "$skill" "$SKILLS_DIR/"
  echo "  ✅ $(basename "$skill")"
done

for agent in "$PROJECT_DIR"/agents/*.md; do
  cp "$agent" "$AGENTS_DIR/"
  echo "  ✅ $(basename "$agent")"
done

echo ""
echo "=== 安装完成！==="
echo ""
echo "使用方式："
echo "  1. 在 Java 项目中运行 /p3c-init 初始化插件"
echo "  2. 使用 /p3c-scan 扫描代码"
echo "  3. 使用 /p3c-review 审查变更"
echo "  4. 使用 /p3c-fix 自动修复违规"
echo "  5. 使用 /p3c-learn 交互式学习规则"
echo ""
echo "如需卸载，编辑 ~/.claude/settings.json 删除 alibaba-p3c 条目"
