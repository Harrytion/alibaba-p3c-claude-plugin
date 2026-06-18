import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadRulesByCategory, CATEGORIES } from '../data/rules-loader.js';

export function registerCategoryRulesTool(server: McpServer) {
  server.tool(
    'p3c-category-rules',
    '列出阿里巴巴 Java 开发规范中某个类别的所有规则，或列出所有类别。',
    {
      category: z.string().optional().describe('规则类别 key，例如 naming, comment, concurrent。不传则列出所有类别。'),
    },
    async ({ category }) => {
      if (!category) {
        const output = {
          类别列表: CATEGORIES.map((c) => ({
            key: c.key,
            名称: c.name,
            规则集: c.ruleset,
          })),
        };
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          }],
        };
      }

      const rules = loadRulesByCategory(category);
      if (rules.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: `未找到类别: ${category}`, 可用类别: CATEGORIES.map((c) => c.key) }),
          }],
        };
      }

      const output = {
        类别: CATEGORIES.find((c) => c.key === category)?.name ?? category,
        规则数量: rules.length,
        规则列表: rules.map((r) => ({
          规则ID: r.id,
          名称: r.name,
          严重级别: r.severity,
          描述: r.description,
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
