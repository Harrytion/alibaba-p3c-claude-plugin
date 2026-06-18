import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PmdRunner } from '../services/pmd-runner.js';

const ALL_RULESETS = [
  'ali-naming', 'ali-comment', 'ali-concurrent', 'ali-constant',
  'ali-exception', 'ali-flowcontrol', 'ali-oop', 'ali-orm',
  'ali-other', 'ali-set',
];

export function registerScanTool(server: McpServer, jarPath: string) {
  server.tool(
    'p3c-scan',
    '扫描 Java 文件或目录，返回阿里巴巴 Java 开发规范违规列表。仅在 Java 项目中使用。',
    {
      paths: z.array(z.string()).describe('要扫描的文件或目录路径列表'),
      rulesets: z.array(z.string()).optional().describe(`要检查的规则类别，默认全部。可选: ${ALL_RULESETS.join(', ')}`),
      minimumPriority: z.number().min(1).max(5).optional().describe('最低优先级 (1=阻断, 2=严重, 3=主要, 4=次要, 5=信息)'),
      encoding: z.string().optional().describe('文件编码，默认 UTF-8'),
    },
    async ({ paths, rulesets, minimumPriority, encoding }) => {
      const runner = new PmdRunner(jarPath);

      const resolvedRulesets = (rulesets ?? ALL_RULESETS).map((rs) => {
        if (rs.startsWith('ali-')) return `rulesets/java/${rs}.xml`;
        return rs;
      });

      try {
        const result = await runner.scan({
          paths,
          rulesets: resolvedRulesets,
          minimumPriority,
          encoding,
        });

        const output = {
          total: result.violationCount,
          files: result.fileCount,
          violations: result.violations.map((v) => ({
            文件: v.file,
            行号: v.beginLine,
            规则: v.rule,
            规则集: v.ruleset,
            严重级别: priorityToLevel(v.priority),
            消息: v.message,
          })),
        };

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: err.message }),
          }],
          isError: true,
        };
      }
    }
  );
}

function priorityToLevel(priority: number): string {
  switch (priority) {
    case 1: return '阻断';
    case 2: return '严重';
    case 3: return '主要';
    case 4: return '次要';
    case 5: return '信息';
    default: return '未知';
  }
}
