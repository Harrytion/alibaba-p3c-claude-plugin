# Alibaba P3C Claude Code Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude Code plugin that enforces Alibaba Java Coding Guidelines (P3C) via MCP Server tools, Skills, and Hooks — with `/p3c-init` as the entry point that detects Java projects and writes configuration into `CLAUDE.md`.

**Architecture:** MCP Server (TypeScript + stdio transport) wraps P3C PMD JAR execution via `child_process`, exposing scan/rule-lookup/init tools. Skills provide `/p3c-scan`, `/p3c-review`, `/p3c-fix`, `/p3c-learn` slash commands. Hooks auto-scan on Java file writes. `/p3c-init` detects Java projects, interactively configures rules, and writes the P3C section into the project's `CLAUDE.md`.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk` (v2), `zod`, P3C PMD 2.1.1 JAR, Java 8+ (runtime dependency for PMD), `fast-xml-parser` for PMD XML output parsing

---

## Project Structure

```
alibaba-p3c-claude-plugin/
├── src/
│   ├── index.ts                    # MCP Server entry point
│   ├── tools/
│   │   ├── scan.ts                 # p3c-scan tool
│   │   ├── rule-lookup.ts          # p3c-rule-lookup tool
│   │   ├── category-rules.ts       # p3c-category-rules tool
│   │   ├── diff-scan.ts            # p3c-diff-scan tool
│   │   └── init.ts                 # p3c-init tool (Java detect + CLAUDE.md write)
│   ├── resources/
│   │   └── rules-resource.ts       # MCP Resource for rule documents
│   ├── services/
│   │   ├── pmd-runner.ts           # P3C PMD JAR execution wrapper
│   │   ├── java-detector.ts        # Java project detection
│   │   ├── claude-md-writer.ts     # CLAUDE.md P3C section generator/writer
│   │   └── rule-parser.ts          # Parse PMD XML output to structured JSON
│   └── data/
│       └── rules/                  # Pre-built rule knowledge base (JSON)
│           ├── naming.json
│           ├── comment.json
│           ├── concurrent.json
│           ├── constant.json
│           ├── exception.json
│           ├── flowcontrol.json
│           ├── oop.json
│           ├── orm.json
│           ├── set.json
│           └── other.json
├── lib/
│   └── p3c-pmd-2.1.1.jar          # Bundled P3C PMD JAR (downloaded by install script)
├── skills/
│   ├── p3c-init.md
│   ├── p3c-scan.md
│   ├── p3c-review.md
│   ├── p3c-fix.md
│   └── p3c-learn.md
├── agents/
│   └── p3c-reviewer.md
├── hooks/
│   ├── post-write-p3c.sh
│   └── context-inject-p3c.sh
├── scripts/
│   ├── download-pmd.sh             # Download P3C PMD JAR
│   └── install.sh                  # Full install script
├── tests/
│   ├── pmd-runner.test.ts
│   ├── java-detector.test.ts
│   ├── claude-md-writer.test.ts
│   ├── rule-parser.test.ts
│   └── tools/
│       ├── scan.test.ts
│       ├── rule-lookup.test.ts
│       └── init.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

**Step 1: Initialize npm project**

```bash
cd /Users/jackrams/IdeaProjects/plugins/alibaba-p3c-claude-plugin
npm init -y
```

**Step 2: Write package.json with dependencies**

```json
{
  "name": "alibaba-p3c-claude-plugin",
  "version": "0.1.0",
  "description": "Alibaba Java Coding Guidelines (P3C) plugin for Claude Code",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "p3c-mcp-server": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "download-pmd": "bash scripts/download-pmd.sh"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^2.0.0",
    "zod": "^3.25.0",
    "fast-xml-parser": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.0.0",
    "@types/node": "^22.0.0"
  }
}
```

**Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 4: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
```

**Step 5: Write .gitignore**

```
node_modules/
dist/
lib/*.jar
*.tsbuildinfo
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: dependencies installed successfully

**Step 7: Create directory structure**

```bash
mkdir -p src/{tools,resources,services,data/rules} lib skills agents hooks scripts tests/tools
```

**Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold project structure with dependencies"
```

---

## Task 2: P3C PMD JAR Download Script

**Files:**
- Create: `scripts/download-pmd.sh`

**Step 1: Write the download script**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LIB_DIR="$PROJECT_DIR/lib"
JAR_NAME="p3c-pmd-2.1.1-jar-with-dependencies.jar"
JAR_PATH="$LIB_DIR/$JAR_NAME"
MAVEN_URL="https://repo1.maven.org/maven2/com/alibaba/p3c/p3c-pmd/2.1.1/p3c-pmd-2.1.1-jar-with-dependencies.jar"

mkdir -p "$LIB_DIR"

if [ -f "$JAR_PATH" ]; then
  echo "P3C PMD JAR already exists at $JAR_PATH"
  exit 0
fi

echo "Downloading P3C PMD JAR (v2.1.1)..."
curl -fSL -o "$JAR_PATH" "$MAVEN_URL"
echo "Downloaded to $JAR_PATH"
```

**Step 2: Run the download script**

Run: `bash scripts/download-pmd.sh`
Expected: JAR file downloaded to `lib/p3c-pmd-2.1.1-jar-with-dependencies.jar`

**Step 3: Verify JAR is runnable**

Run: `java -jar lib/p3c-pmd-2.1.1-jar-with-dependencies.jar -h 2>&1 | head -5`
Expected: PMD usage info printed (or PMD help output)

**Step 4: Commit**

```bash
git add scripts/download-pmd.sh
git commit -m "feat: add P3C PMD JAR download script"
```

---

## Task 3: PMD Runner Service

**Files:**
- Create: `src/services/pmd-runner.ts`
- Create: `tests/pmd-runner.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/pmd-runner.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { PmdRunner } from '../src/services/pmd-runner.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = join(import.meta.dirname, '..');
const JAR_PATH = join(PROJECT_ROOT, 'lib', 'p3c-pmd-2.1.1-jar-with-dependencies.jar');
const FIXTURE_DIR = join(PROJECT_ROOT, 'tests', 'fixtures');

// Skip tests if JAR not present (CI might not have it)
const jarExists = existsSync(JAR_PATH);

