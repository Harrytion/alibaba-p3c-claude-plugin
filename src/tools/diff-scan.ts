import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { PmdRunner } from '../services/pmd-runner.js';

const execFileAsync = promisify(execFile);

const ALL_RULESETS = [
  'ali-naming', 'ali-comment', 'ali-concurrent', 'ali-constant',
  'ali-exception', 'ali-flowcontrol', 'ali-oop', 'ali-orm',
  'ali-other', 'ali-set',
];

export function registerDiffScanTool(server: McpServer, jarPath: string) {
  server.tool(
    'p3c-diff-scan',
    '仅扫描 Git 变更的 Java 文件，适合 PR 审查和增量检查。',
    {
      projectRoot: z.string().describe('项目根目录的绝对路径'),
      baseBranch: z.string().optional().describe('基准分支，默认 main'),
      rulesets: z.array(z.string()).optional().describe('要检查的规则类别'),
      minimumPriority: z.number().min(1).max(5).optional().describe('最低优先级'),
    },
    async ({ projectRoot, baseBranch, rulesets, minimumPriority }) => {
      const branch = baseBranch ?? 'main';

      let changedFiles: string[];
      try {
        const { stdout } = await execFileAsync('git', [
          'diff', '--name-only', '--diff-filter=ACMR', `${branch}...HEAD`,
          '--', '*.java',
        ], { cwd: projectRoot });
        changedFiles = stdout.trim().split('\n').filter(Boolean);

        if (changedFiles.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ 消息: '未检测到 Java 文件变更', 变更文件数: 0 }),
            }],
          };
        }
      } catch (err: any) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: `Git diff 执行失败: ${err.message}` }),
          }],
          isError: true,
        };
      }

      const absolutePaths = changedFiles.map((f) => join(projectRoot, f));
      const resolvedRulesets = (rulesets ?? ALL_RULESETS).map((rs) =>
        rs.startsWith('ali-') ? `rulesets/java/${rs}.xml` : rs
      );

      const runner = new PmdRunner(jarPath);
      const result = await runner.scan({
        paths: absolutePaths,
        rulesets: resolvedRulesets,
        minimumPriority,
      });

      const output = {
        基准分支: branch,
        变更文件数: changedFiles.length,
        变更文件: changedFiles,
        违规总数: result.violationCount,
        违规列表: result.violations.map((v) => ({
          文件: v.file.replace(projectRoot + '/', ''),
          行号: v.beginLine,
          规则: v.rule,
          消息: v.message,
        })),
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
