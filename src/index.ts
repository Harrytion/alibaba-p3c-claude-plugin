#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { registerScanTool } from './tools/scan.js';
import { registerRuleLookupTool } from './tools/rule-lookup.js';
import { registerCategoryRulesTool } from './tools/category-rules.js';
import { registerDiffScanTool } from './tools/diff-scan.js';
import { registerInitTool } from './tools/init.js';
import { registerRulesResource } from './resources/rules-resource.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DEFAULT_JAR_PATH = join(PROJECT_ROOT, 'lib', 'p3c-pmd-2.1.1-jar-with-dependencies.jar');

const server = new McpServer({
  name: 'alibaba-p3c',
  version: '0.1.0',
});

const jarPath = process.env.P3C_PMD_JAR_PATH || DEFAULT_JAR_PATH;

if (!existsSync(jarPath)) {
  console.error(`Warning: P3C PMD JAR not found at ${jarPath}. Run 'npm run download-pmd' first.`);
}

registerScanTool(server, jarPath);
registerRuleLookupTool(server);
registerCategoryRulesTool(server);
registerDiffScanTool(server, jarPath);
registerInitTool(server, jarPath);
registerRulesResource(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Alibaba P3C MCP Server started');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
