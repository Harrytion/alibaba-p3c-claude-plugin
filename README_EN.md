# Alibaba P3C Claude Code Plugin

English | [中文](README.md)

<p align="center">
  <strong>Alibaba Java Coding Guidelines × Claude Code</strong><br>
  Make AI coding assistants automatically follow the <em>Alibaba Java Coding Guidelines (Huangshan Edition)</em>
</p>

---

Built on [P3C PMD](https://github.com/alibaba/p3c), provides Java code standard scanning, review, and auto-fix capabilities for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 Code Scanning | Uses the P3C PMD engine to accurately detect 54+ rule violations |
| 📋 Code Review | Reviews Git changes against P3C standards, combining semantic understanding to catch issues tools miss |
| 🔧 Auto Fix | Automatically fixes naming conventions, missing comments, constant extraction, and other fixable violations |
| 📖 Interactive Learning | Learn rules one by one, with positive/negative examples and project practice mode |
| 🎯 Incremental Scan | Only scan Git-changed Java files for fast feedback |
| 🏷️ Java Only | Non-Java projects are automatically skipped — zero interference |
| 📝 CLAUDE.md Integration | Configuration persisted to project CLAUDE.md, editable at any time |
| 🪝 Hook Support | Post-Write / Pre-Commit Hooks — check on write |

## 📦 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Java](https://adoptium.net/) 8+ (P3C PMD runtime)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI

### One-Click Install

```bash
git clone https://github.com/Harrytion/alibaba-p3c-claude-plugin.git
cd alibaba-p3c-claude-plugin
npm install
bash scripts/install.sh
```

The install script will automatically:

1. Download the P3C PMD JAR (v2.1.1, ~8MB)
2. Compile the TypeScript MCP Server
3. Register the `alibaba-p3c` MCP Server in `~/.claude/settings.json`
4. Install Skills, Agents, and Commands to `~/.claude/`

### Uninstall

```bash
# 1. Remove MCP Server from settings.json
# Edit ~/.claude/settings.json and delete the "alibaba-p3c" entry

# 2. Remove installed files
rm ~/.claude/skills/p3c-*.md
rm ~/.claude/agents/p3c-reviewer.md
rm ~/.claude/commands/p3c-*.md

# 3. (Optional) Delete the plugin source
rm -rf /path/to/alibaba-p3c-claude-plugin
```

## 🚀 Usage

### Initialization (Required for first use in a Java project)

Launch Claude Code in your Java project directory and run:

```
/project:p3c-init
```

The plugin will interactively guide you through:

1. **Detect Java Project** — Automatically identifies Maven / Gradle projects
2. **Select Rule Categories** — 10 categories, enable as needed
3. **Select Rule Levels** — Mandatory / Recommended / Reference
4. **Configure Hooks** — Post-Write (scan on write) / Pre-Commit (block before commit)
5. **Write CLAUDE.md** — Persist configuration, editable at any time

> Non-Java projects are automatically skipped with no impact.

### Daily Commands

| Command | Description |
|---------|-------------|
| `/project:p3c-scan` | Scan the entire project and output a violation report |
| `/project:p3c-review` | Review Java code in Git changes |
| `/project:p3c-fix` | Automatically fix fixable violations |
| `/project:p3c-learn` | Interactively learn coding standards |
| `/project:p3c-init` | Reconfigure the plugin |

### Modify Configuration

Edit the `## Alibaba P3C Java Coding Guidelines` section in your project's `CLAUDE.md` to adjust rules.

Delete that section to completely disable the plugin.

## 🛠️ MCP Tools

The plugin exposes the following tools via the MCP Server, which Claude can call directly:

| Tool | Description |
|------|-------------|
| `p3c-scan` | Scan Java files/directories and return a violation list |
| `p3c-diff-scan` | Only scan Git-changed Java files |
| `p3c-rule-lookup` | Look up rule details (description, positive/negative examples) |
| `p3c-category-rules` | List all rules in a category |
| `p3c-init` | Initialize the plugin, detect Java project, write CLAUDE.md |

## 📏 Rule Categories

Based on the *Alibaba Java Coding Guidelines (Huangshan Edition)*, covering 10 categories with 54+ rules:

| Category | Key | Description | Rules |
|----------|-----|-------------|-------|
| Naming Conventions | `naming` | UpperCamelCase for classes, lowerCamelCase for methods, UPPER_CASE for constants, etc. | 11 |
| Comment Conventions | `comment` | Javadoc, author info, enum comments, etc. | 6 |
| Concurrency Conventions | `concurrent` | Thread pool creation, ThreadLocal, SimpleDateFormat, etc. | 9 |
| Collection Conventions | `set` | toArray, subList, foreach modification, etc. | 6 |
| OOP Conventions | `oop` | equals, wrapper class comparison, POJO, etc. | 7 |
| Exception Conventions | `exception` | finally blocks, NPE risks, etc. | 3 |
| Flow Control Conventions | `flowcontrol` | switch default, braces, etc. | 4 |
| Constant Conventions | `constant` | Magic values, Long suffix, etc. | 2 |
| ORM Conventions | `orm` | iBatis-related | 1 |
| Other Conventions | `other` | Regex pre-compilation, date formatting, method length, etc. | 7 |

Each rule has three levels: **Mandatory**, **Recommended**, and **Reference**.

## 🏗️ Project Structure

```
alibaba-p3c-claude-plugin/
├── .claude/
│   ├── commands/          # Slash commands (/project:p3c-*)
│   │   ├── p3c-init.md
│   │   ├── p3c-scan.md
│   │   ├── p3c-review.md
│   │   ├── p3c-fix.md
│   │   └── p3c-learn.md
│   └── skills/            # Skills (AI instruction specs)
│       ├── p3c-init.md
│       ├── p3c-scan.md
│       ├── p3c-review.md
│       ├── p3c-fix.md
│       └── p3c-learn.md
├── agents/
│   └── p3c-reviewer.md    # P3C review expert agent
├── hooks/
│   ├── post-write-p3c.sh  # Post-Write Hook
│   └── context-inject-p3c.sh  # Context injection Hook
├── src/
│   ├── index.ts           # MCP Server entry
│   ├── tools/             # MCP tool implementations
│   │   ├── scan.ts        # p3c-scan
│   │   ├── diff-scan.ts   # p3c-diff-scan
│   │   ├── rule-lookup.ts # p3c-rule-lookup
│   │   ├── category-rules.ts  # p3c-category-rules
│   │   └── init.ts        # p3c-init
│   ├── services/          # Core services
│   │   ├── pmd-runner.ts  # P3C PMD executor
│   │   ├── rule-parser.ts # PMD XML result parser
│   │   ├── java-detector.ts   # Java project detector
│   │   └── claude-md-writer.ts # CLAUDE.md reader/writer
│   ├── data/
│   │   ├── rules-loader.ts    # Rule loader
│   │   └── rules/         # Rule data (JSON)
│   └── resources/
│       └── rules-resource.ts  # MCP Resource
├── lib/
│   └── p3c-pmd-2.1.1-jar-with-dependencies.jar  # P3C PMD runtime
├── scripts/
│   ├── install.sh         # One-click install script
│   └── download-pmd.sh    # P3C PMD JAR downloader
├── tests/                 # Vitest tests
├── skills/                # Source skills (copied to ~/.claude/skills/ on install)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Download P3C PMD JAR
npm run download-pmd

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Test watch mode
npm run test:watch
```

## 🪝 Hook Configuration

The plugin provides two hook scripts that need to be configured in your project's `.claude/settings.json`:

### Post-Write Hook

Automatically prompts a scan after writing a Java file:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "bash /path/to/alibaba-p3c-claude-plugin/hooks/post-write-p3c.sh \"$FILE_PATH\""
      }]
    }]
  }
}
```

### Context Injection Hook

Injects P3C standard context at the start of each session:

```json
{
  "hooks": {
    "SessionStart": [{
      "type": "command",
      "command": "bash /path/to/alibaba-p3c-claude-plugin/hooks/context-inject-p3c.sh"
    }]
  }
}
```

> Hooks only take effect when the project CLAUDE.md contains a P3C configuration section. Non-Java projects are automatically skipped.

## ❓ FAQ

<details>
<summary>Commands not recognized after installation?</summary>

Restart Claude Code for the MCP Server and Commands to take effect. The MCP Server connects at session startup, and Commands are loaded on startup.
</details>

<details>
<summary>Will non-Java projects be affected?</summary>

No. `p3c-init` detects the project type and automatically skips non-Java projects (no pom.xml / build.gradle / .java files). Hook scripts also only trigger when CLAUDE.md contains a P3C configuration.
</details>

<details>
<summary>How to enable only some rules?</summary>

Re-run `/project:p3c-init` to select the categories and levels you need, or directly edit the P3C configuration section in CLAUDE.md.
</details>

<details>
<summary>P3C PMD JAR download failed?</summary>

Manually download [p3c-pmd-2.1.1-jar-with-dependencies.jar](https://repo1.maven.org/maven2/com/alibaba/p3c/p3c-pmd/2.1.1/p3c-pmd-2.1.1-jar-with-dependencies.jar) and place it in the `lib/` directory.
</details>

## 📄 License

[MIT](LICENSE)

## 🙏 Acknowledgments

- [Alibaba P3C](https://github.com/alibaba/p3c) — P3C PMD rule engine
- *Alibaba Java Coding Guidelines (Huangshan Edition)* — Source of the coding standards
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — MCP protocol and plugin system
