import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { detectJavaProject } from '../services/java-detector.js';
import { writeClaudeMdSection, type P3CConfig, type CategoryConfig } from '../services/claude-md-writer.js';
import { CATEGORIES } from '../data/rules-loader.js';
import { join } from 'node:path';

export function registerInitTool(server: McpServer, jarPath: string) {
  server.tool(
    'p3c-init',
    '初始化阿里巴巴 Java 开发规范插件。检测 Java 项目，配置启用规则和 Hook，写入 CLAUDE.md。仅适用于 Java 项目。',
    {
      projectRoot: z.string().describe('项目根目录的绝对路径'),
      enabledCategories: z.array(z.object({
        key: z.string().describe('类别 key，如 naming, comment'),
        levels: z.array(z.string()).describe('启用的级别，如 ["mandatory", "recommended"]'),
      })).optional().describe('启用的规则类别及级别。不传则全部启用强制级别。'),
      postWriteHook: z.boolean().optional().describe('是否启用 Post-Write Hook（写入Java文件后自动扫描）'),
      preCommitHook: z.boolean().optional().describe('是否启用 Pre-Commit Hook（提交前扫描）'),
      scanPaths: z.array(z.string()).optional().describe('扫描路径 glob。不传则默认 ["src/main/java/**/*.java"]'),
    },
    async ({ projectRoot, enabledCategories, postWriteHook, preCommitHook, scanPaths }) => {
      // Step 1: Detect Java project
      const javaInfo = detectJavaProject(projectRoot);

      if (!javaInfo.isJava) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              成功: false,
              原因: `当前项目非 Java 项目，P3C 插件不适用。检测结果: ${javaInfo.details}`,
            }, null, 2),
          }],
        };
      }

      // Step 2: Build category config
      const categoryConfigs: CategoryConfig[] = (enabledCategories ?? CATEGORIES.map((c) => ({
        key: c.key,
        levels: ['mandatory'] as string[],
      }))).map((ec) => {
        const cat = CATEGORIES.find((c) => c.key === ec.key);
        if (!cat) {
          throw new Error(`未知的规则类别: ${ec.key}。可用类别: ${CATEGORIES.map((c) => c.key).join(', ')}`);
        }
        return {
          name: cat.name,
          ruleset: cat.ruleset,
          levels: ec.levels,
        };
      });

      // Step 3: Build P3C config
      const config: P3CConfig = {
        enabledCategories: categoryConfigs,
        hooks: {
          postWrite: postWriteHook ?? false,
          preCommit: preCommitHook ?? false,
        },
        scanPaths: scanPaths ?? ['src/main/java/**/*.java'],
      };

      // Step 4: Write CLAUDE.md
      const claudeMdPath = join(projectRoot, 'CLAUDE.md');
      writeClaudeMdSection(claudeMdPath, config);

      // Step 5: Return result
      const output = {
        成功: true,
        项目类型: javaInfo.details,
        构建工具: javaInfo.buildTool ?? '未检测到',
        配置写入: claudeMdPath,
        启用类别: categoryConfigs.map((c) => c.name),
        Hook配置: {
          PostWrite: config.hooks.postWrite ? '已启用' : '未启用',
          PreCommit: config.hooks.preCommit ? '已启用' : '未启用',
        },
        下一步: [
          '查看 CLAUDE.md 中的 P3C 配置段落',
          '使用 /p3c-scan 扫描项目',
          '使用 /p3c-review 审查代码',
          '如需调整规则，直接编辑 CLAUDE.md 中的 P3C 段落',
        ],
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(output, null, 2),
        }],
      };
    }
  );
}