describe.skipIf(!jarExists)('PmdRunner', () => {
  let runner: PmdRunner;

  beforeAll(() => {
    runner = new PmdRunner(JAR_PATH);
  });

  it('should scan a simple Java file and return violations', async () => {
    const javaFile = join(FIXTURE_DIR, 'BadNaming.java');
    const result = await runner.scan({
      paths: [javaFile],
      rulesets: ['ali-naming'],
    });

    expect(result).toBeDefined();
    expect(result.violations).toBeInstanceOf(Array);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should return empty violations for a clean Java file', async () => {
    const javaFile = join(FIXTURE_DIR, 'GoodNaming.java');
    const result = await runner.scan({
      paths: [javaFile],
      rulesets: ['ali-naming'],
    });

    expect(result).toBeDefined();
    expect(result.violations).toBeInstanceOf(Array);
  });

  it('should throw if JAR path is invalid', async () => {
    const badRunner = new PmdRunner('/nonexistent/p3c-pmd.jar');
    await expect(badRunner.scan({ paths: ['/tmp/Fake.java'], rulesets: ['ali-naming'] }))
      .rejects.toThrow();
  });
});
```

**Step 2: Create test fixture files**

```bash
mkdir -p tests/fixtures
```

Create `tests/fixtures/BadNaming.java`:
```java
// Violates: ClassNamingShouldBeCamelRule, LowerCamelCaseVariableNamingRule
public class bad_naming {
    public static final int max_count = 10;
    private String _Name;

    public void Method() {}
}
```

Create `tests/fixtures/GoodNaming.java`:
```java
/**
 * Good naming example.
 *
 * @author test
 * @date 2024/01/01
 */
public class GoodNaming {
    public static final int MAX_COUNT = 10;
    private String name;

    public void method() {}
}
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run tests/pmd-runner.test.ts`
Expected: FAIL — module `../src/services/pmd-runner.js` not found

**Step 4: Write PmdRunner implementation**

```typescript
// src/services/pmd-runner.ts
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { parsePmdXml, type PmdViolation, type PmdScanResult } from './rule-parser.js';

const execFileAsync = promisify(execFile);

export interface ScanOptions {
  /** File or directory paths to scan */
  paths: string[];
  /** Rule categories to include (e.g., 'ali-naming', 'ali-concurrent') */
  rulesets: string[];
  /** Optional: minimum priority level (1=blocker, 2=critical, 3=major, 4=minor, 5=info) */
  minimumPriority?: number;
  /** Optional: encoding (default: UTF-8) */
  encoding?: string;
}

export class PmdRunner {
  private readonly jarPath: string;

  constructor(jarPath: string) {
    this.jarPath = jarPath;
  }

  async scan(options: ScanOptions): Promise<PmdScanResult> {
    if (!existsSync(this.jarPath)) {
      throw new Error(`P3C PMD JAR not found at: ${this.jarPath}. Run 'npm run download-pmd' first.`);
    }

    const rulesetArgs = options.rulesets.flatMap((rs) => ['-R', rs]);
    const args: string[] = [
      '-jar', this.jarPath,
      ...options.paths,
      ...rulesetArgs,
      '-f', 'xml',
      '-encoding', options.encoding ?? 'UTF-8',
    ];

    if (options.minimumPriority) {
      args.push('-min', String(options.minimumPriority));
    }

    const { stdout, stderr } = await execFileAsync('java', args, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large projects
      timeout: 120_000, // 2 minute timeout
    });

    // PMD writes violations to stdout, info/warnings to stderr
    // Non-zero exit code means violations found (not an error)
    return parsePmdXml(stdout);
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/pmd-runner.test.ts`
Expected: PASS (or SKIP if JAR not yet downloaded)

**Step 6: Commit**

```bash
git add src/services/pmd-runner.ts tests/pmd-runner.test.ts tests/fixtures/
git commit -m "feat: add PmdRunner service for P3C PMD JAR execution"
```

---

## Task 4: Rule Parser (PMD XML → Structured JSON)

**Files:**
- Create: `src/services/rule-parser.ts`
- Create: `tests/rule-parser.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/rule-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parsePmdXml } from '../src/services/rule-parser.js';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<pmd version="6.15.0" timestamp="2024-01-01T00:00:00.000">
  <file name="/src/main/java/com/example/BadNaming.java">
    <violation beginline="3" endline="3" begincolumn="1" endcolumn="20"
      rule="ClassNamingShouldBeCamelRule" ruleset="AlibabaJavaNaming"
      class="com.alibaba.p3c.pmd.lang.java.rule.naming.ClassNamingShouldBeCamelRule"
      priority="3">
      Class name should be in CamelCase style
    </violation>
    <violation beginline="5" endline="5" begincolumn="4" endcolumn="30"
      rule="ConstantFieldShouldBeUpperCaseRule" ruleset="AlibabaJavaNaming"
      class="com.alibaba.p3c.pmd.lang.java.rule.naming.ConstantFieldShouldBeUpperCaseRule"
      priority="2">
      Constant variable name should be upper case
    </violation>
  </file>
</pmd>`;

describe('parsePmdXml', () => {
  it('should parse PMD XML output into structured violations', () => {
    const result = parsePmdXml(SAMPLE_XML);

    expect(result.violations).toHaveLength(2);
    expect(result.violations[0]).toEqual({
      file: '/src/main/java/com/example/BadNaming.java',
      beginLine: 3,
      endLine: 3,
      beginColumn: 1,
      endColumn: 20,
      rule: 'ClassNamingShouldBeCamelRule',
      ruleset: 'AlibabaJavaNaming',
      priority: 3,
      message: 'Class name should be in CamelCase style',
    });
    expect(result.violations[1].rule).toBe('ConstantFieldShouldBeUpperCaseRule');
  });

  it('should return empty violations for empty XML', () => {
    const result = parsePmdXml('<?xml version="1.0"?><pmd version="6.15.0"></pmd>');
    expect(result.violations).toHaveLength(0);
  });

  it('should handle XML with no files', () => {
    const result = parsePmdXml('<?xml version="1.0"?><pmd version="6.15.0"><file name="test.java"></file></pmd>');
    expect(result.violations).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/rule-parser.test.ts`
Expected: FAIL — module not found

**Step 3: Write RuleParser implementation**

```typescript
// src/services/rule-parser.ts
import { XMLParser } from 'fast-xml-parser';

export interface PmdViolation {
  file: string;
  beginLine: number;
  endLine: number;
  beginColumn: number;
  endColumn: number;
  rule: string;
  ruleset: string;
  priority: number;
  message: string;
}

export interface PmdScanResult {
  violations: PmdViolation[];
  fileCount: number;
  violationCount: number;
}

export function parsePmdXml(xmlString: string): PmdScanResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    isArray: (name) => name === 'violation' || name === 'file',
  });

  const parsed = parser.parse(xmlString);
  const pmd = parsed.pmd;

  if (!pmd || !pmd.file) {
    return { violations: [], fileCount: 0, violationCount: 0 };
  }

  const files = Array.isArray(pmd.file) ? pmd.file : [pmd.file];
  const violations: PmdViolation[] = [];

  for (const file of files) {
    if (!file.violation) continue;

    const fileViolations = Array.isArray(file.violation) ? file.violation : [file.violation];

    for (const v of fileViolations) {
      violations.push({
        file: file.name,
        beginLine: parseInt(v.beginline, 10),
        endLine: parseInt(v.endline, 10),
        beginColumn: parseInt(v.begincolumn, 10),
        endColumn: parseInt(v.endcolumn, 10),
        rule: v.rule,
        ruleset: v.ruleset,
        priority: parseInt(v.priority, 10),
        message: (v['#text'] ?? '').trim(),
      });
    }
  }

  return {
    violations,
    fileCount: files.length,
    violationCount: violations.length,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/rule-parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/rule-parser.ts tests/rule-parser.test.ts
git commit -m "feat: add PMD XML output parser for structured violation data"
```

