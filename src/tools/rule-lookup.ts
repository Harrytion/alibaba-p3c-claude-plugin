import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadAllRules } from '../data/rules-loader.js';

export function registerRuleLookupTool(server: McpServer) {
  server.tool(
    'p3c-rule-lookup',
    '查询阿里巴巴 Java 开发规范中的具体规则详情，包括中文描述、严重级别、正反例。',
    {
      ruleId: z.string().describe('规则ID，例如 ClassNamingShouldBeCamelRule'),
    },
    async ({ ruleId }) => {
      const allRules = loadAllRules();
      const rule = allRules.find((r) =>
        r.id === ruleId || r.pmdRule === ruleId
      );

      if (!rule) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: `未找到规则: ${ruleId}`, availableRules: allRules.map((r) => r.id) }),
          }],
        };
      }

      const output = {
        规则ID: rule.id,
        规则名称: rule.name,
        严重级别: rule.severity,
        描述: rule.description,
        正例: rule.positiveExample ?? '（无）',
        反例: rule.negativeExample ?? '（无）',
        PMD规则名: rule.pmdRule,
        PMD优先级: rule.pmdPriority,
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
