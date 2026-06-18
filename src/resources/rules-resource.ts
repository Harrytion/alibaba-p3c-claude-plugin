import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CATEGORIES, loadRulesByCategory, loadAllRules } from '../data/rules-loader.js';

export function registerRulesResource(server: McpServer) {
  for (const category of CATEGORIES) {
    server.resource(
      `p3c-rules-${category.key}`,
      `p3c://rules/${category.key}`,
      async (uri) => {
        const rules = loadRulesByCategory(category.key);
        const content = rules.map((r) =>
          `## ${r.name}\n\n- **严重级别**: ${r.severity}\n- **描述**: ${r.description}\n${r.positiveExample ? `- **正例**: \`${r.positiveExample}\`\n` : ''}${r.negativeExample ? `- **反例**: \`${r.negativeExample}\`\n` : ''}`
        ).join('\n---\n');

        return {
          contents: [{
            uri: uri.href,
            text: `# ${category.name}\n\n${content}`,
          }],
        };
      }
    );
  }

  server.resource(
    'p3c-rules-index',
    'p3c://rules',
    async (uri) => {
      const allRules = loadAllRules();
      const byCategory = CATEGORIES.map((c) => {
        const rules = loadRulesByCategory(c.key);
        return `### ${c.name} (${rules.length} 条)\n${rules.map((r) => `- ${r.name} [${r.severity}]`).join('\n')}`;
      }).join('\n\n');

      return {
        contents: [{
          uri: uri.href,
          text: `# 阿里巴巴 Java 开发规范规则索引\n\n共 ${allRules.length} 条规则\n\n${byCategory}`,
        }],
      };
    }
  );
}