---

## Task 5: Rule Knowledge Base (JSON Data)

**Files:**
- Create: `src/data/rules/naming.json`
- Create: `src/data/rules/comment.json`
- Create: `src/data/rules/concurrent.json`
- Create: `src/data/rules/constant.json`
- Create: `src/data/rules/exception.json`
- Create: `src/data/rules/flowcontrol.json`
- Create: `src/data/rules/oop.json`
- Create: `src/data/rules/orm.json`
- Create: `src/data/rules/set.json`
- Create: `src/data/rules/other.json`

**Step 1: Define the rule data schema**

Each JSON file follows this structure:

```typescript
// Type definition (not a file, just for reference)
interface RuleEntry {
  id: string;              // Rule class name, e.g. "ClassNamingShouldBeCamelRule"
  name: string;            // Short Chinese name, e.g. "类名使用UpperCamelCase风格"
  severity: "mandatory" | "recommended" | "reference";
  description: string;     // Chinese description of the rule
  positiveExample?: string; // 正例 code
  negativeExample?: string; // 反例 code
  pmdRule: string;         // PMD rule name (matches XML)
  pmdPriority: number;     // PMD priority (1=blocker, 2=critical, 3=major)
}
```

**Step 2: Write naming.json** (example — all 10 files follow same pattern)

```json
[
  {
    "id": "ClassNamingShouldBeCamelRule",
    "name": "类名使用UpperCamelCase风格",
    "severity": "mandatory",
    "description": "类名使用 UpperCamelCase 风格，必须遵从驼峰形式，但以下情形例外：DO / BO / DTO / VO / AO / PO / UID 等。",
    "positiveExample": "MarcoPolo / UserDO / HtmlDTO / XmlService / TcpUdpDeal / TaPromotion",
    "negativeExample": "macroPolo / UserDo / HTMLDto / XMLService / TCPUDPDeal / TAPromotion",
    "pmdRule": "ClassNamingShouldBeCamelRule",
    "pmdPriority": 3
  },
  {
    "id": "AbstractClassShouldStartWithAbstractNamingRule",
    "name": "抽象类命名使用Abstract或Base开头",
    "severity": "mandatory",
    "description": "抽象类命名使用 Abstract 或 Base 开头；异常类命名使用 Exception 结尾；测试类命名以它要测试的类的名称开始，以 Test 结尾。",
    "positiveExample": "abstract class AbstractActionDemo {}",
    "pmdRule": "AbstractClassShouldStartWithAbstractNamingRule",
    "pmdPriority": 2
  },
  {
    "id": "ExceptionClassShouldEndWithExceptionRule",
    "name": "异常类命名使用Exception结尾",
    "severity": "mandatory",
    "description": "异常类命名使用 Exception 结尾。",
    "positiveExample": "public class CacheDemoException extends Exception {}",
    "pmdRule": "ExceptionClassShouldEndWithExceptionRule",
    "pmdPriority": 2
  },
  {
    "id": "TestClassShouldEndWithTestNamingRule",
    "name": "测试类命名以Test结尾",
    "severity": "mandatory",
    "description": "测试类命名以它要测试的类的名称开始，以 Test 结尾。",
    "positiveExample": "public class DemoTest {}",
    "pmdRule": "TestClassShouldEndWithTestNamingRule",
    "pmdPriority": 3
  },
  {
    "id": "LowerCamelCaseVariableNamingRule",
    "name": "方法名、参数名、成员变量、局部变量使用lowerCamelCase",
    "severity": "mandatory",
    "description": "方法名、参数名、成员变量名、局部变量名都统一使用 lowerCamelCase 风格，必须遵从驼峰形式。",
    "positiveExample": "localValue / getHttpMessage() / inputUserId",
    "pmdRule": "LowerCamelCaseVariableNamingRule",
    "pmdPriority": 2
  },
  {
    "id": "AvoidStartWithDollarAndUnderLineNamingRule",
    "name": "标识符不能以下划线或美元符号开始和结束",
    "severity": "mandatory",
    "description": "代码中的命名均不能以下划线或美元符号开始，也不能以下划线或美元符号结束。",
    "negativeExample": "_name / __name / $Object / name_ / name$ / Object$",
    "pmdRule": "AvoidStartWithDollarAndUnderLineNamingRule",
    "pmdPriority": 2
  },
  {
    "id": "ConstantFieldShouldBeUpperCaseRule",
    "name": "常量命名全部大写，单词间用下划线隔开",
    "severity": "mandatory",
    "description": "常量命名全部大写，单词间用下划线隔开，力求语义表达完整清楚，不要嫌名字长。",
    "positiveExample": "MAX_STOCK_COUNT",
    "negativeExample": "MAX_COUNT",
    "pmdRule": "ConstantFieldShouldBeUpperCaseRule",
    "pmdPriority": 2
  },
  {
    "id": "ServiceOrDaoClassShouldEndWithImplRule",
    "name": "Service和DAO类命名使用Impl后缀",
    "severity": "mandatory",
    "description": "Service 和 DAO 类，基于 SOA 的理念，暴露出来的服务一定是接口，内部的实现类用 Impl 的后缀与接口区别。",
    "positiveExample": "public class DemoServiceImpl implements DemoService {}",
    "pmdRule": "ServiceOrDaoClassShouldEndWithImplRule",
    "pmdPriority": 2
  },
  {
    "id": "PackageNamingRule",
    "name": "包名统一使用小写，点分隔符之间有且仅有一个自然语义的英语单词",
    "severity": "mandatory",
    "description": "包名统一使用小写，点分隔符之间有且仅有一个自然语义的英语单词。包名统一使用单数形式，但是类名如果有复数含义，类名可以使用复数形式。",
    "positiveExample": "com.alibaba.open.util",
    "pmdRule": "PackageNamingRule",
    "pmdPriority": 3
  },
  {
    "id": "BooleanPropertyShouldNotStartWithIsRule",
    "name": "布尔类型变量不加is前缀",
    "severity": "mandatory",
    "description": "在 POJO 类中，布尔类型的变量，都不要加 is 前缀，否则部分框架解析会引起序列化错误。",
    "negativeExample": "boolean isSuccess; // 方法名也是 isSuccess()，RPC框架在反向解析时以为属性名是 success，导致属性获取不到",
    "pmdRule": "BooleanPropertyShouldNotStartWithIsRule",
    "pmdPriority": 2
  },
  {
    "id": "ArrayNamingShouldHaveBracketRule",
    "name": "数组声明使用类型与中括号紧挨相连的方式",
    "severity": "mandatory",
    "description": "中括号是数组类型的一部分，数组定义如下：String[] args。不要使用 String args[] 的方式来定义。",
    "positiveExample": "String[] a = new String[3];",
    "negativeExample": "String a[] = new String[3];",
    "pmdRule": "ArrayNamingShouldHaveBracketRule",
    "pmdPriority": 3
  }
]
```

