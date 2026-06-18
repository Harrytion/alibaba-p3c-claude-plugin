import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface CategoryConfig {
  name: string;       // e.g. "命名规约"
  ruleset: string;    // e.g. "ali-naming"
  levels: string[];   // e.g. ["mandatory", "recommended"]
}

export interface P3CConfig {
  enabledCategories: CategoryConfig[];
  hooks: {
    postWrite: boolean;
    preCommit: boolean;
  };
  scanPaths: string[];
}

export function generateClaudeMdSection(config: P3CConfig): string {
  const now = new Date().toISOString().split('T')[0];
  const categoryLines = config.enabledCategories
    .map((c) => `- ✅ ${c.name}（${c.levels.map((l) => l === 'mandatory' ? '强制' : l === 'recommended' ? '推荐' : '参考').join(' + ')}）`)
    .join('\n');

  const hookLines: string[] = [];
  if (config.hooks.postWrite) {
    hookLines.push('- **Post-Write**: 写入 Java 文件后自动扫描，强制违规自动修复');
  }
  if (config.hooks.preCommit) {
    hookLines.push('- **Pre-Commit**: 提交前扫描，存在强制违规时阻止提交');
  }

  const hookSection = hookLines.length > 0
    ? `\n### Hook 配置\n${hookLines.join('\n')}\n`
    : '';

  const scanPathsLines = config.scanPaths
    .map((p) => `- ${p}`)
    .join('\n');

  return `## Alibaba P3C Java Coding Guidelines

本项目遵循《阿里巴巴 Java 开发手册（黄山版）》规范，由 P3C 插件自动执行检查。
> 由 /p3c-init 生成于 ${now}

### 启用规则
${categoryLines}
${hookSection}
### 扫描范围
${scanPathsLines}

### 自定义规则
<!-- 用户可在此添加项目特有的规则覆盖 -->

### 使用方式
- \`/p3c-scan\` — 扫描当前项目
- \`/p3c-review\` — 按 P3C 规范审查代码
- \`/p3c-fix\` — 自动修复违规
- \`/p3c-learn\` — 交互式学习规则
- \`/p3c-init\` — 重新配置 P3C 插件
`;
}

export interface ParseResult {
  hasSection: boolean;
  startIndex: number;
  endIndex: number;
}

const SECTION_START = '## Alibaba P3C Java Coding Guidelines';

export function parseClaudeMdSection(content: string): ParseResult {
  const startIdx = content.indexOf(SECTION_START);
  if (startIdx === -1) {
    return { hasSection: false, startIndex: -1, endIndex: -1 };
  }

  // Find the next ## heading after our section
  const afterStart = content.indexOf('\n', startIdx) + 1;
  const nextHeadingMatch = content.slice(afterStart).match(/^## (?!Alibaba P3C)/m);
  const endIdx = nextHeadingMatch
    ? afterStart + nextHeadingMatch.index!
    : content.length;

  return { hasSection: true, startIndex: startIdx, endIndex: endIdx };
}

export function writeClaudeMdSection(claudeMdPath: string, config: P3CConfig): void {
  const newSection = generateClaudeMdSection(config);

  if (!existsSync(claudeMdPath)) {
    writeFileSync(claudeMdPath, newSection, 'utf-8');
    return;
  }

  const content = readFileSync(claudeMdPath, 'utf-8');
  const parsed = parseClaudeMdSection(content);

  if (parsed.hasSection) {
    // Replace existing section
    const updated = content.slice(0, parsed.startIndex) + newSection + content.slice(parsed.endIndex);
    writeFileSync(claudeMdPath, updated, 'utf-8');
  } else {
    // Append to end
    const separator = content.endsWith('\n') ? '\n' : '\n\n';
    writeFileSync(claudeMdPath, content + separator + newSection, 'utf-8');
  }
}
