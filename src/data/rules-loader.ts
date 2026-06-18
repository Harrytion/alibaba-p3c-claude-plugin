import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface RuleEntry {
  id: string;
  name: string;
  severity: 'mandatory' | 'recommended' | 'reference';
  description: string;
  positiveExample?: string;
  negativeExample?: string;
  pmdRule: string;
  pmdPriority: number;
}

let cachedRules: RuleEntry[] | null = null;

export function loadAllRules(): RuleEntry[] {
  if (cachedRules) return cachedRules;

  const rulesDir = join(__dirname, 'rules');
  const files = readdirSync(rulesDir).filter((f) => f.endsWith('.json'));

  cachedRules = [];
  for (const file of files) {
    const content = readFileSync(join(rulesDir, file), 'utf-8');
    const rules: RuleEntry[] = JSON.parse(content);
    cachedRules.push(...rules);
  }

  return cachedRules;
}

export function loadRulesByCategory(category: string): RuleEntry[] {
  const rulesDir = join(__dirname, 'rules');
  const filePath = join(rulesDir, `${category}.json`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export const CATEGORIES = [
  { key: 'naming', name: '命名规约', ruleset: 'ali-naming' },
  { key: 'comment', name: '注释规约', ruleset: 'ali-comment' },
  { key: 'concurrent', name: '并发规约', ruleset: 'ali-concurrent' },
  { key: 'constant', name: '常量规约', ruleset: 'ali-constant' },
  { key: 'exception', name: '异常规约', ruleset: 'ali-exception' },
  { key: 'flowcontrol', name: '流控制规约', ruleset: 'ali-flowcontrol' },
  { key: 'oop', name: 'OOP规约', ruleset: 'ali-oop' },
  { key: 'orm', name: 'ORM规约', ruleset: 'ali-orm' },
  { key: 'set', name: '集合规约', ruleset: 'ali-set' },
  { key: 'other', name: '其他规约', ruleset: 'ali-other' },
];