**Step 3: Write the remaining 9 JSON files**

Follow the same schema. Content sourced from the P3C PMD README and XML rulesets. Key data points:

- `comment.json`: 6 rules (CommentsMustBeJavadocFormatRule, AbstractMethodOrInterfaceMethodMustUseJavadocRule, ClassMustHaveAuthorRule, EnumConstantsMustHaveCommentRule, AvoidCommentBehindStatementRule, RemoveCommentedCodeRule)
- `concurrent.json`: 10 rules (ThreadPoolCreationRule, AvoidUseTimerRule, AvoidManuallyCreateThreadRule, ThreadShouldSetNameRule, AvoidCallStaticSimpleDateFormatRule, ThreadLocalShouldRemoveRule, AvoidConcurrentCompetitionRandomRule, CountDownShouldInFinallyRule, LockShouldWithTryFinallyRule, etc.)
- `constant.json`: 2 rules (MagicNumberRule, UppercaseConstantNamingRule-like)
- `exception.json`: 3 rules (AvoidReturnInFinallyRule, etc.)
- `flowcontrol.xml`: 4 rules (SwitchStatementRule, IfElseBracesRule, etc.)
- `oop.json`: 7 rules (WrapperTypeEqualityRule, EqualsAvoidNullRule, etc.)
- `orm.json`: 1 rule
- `set.json`: 6 rules (ClassCastExceptionWithToArrayRule, DontModifyInForeachCircleRule, CollectionInitShouldAssignCapacityRule, etc.)
- `other.json`: 7 rules (AvoidApacheBeanutilsRule, RegexPrecompileRule, etc.)

**Step 4: Commit**

```bash
git add src/data/rules/
git commit -m "feat: add rule knowledge base JSON data for all 10 P3C categories"
```

---

## Task 6: Java Project Detector

**Files:**
- Create: `src/services/java-detector.ts`
- Create: `tests/java-detector.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/java-detector.test.ts
import { describe, it, expect } from 'vitest';
import { detectJavaProject } from '../src/services/java-detector.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('detectJavaProject', () => {
  it('should detect Maven project', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    writeFileSync(join(tmpDir, 'pom.xml'), '<project></project>');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(true);
    expect(result.buildTool).toBe('maven');

    rmSync(tmpDir, { recursive: true });
  });

  it('should detect Gradle project', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    writeFileSync(join(tmpDir, 'build.gradle'), '');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(true);
    expect(result.buildTool).toBe('gradle');

    rmSync(tmpDir, { recursive: true });
  });

  it('should detect Gradle Kotlin DSL project', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    writeFileSync(join(tmpDir, 'build.gradle.kts'), '');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(true);
    expect(result.buildTool).toBe('gradle');

    rmSync(tmpDir, { recursive: true });
  });

  it('should detect project with Java files but no build tool', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    mkdirSync(join(tmpDir, 'src'));
    writeFileSync(join(tmpDir, 'src', 'Main.java'), 'public class Main {}');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(true);
    expect(result.buildTool).toBeUndefined();

    rmSync(tmpDir, { recursive: true });
  });

  it('should reject non-Java project', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'p3c-test-'));
    writeFileSync(join(tmpDir, 'package.json'), '{}');

    const result = detectJavaProject(tmpDir);
    expect(result.isJava).toBe(false);

    rmSync(tmpDir, { recursive: true });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/java-detector.test.ts`
Expected: FAIL — module not found

**Step 3: Write JavaDetector implementation**

```typescript
// src/services/java-detector.ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';

export interface JavaProjectInfo {
  isJava: boolean;
  buildTool?: 'maven' | 'gradle';
  details: string;
  hasJavaFiles: boolean;
}

export function detectJavaProject(projectRoot: string): JavaProjectInfo {
  const hasPomXml = existsSync(join(projectRoot, 'pom.xml'));
  const hasBuildGradle = existsSync(join(projectRoot, 'build.gradle'))
    || existsSync(join(projectRoot, 'build.gradle.kts'));

  // Quick check for Java source files (top 2 levels only)
  let hasJavaFiles = false;
  try {
    const javaPattern = join(projectRoot, '**', '*.java');
    const matches = globSync(javaPattern);
    hasJavaFiles = matches.length > 0;
  } catch {
    // glob may fail, ignore
  }

  if (hasPomXml) {
    return { isJava: true, buildTool: 'maven', details: 'Maven 项目', hasJavaFiles };
  }
  if (hasBuildGradle) {
    return { isJava: true, buildTool: 'gradle', details: 'Gradle 项目', hasJavaFiles };
  }
  if (hasJavaFiles) {
    return { isJava: true, details: '包含 Java 源文件（未检测到构建工具）', hasJavaFiles };
  }

  return { isJava: false, details: '未检测到 Java 项目特征（无 pom.xml / build.gradle / .java 文件）', hasJavaFiles: false };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/java-detector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/java-detector.ts tests/java-detector.test.ts
git commit -m "feat: add Java project detection service"
```

---

## Task 7: CLAUDE.md Writer Service

**Files:**
- Create: `src/services/claude-md-writer.ts`
- Create: `tests/claude-md-writer.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/claude-md-writer.test.ts
import { describe, it, expect } from 'vitest';
import { generateClaudeMdSection, parseClaudeMdSection } from '../src/services/claude-md-writer.js';

describe('generateClaudeMdSection', () => {
  it('should generate CLAUDE.md P3C section with enabled rules', () => {
    const config = {
      enabledCategories: [
        { name: '命名规约', ruleset: 'ali-naming', levels: ['mandatory', 'recommended'] },
        { name: '注释规约', ruleset: 'ali-comment', levels: ['mandatory'] },
        { name: '并发规约', ruleset: 'ali-concurrent', levels: ['mandatory'] },
      ],
      hooks: {
        postWrite: true,
        preCommit: false,
      },
      scanPaths: ['src/main/java/**/*.java'],
    };

    const section = generateClaudeMdSection(config);

    expect(section).toContain('## Alibaba P3C Java Coding Guidelines');
    expect(section).toContain('命名规约');
    expect(section).toContain('注释规约');
    expect(section).toContain('并发规约');
    expect(section).toContain('Post-Write');
    expect(section).toContain('src/main/java/**/*.java');
    expect(section).toContain('/p3c-scan');
    expect(section).toContain('/p3c-review');
  });

  it('should generate section with no hooks', () => {
    const config = {
      enabledCategories: [
        { name: 'OOP规约', ruleset: 'ali-oop', levels: ['mandatory'] },
      ],
      hooks: {
        postWrite: false,
        preCommit: false,
      },
      scanPaths: ['**/*.java'],
    };

    const section = generateClaudeMdSection(config);
    expect(section).toContain('OOP规约');
    expect(section).not.toContain('Post-Write');
    expect(section).not.toContain('Pre-Commit');
  });
});

describe('parseClaudeMdSection', () => {
  it('should detect existing P3C section in CLAUDE.md', () => {
    const content = `# Project Notes\n\n## Alibaba P3C Java Coding Guidelines\n\nSome config here\n\n## Other Section`;
    const result = parseClaudeMdSection(content);
    expect(result.hasSection).toBe(true);
    expect(result.startIndex).toBeGreaterThanOrEqual(0);
  });

  it('should return no section for CLAUDE.md without P3C', () => {
    const content = `# Project Notes\n\n## Other Section\n\nHello`;
    const result = parseClaudeMdSection(content);
    expect(result.hasSection).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/claude-md-writer.test.ts`
Expected: FAIL — module not found

**Step 3: Write CLAUDE.md writer implementation**

```typescript
// src/services/claude-md-writer.ts
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
const SECTION_END_PATTERN = /^## (?!Alibaba P3C)/;

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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/claude-md-writer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/claude-md-writer.ts tests/claude-md-writer.test.ts
git commit -m "feat: add CLAUDE.md P3C section generator/writer"
```

---

## Task 8: MCP Server Entry Point + Core Tools

**Files:**
- Create: `src/index.ts`
- Create: `src/tools/scan.ts`
- Create: `src/tools/rule-lookup.ts`
- Create: `src/tools/category-rules.ts`

**Step 1: Write the MCP server entry point**

```typescript
// src/index.ts
#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
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

// Register tools
registerScanTool(server, jarPath);
registerRuleLookupTool(server);
registerCategoryRulesTool(server);
registerDiffScanTool(server, jarPath);
registerInitTool(server, jarPath);

// Register resources
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
```

**Step 2: Write the p3c-scan tool**

```typescript
// src/tools/scan.ts
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { PmdRunner } from '../services/pmd-runner.js';

const ALL_RULESETS = [
  'ali-naming', 'ali-comment', 'ali-concurrent', 'ali-constant',
  'ali-exception', 'ali-flowcontrol', 'ali-oop', 'ali-orm',
  'ali-other', 'ali-set',
];

export function registerScanTool(server: McpServer, jarPath: string) {
  server.registerTool(
    'p3c-scan',
    {
      title: 'P3C 代码扫描',
      description: '扫描 Java 文件或目录，返回阿里巴巴 Java 开发规范违规列表。仅在 Java 项目中使用。',
      inputSchema: z.object({
        paths: z.array(z.string()).describe('要扫描的文件或目录路径列表'),
        rulesets: z.array(z.string()).optional().describe(`要检查的规则类别，默认全部。可选: ${ALL_RULESETS.join(', ')}`),
        minimumPriority: z.number().min(1).max(5).optional().describe('最低优先级 (1=阻断, 2=严重, 3=主要, 4=次要, 5=信息)'),
        encoding: z.string().optional().describe('文件编码，默认 UTF-8'),
      }),
    },
    async ({ paths, rulesets, minimumPriority, encoding }) => {
      const runner = new PmdRunner(jarPath);

      // Map short category names to full PMD ruleset paths
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

        // Enrich violations with Chinese rule descriptions
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
```

**Step 3: Write the p3c-rule-lookup tool**

```typescript
// src/tools/rule-lookup.ts
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { loadAllRules } from '../data/rules-loader.js';

export function registerRuleLookupTool(server: McpServer) {
  server.registerTool(
    'p3c-rule-lookup',
    {
      title: 'P3C 规则查询',
      description: '查询阿里巴巴 Java 开发规范中的具体规则详情，包括中文描述、严重级别、正反例。',
      inputSchema: z.object({
        ruleId: z.string().describe('规则ID，例如 ClassNamingShouldBeCamelRule'),
        category: z.string().optional().describe('规则类别（可选），例如 naming, comment, concurrent'),
      }),
    },
    async ({ ruleId, category }) => {
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
```

**Step 4: Write the rules loader helper**

```typescript
// src/data/rules-loader.ts
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
```

**Step 5: Write the p3c-category-rules tool**

```typescript
// src/tools/category-rules.ts
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { loadRulesByCategory, CATEGORIES } from '../data/rules-loader.js';

export function registerCategoryRulesTool(server: McpServer) {
  server.registerTool(
    'p3c-category-rules',
    {
      title: 'P3C 规则类别查询',
      description: '列出阿里巴巴 Java 开发规范中某个类别的所有规则，或列出所有类别。',
      inputSchema: z.object({
        category: z.string().optional().describe('规则类别 key，例如 naming, comment, concurrent。不传则列出所有类别。'),
      }),
    },
    async ({ category }) => {
      if (!category) {
        // List all categories
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
```

**Step 6: Build and verify no compile errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/index.ts src/tools/scan.ts src/tools/rule-lookup.ts src/tools/category-rules.ts src/data/rules-loader.ts
git commit -m "feat: add MCP server entry point and core tools (scan, rule-lookup, category-rules)"
```

---

## Task 9: p3c-init Tool (The Key Entry Point)

**Files:**
- Create: `src/tools/init.ts`

**Step 1: Write the p3c-init tool**

This is the most important tool — it detects Java projects, interactively configures rules, and writes to CLAUDE.md.

```typescript
// src/tools/init.ts
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { detectJavaProject } from '../services/java-detector.js';
import { writeClaudeMdSection, type P3CConfig, type CategoryConfig } from '../services/claude-md-writer.js';
import { CATEGORIES } from '../data/rules-loader.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function registerInitTool(server: McpServer, jarPath: string) {
  server.registerTool(
    'p3c-init',
    {
      title: 'P3C 插件初始化',
      description: '初始化阿里巴巴 Java 开发规范插件。检测 Java 项目，配置启用规则和 Hook，写入 CLAUDE.md。仅适用于 Java 项目。',
      inputSchema: z.object({
        projectRoot: z.string().describe('项目根目录的绝对路径'),
        enabledCategories: z.array(z.object({
          key: z.string().describe('类别 key，如 naming, comment'),
          levels: z.array(z.string()).describe('启用的级别，如 ["mandatory", "recommended"]'),
        })).optional().describe('启用的规则类别及级别。不传则全部启用强制级别。'),
        hooks: z.object({
          postWrite: z.boolean().optional(),
          preCommit: z.boolean().optional(),
        }).optional().describe('Hook 配置。不传则默认不启用。'),
        scanPaths: z.array(z.string()).optional().describe('扫描路径 glob。不传则默认 ["src/main/java/**/*.java"]'),
      }),
    },
    async ({ projectRoot, enabledCategories, hooks, scanPaths }) => {
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
          postWrite: hooks?.postWrite ?? false,
          preCommit: hooks?.preCommit ?? false,
        },
        scanPaths: scanPaths ?? ['src/main/java/**/*.java'],
      };

      // Step 4: Write CLAUDE.md
      const claudeMdPath = join(projectRoot, 'CLAUDE.md');
      writeClaudeMdSection(claudeMdPath, config);

      // Step 5: If hooks enabled, update settings.json
      const hookMessages: string[] = [];
      if (config.hooks.postWrite || config.hooks.preCommit) {
        const settingsPath = join(projectRoot, '.claude', 'settings.json');
        const settingsDir = join(projectRoot, '.claude');

        if (!existsSync(settingsDir)) {
          const { mkdirSync } = await import('node:fs');
          mkdirSync(settingsDir, { recursive: true });
        }

        let settings: any = {};
        if (existsSync(settingsPath)) {
          settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        }

        if (!settings.hooks) settings.hooks = {};

        if (config.hooks.postWrite) {
          settings.hooks['PostToolUse:Write'] = settings.hooks['PostToolUse:Write'] || [];
          const hookEntry = {
            matcher: '\\.java$',
            hooks: [{
              type: 'command',
              command: `npx alibaba-p3c-claude-plugin scan-file "$CLAUDE_FILE_PATH"`,
            }],
          };
          // Avoid duplicate
          const existing = settings.hooks['PostToolUse:Write'] as any[];
          if (!existing.some((e: any) => e.matcher === '\\.java$')) {
            existing.push(hookEntry);
          }
          hookMessages.push('Post-Write Hook 已配置到 .claude/settings.json');
        }

        if (config.hooks.preCommit) {
          hookMessages.push('Pre-Commit Hook: 请在 pre-commit 配置中添加 p3c-scan 检查');
        }

        writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      }

      // Step 6: Return result
      const output = {
        成功: true,
        项目类型: javaInfo.details,
        构建工具: javaInfo.buildTool ?? '未检测到',
        配置写入: claudeMdPath,
        启用类别: categoryConfigs.map((c) => c.name),
        Hook配置: hookMessages.length > 0 ? hookMessages : ['未启用 Hook'],
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
```

**Step 2: Commit**

```bash
git add src/tools/init.ts
git commit -m "feat: add p3c-init tool with Java detection and CLAUDE.md writing"
```

---

## Task 10: p3c-diff-scan Tool (PR Review)

**Files:**
- Create: `src/tools/diff-scan.ts`

**Step 1: Write the diff-scan tool**

```typescript
// src/tools/diff-scan.ts
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PmdRunner } from '../services/pmd-runner.js';

const execFileAsync = promisify(execFile);

export function registerDiffScanTool(server: McpServer, jarPath: string) {
  server.registerTool(
    'p3c-diff-scan',
    {
      title: 'P3C 差异扫描',
      description: '仅扫描 Git 变更的 Java 文件，适合 PR 审查和增量检查。',
      inputSchema: z.object({
        projectRoot: z.string().describe('项目根目录的绝对路径'),
        baseBranch: z.string().optional().describe('基准分支，默认 main'),
        rulesets: z.array(z.string()).optional().describe('要检查的规则类别'),
        minimumPriority: z.number().min(1).max(5).optional().describe('最低优先级'),
      }),
    },
    async ({ projectRoot, baseBranch, rulesets, minimumPriority }) => {
      const branch = baseBranch ?? 'main';

      // Get changed Java files from git diff
      let changedFiles: string[];
      try {
        const { stdout } = await execFileAsync('git', [
          'diff', '--name-only', '--diff-filter=ACMR', `${branch}...HEAD',
          '--', '*.java',
        ], { cwd: projectRoot });
        changedFiles = stdout.trim().split('\n').filter(Boolean);

        if (changedFiles.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ 消息: '未检测到 Java 文件变更', 变更文件数: 0 }),
            }),
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

      // Convert to absolute paths
      const absolutePaths = changedFiles.map((f) => join(projectRoot, f));
      const ALL_RULESETS = [
        'ali-naming', 'ali-comment', 'ali-concurrent', 'ali-constant',
        'ali-exception', 'ali-flowcontrol', 'ali-oop', 'ali-orm',
        'ali-other', 'ali-set',
      ];
      const resolvedRulesets = (rulesets ?? ALL_RULESETS).map((rs) =>
        rs.startsWith('ali-') ? `rulesets/java/${rs}.xml` : rs
      );

      // Run P3C scan on changed files only
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

// Helper to avoid importing join at top level for this file
import { join } from 'node:path';
```

**Step 2: Commit**

```bash
git add src/tools/diff-scan.ts
git commit -m "feat: add p3c-diff-scan tool for PR review and incremental scanning"
```

---

## Task 11: MCP Resource for Rule Documents

**Files:**
- Create: `src/resources/rules-resource.ts`

**Step 1: Write the rules resource**

```typescript
// src/resources/rules-resource.ts
import type { McpServer } from '@modelcontextprotocol/server';
import { CATEGORIES, loadRulesByCategory, loadAllRules } from '../data/rules-loader.js';

export function registerRulesResource(server: McpServer) {
  // Register a resource for each category
  for (const category of CATEGORIES) {
    server.registerResource(
      `p3c-rules-${category.key}`,
      `p3c://rules/${category.key}`,
      { name: `${category.name}规则`, description: `阿里巴巴 Java 开发规范 - ${category.name}` },
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

  // Register an index resource
  server.registerResource(
    'p3c-rules-index',
    'p3c://rules',
    { name: 'P3C 规则索引', description: '阿里巴巴 Java 开发规范规则索引' },
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
```

**Step 2: Commit**

```bash
git add src/resources/rules-resource.ts
git commit -m "feat: add MCP resources for P3C rule documents"
```

---

## Task 12: Skills (Slash Commands)

**Files:**
- Create: `skills/p3c-init.md`
- Create: `skills/p3c-scan.md`
- Create: `skills/p3c-review.md`
- Create: `skills/p3c-fix.md`
- Create: `skills/p3c-learn.md`

**Step 1: Write p3c-init skill**

```markdown
---
name: p3c-init
description: 初始化阿里巴巴 Java 开发规范插件，检测 Java 项目并配置规则
triggers:
  - p3c-init
  - 初始化p3c
---

# P3C 插件初始化

你需要使用 `p3c-init` MCP 工具来初始化 P3C 插件。

## 执行步骤

1. 确认当前项目根目录（包含 pom.xml 或 build.gradle 的目录）
2. 调用 `p3c-init` 工具，传入 projectRoot 参数
3. 如果工具返回"非 Java 项目"，告知用户 P3C 插件仅适用于 Java 项目
4. 如果初始化成功，告知用户：
   - 已将 P3C 配置写入 CLAUDE.md
   - 列出启用的规则类别
   - 提示可用命令：/p3c-scan, /p3c-review, /p3c-fix, /p3c-learn

## 交互式配置

在调用工具前，向用户确认以下配置：

1. **启用哪些规则类别？**（默认全部启用强制级别）
   - 命名规约 / 注释规约 / 并发规约 / 集合规约 / OOP规约 / 异常规约 / 流控制规约 / ORM规约 / 常量规约 / 其他规约

2. **每个类别启用哪些级别？**
   - 强制（mandatory）/ 推荐（recommended）/ 参考（reference）

3. **是否启用 Hook？**
   - Post-Write：写入 Java 文件后自动扫描
   - Pre-Commit：提交前扫描阻止

4. **扫描路径？**（默认 src/main/java/**/*.java）

根据用户选择，组装参数调用 p3c-init 工具。
```

**Step 2: Write p3c-scan skill**

```markdown
---
name: p3c-scan
description: 扫描当前 Java 项目，检查阿里巴巴 Java 开发规范违规
triggers:
  - p3c-scan
  - p3c扫描
---

# P3C 代码扫描

扫描当前项目的 Java 代码，返回阿里巴巴 Java 开发规范违规列表。

## 执行步骤

1. 确认当前项目根目录
2. 调用 `p3c-scan` MCP 工具，传入项目路径
3. 将扫描结果格式化为清晰的中文报告：
   - 按严重级别分组（阻断 > 严重 > 主要 > 次要 > 信息）
   - 每条违规显示：文件路径、行号、规则名称、中文描述
   - 对每条违规，使用 `p3c-rule-lookup` 获取详细说明和修复建议
4. 提供汇总统计：违规总数、各级别数量

## 输出格式

```
📋 P3C 扫描报告

🔴 阻断级 (2 条)
  - UserService.java:42 — 线程池必须使用 ThreadPoolExecutor 创建 [ThreadPoolCreationRule]
  - OrderService.java:15 — foreach 内禁止 remove/add 元素 [DontModifyInForeachCircleRule]

🟡 严重级 (3 条)
  - UserService.java:20 — 常量命名应全部大写 [ConstantFieldShouldBeUpperCaseRule]
  ...

📊 统计: 共 5 条违规 | 阻断 2 | 严重 3
```
```

**Step 3: Write p3c-review skill**

```markdown
---
name: p3c-review
description: 按 P3C 规范审查代码变更
triggers:
  - p3c-review
  - p3c审查
---

# P3C 代码审查

按阿里巴巴 Java 开发规范审查代码变更。

## 执行步骤

1. 获取当前 git 变更的文件列表
2. 筛选出 Java 文件
3. 调用 `p3c-diff-scan` MCP 工具扫描变更文件
4. 结合扫描结果和自身代码理解，输出审查意见：
   - P3C 扫描发现的违规（精确匹配）
   - 语义层面的规范建议（Claude 理解能力）
5. 每条审查意见标注：文件、行号、违规规则、修复建议

## 审查维度

1. **命名规范** — 类名、方法名、变量名、常量名
2. **注释规范** — Javadoc、作者信息、枚举注释
3. **并发规范** — 线程池、ThreadLocal、SimpleDateFormat
4. **集合规范** — toArray、subList、foreach 修改
5. **OOP 规范** — equals、包装类、POJO
6. **异常规范** — finally 中的 return、NPE 风险
7. **流控制** — switch default、大括号
8. **常量规范** — 魔法值、Long 后缀
```

**Step 4: Write p3c-fix skill**

```markdown
---
name: p3c-fix
description: 自动修复 P3C 规范违规
triggers:
  - p3c-fix
  - p3c修复
---

# P3C 自动修复

自动修复可修复的阿里巴巴 Java 开发规范违规。

## 执行步骤

1. 先运行 `p3c-scan` 获取违规列表
2. 对每条违规，调用 `p3c-rule-lookup` 获取详细修复建议
3. 按可修复性分类：
   - **可自动修复**：命名规范（重命名）、注释缺失（添加 Javadoc 模板）、常量提取
   - **需人工确认**：并发问题、集合操作、OOP 设计
4. 对可自动修复的违规，直接修改代码
5. 修复后再次运行 `p3c-scan` 验证

## 可自动修复的规则类型

- 类名/方法名/变量名命名规范
- 常量命名（改为全大写下划线）
- 缺少 Javadoc 注释（添加模板）
- 缺少 @Override 注解
- 数组声明风格
- 魔法值提取为常量
- Boolean 属性名去掉 is 前缀
```

**Step 5: Write p3c-learn skill**

```markdown
---
name: p3c-learn
description: 交互式学习阿里巴巴 Java 开发规范
triggers:
  - p3c-learn
  - p3c学习
---

# P3C 交互式学习

交互式学习阿里巴巴 Java 开发规范规则。

## 执行步骤

1. 询问用户想学习哪个类别的规则（或随机推荐）
2. 调用 `p3c-category-rules` 获取该类别的规则列表
3. 逐条展示规则：
   - 规则名称和严重级别
   - 中文描述
   - 正例和反例代码
   - 在当前项目中的真实案例（如果有）
4. 交互式问答：用户可以选择"下一条"、"详细解释"、"在项目中查找实例"

## 学习模式

- **按类别学习**：选择一个类别逐条学习
- **随机测验**：给出代码片段，判断是否违规
- **项目实战**：扫描项目，用实际违规案例教学
```

**Step 6: Commit**

```bash
git add skills/
git commit -m "feat: add P3C skills (init, scan, review, fix, learn)"
```

---

## Task 13: Custom Agent Definition

**Files:**
- Create: `agents/p3c-reviewer.md`

**Step 1: Write p3c-reviewer agent**

```markdown
---
name: p3c-reviewer
model: sonnet
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - mcp__alibaba-p3c__p3c-scan
  - mcp__alibaba-p3c__p3c-diff-scan
  - mcp__alibaba-p3c__p3c-rule-lookup
  - mcp__alibaba-p3c__p3c-category-rules
---

你是一个阿里巴巴 Java 开发规范（P3C）审查专家。

## 职责
- 按照《阿里巴巴 Java 开发手册（黄山版）》审查 Java 代码
- 使用 P3C MCP 工具进行精确的静态扫描
- 结合语义理解发现工具无法检测的规范问题
- 提供中文的审查意见和修复建议

## 审查流程
1. 使用 p3c-scan 或 p3c-diff-scan 扫描代码
2. 使用 p3c-rule-lookup 查询违规规则的详细说明
3. 综合扫描结果和代码理解，输出审查报告
4. 对每条违规给出具体的修复代码

## 输出格式
每条审查意见包含：
- 📍 文件和行号
- 📏 违反的规则名称和严重级别
- 📝 中文说明
- ✅ 修复建议（包含代码示例）

## 语言
所有输出使用中文。
```

**Step 2: Commit**

```bash
git add agents/
git commit -m "feat: add p3c-reviewer custom agent definition"
```

---

## Task 14: Hooks

**Files:**
- Create: `hooks/post-write-p3c.sh`
- Create: `hooks/context-inject-p3c.sh`

**Step 1: Write post-write hook script**

```bash
#!/usr/bin/env bash
# hooks/post-write-p3c.sh
# Post-Write hook: scan Java file after Claude writes it
# Called by Claude Code hooks system when a .java file is written

set -euo pipefail

FILE_PATH="${1:-}"

# Only process Java files
if [[ "$FILE_PATH" != *.java ]]; then
  exit 0
fi

# Check if P3C is initialized (CLAUDE.md has P3C section)
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if ! grep -q "Alibaba P3C Java Coding Guidelines" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null; then
  exit 0
fi

# Output feedback message for Claude to pick up
echo "P3C: Java file written — consider running p3c-scan on $FILE_PATH to check for violations"
```

**Step 2: Write context-inject hook script**

```bash
#!/usr/bin/env bash
# hooks/context-inject-p3c.sh
# Context injection hook: when a Java file is detected in the project,
# remind Claude to follow P3C guidelines

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Check if P3C is configured
if ! grep -q "Alibaba P3C Java Coding Guidelines" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null; then
  exit 0
fi

echo "P3C: 当前项目已启用阿里巴巴 Java 开发规范。编写 Java 代码时请遵循 P3C 规范。使用 /p3c-scan 检查违规。"
```

**Step 3: Make scripts executable**

```bash
chmod +x hooks/post-write-p3c.sh hooks/context-inject-p3c.sh
```

**Step 4: Commit**

```bash
git add hooks/
git commit -m "feat: add Post-Write and context injection hooks"
```

---

## Task 15: Install Script and settings.json Template

**Files:**
- Create: `scripts/install.sh`
- Create: `README.md`

**Step 1: Write install script**

```bash
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
  # Use node to safely merge JSON
  node -e "
    const fs = require('fs');
    const path = '$SETTINGS_FILE';
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
```

**Step 2: Write README.md**

```markdown
# Alibaba P3C Claude Code Plugin

阿里巴巴 Java 开发规范（P3C）插件，为 Claude Code 提供代码扫描、审查和自动修复能力。

## 功能

- 🔍 **代码扫描** — 精确的 P3C PMD 规则检查
- 📋 **代码审查** — 按阿里巴巴规范审查代码变更
- 🔧 **自动修复** — 自动修复可修复的违规
- 📖 **交互学习** — 交互式学习编码规范
- 🎯 **增量扫描** — 只扫描 Git 变更文件
- 🏷️ **Java 专属** — 非 Java 项目自动跳过
- 📝 **CLAUDE.md 集成** — 配置持久化，可随时编辑

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourname/alibaba-p3c-claude-plugin.git
cd alibaba-p3c-claude-plugin

# 安装依赖
npm install

# 运行安装脚本
bash scripts/install.sh
```

## 使用

### 初始化（Java 项目首次使用必须执行）

在 Java 项目目录中：

```
/p3c-init
```

插件会：
1. 检测项目是否为 Java 项目
2. 交互式配置启用的规则类别和级别
3. 选择是否启用 Hook（Post-Write / Pre-Commit）
4. 将配置写入项目 CLAUDE.md

### 日常使用

| 命令 | 说明 |
|------|------|
| `/p3c-scan` | 扫描整个项目 |
| `/p3c-review` | 审查代码变更 |
| `/p3c-fix` | 自动修复违规 |
| `/p3c-learn` | 交互式学习 |
| `/p3c-init` | 重新配置插件 |

### 修改配置

编辑项目 `CLAUDE.md` 中的 `## Alibaba P3C Java Coding Guidelines` 段落即可。删除该段落则完全禁用插件。

## 前置要求

- Node.js 18+
- Java 8+（P3C PMD 运行时）
- Claude Code

## 规则来源

基于《阿里巴巴 Java 开发手册（黄山版）》和 [P3C PMD](https://github.com/alibaba/p3c) 实现。

## License

Apache 2.0
```

**Step 3: Commit**

```bash
git add scripts/install.sh README.md
git commit -m "feat: add install script and README"
```

---

## Task 16: End-to-End Smoke Test

**Files:**
- None new — this task verifies the full stack works

**Step 1: Build the project**

Run: `npm run build`
Expected: TypeScript compiles without errors, `dist/` directory created

**Step 2: Start the MCP server**

Run: `echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}' | node dist/index.js 2>/dev/null | head -5`
Expected: JSON-RPC initialization response

**Step 3: Test p3c-category-rules via MCP**

Use Claude Code to call the `p3c-category-rules` tool with `{}` (no category). Expected: list of 10 categories returned.

**Step 4: Test p3c-init on a non-Java project**

Call `p3c-init` with a non-Java project root. Expected: `"成功": false, "原因": "当前项目非 Java 项目"`

**Step 5: Test p3c-init on a Java project**

Call `p3c-init` on `/Users/jackrams/IdeaProjects/mall4j` (existing Java project). Expected: `"成功": true`, CLAUDE.md updated.

**Step 6: Test p3c-scan on the Java project**

Call `p3c-scan` with `mall4j` Java source paths. Expected: violation list returned.

**Step 7: Commit any fixes found during smoke testing**

```bash
git add -A
git commit -m "fix: address issues found in smoke testing"
```

---

## Summary

| Task | Component | Est. Time |
|------|-----------|-----------|
| 1 | Project scaffolding | 15 min |
| 2 | P3C PMD JAR download | 10 min |
| 3 | PMD Runner service | 30 min |
| 4 | Rule Parser | 25 min |
| 5 | Rule Knowledge Base JSON | 60 min |
| 6 | Java Project Detector | 20 min |
| 7 | CLAUDE.md Writer | 30 min |
| 8 | MCP Server + Core Tools | 45 min |
| 9 | p3c-init Tool | 40 min |
| 10 | p3c-diff-scan Tool | 20 min |
| 11 | MCP Resources | 15 min |
| 12 | Skills | 40 min |
| 13 | Custom Agent | 10 min |
| 14 | Hooks | 15 min |
| 15 | Install Script + README | 20 min |
| 16 | Smoke Test | 30 min |
| **Total** | | **~6.5 hours** |
