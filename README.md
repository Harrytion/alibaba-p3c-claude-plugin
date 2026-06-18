# Alibaba P3C Claude Code Plugin

[English](README_EN.md) | 中文

<p align="center">
  <strong>阿里巴巴 Java 开发规范 × Claude Code</strong><br>
  让 AI 编码助手自动遵循《阿里巴巴 Java 开发手册（黄山版）》
</p>

---

基于 [P3C PMD](https://github.com/alibaba/p3c) 实现，为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 提供 Java 代码规范扫描、审查和自动修复能力。

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🔍 代码扫描 | 调用 P3C PMD 引擎，精确检测 54+ 条规则违规 |
| 📋 代码审查 | 按 P3C 规范审查 Git 变更，结合语义理解发现工具盲区 |
| 🔧 自动修复 | 自动修复命名规范、注释缺失、常量提取等可修复违规 |
| 📖 交互学习 | 逐条学习规则，含正反例和项目实战模式 |
| 🎯 增量扫描 | 只扫描 Git 变更的 Java 文件，快速反馈 |
| 🏷️ Java 专属 | 非 Java 项目自动跳过，零干扰 |
| 📝 CLAUDE.md 集成 | 配置持久化到项目 CLAUDE.md，可随时编辑 |
| 🪝 Hook 支持 | Post-Write / Pre-Commit Hook，写入即检查 |

## 📦 安装

### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Java](https://adoptium.net/) 8+（P3C PMD 运行时）
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI

### 一键安装

```bash
git clone https://github.com/Harrytion/alibaba-p3c-claude-plugin.git
cd alibaba-p3c-claude-plugin
npm install
bash scripts/install.sh
```

安装脚本会自动完成：

1. 下载 P3C PMD JAR（v2.1.1，约 8MB）
2. 编译 TypeScript MCP Server
3. 在 `~/.claude/settings.json` 注册 `alibaba-p3c` MCP Server
4. 安装 Skills、Agents 和 Commands 到 `~/.claude/`

### 卸载

```bash
# 1. 从 settings.json 移除 MCP Server
# 编辑 ~/.claude/settings.json，删除 "alibaba-p3c" 条目

# 2. 删除已安装的文件
rm ~/.claude/skills/p3c-*.md
rm ~/.claude/agents/p3c-reviewer.md
rm ~/.claude/commands/p3c-*.md

# 3.（可选）删除插件源码
rm -rf /path/to/alibaba-p3c-claude-plugin
```

## 🚀 使用

### 初始化（Java 项目首次使用必须执行）

在 Java 项目目录中启动 Claude Code，运行：

```
/project:p3c-init
```

插件会交互式引导你配置：

1. **检测 Java 项目** — 自动识别 Maven / Gradle 项目
2. **选择规则类别** — 10 个类别，可按需启用
3. **选择规则级别** — 强制 / 推荐 / 参考
4. **配置 Hook** — Post-Write（写入即扫描）/ Pre-Commit（提交前拦截）
5. **写入 CLAUDE.md** — 配置持久化，随时可编辑

> 非 Java 项目会自动跳过，不会产生任何影响。

### 日常命令

| 命令 | 说明 |
|------|------|
| `/project:p3c-scan` | 扫描整个项目，输出违规报告 |
| `/project:p3c-review` | 审查 Git 变更中的 Java 代码 |
| `/project:p3c-fix` | 自动修复可修复的违规 |
| `/project:p3c-learn` | 交互式学习编码规范 |
| `/project:p3c-init` | 重新配置插件 |

### 修改配置

编辑项目 `CLAUDE.md` 中的 `## Alibaba P3C Java Coding Guidelines` 段落即可调整规则。

删除该段落则完全禁用插件。

## 🛠️ MCP 工具

插件通过 MCP Server 暴露以下工具，Claude 可直接调用：

| 工具 | 说明 |
|------|------|
| `p3c-scan` | 扫描 Java 文件/目录，返回违规列表 |
| `p3c-diff-scan` | 仅扫描 Git 变更的 Java 文件 |
| `p3c-rule-lookup` | 查询规则详情（中文描述、正反例） |
| `p3c-category-rules` | 列出某个类别的所有规则 |
| `p3c-init` | 初始化插件，检测 Java 项目，写入 CLAUDE.md |

## 📏 规则类别

基于《阿里巴巴 Java 开发手册（黄山版）》，共 10 个类别 54+ 条规则：

| 类别 | Key | 说明 | 规则数 |
|------|-----|------|--------|
| 命名规约 | `naming` | 类名 UpperCamelCase、方法名 lowerCamelCase、常量全大写等 | 11 |
| 注释规约 | `comment` | Javadoc、作者信息、枚举注释等 | 6 |
| 并发规约 | `concurrent` | 线程池创建、ThreadLocal、SimpleDateFormat 等 | 9 |
| 集合规约 | `set` | toArray、subList、foreach 修改等 | 6 |
| OOP 规约 | `oop` | equals、包装类比较、POJO 等 | 7 |
| 异常规约 | `exception` | finally 块、NPE 风险等 | 3 |
| 流控制规约 | `flowcontrol` | switch default、大括号等 | 4 |
| 常量规约 | `constant` | 魔法值、Long 后缀等 | 2 |
| ORM 规约 | `orm` | iBatis 相关 | 1 |
| 其他规约 | `other` | 正则预编译、日期格式化、方法长度等 | 7 |

每条规则有三个级别：**强制**（mandatory）、**推荐**（recommended）、**参考**（reference）。

## 🏗️ 项目结构

```
alibaba-p3c-claude-plugin/
├── .claude/
│   ├── commands/          # Slash commands（/project:p3c-*）
│   │   ├── p3c-init.md
│   │   ├── p3c-scan.md
│   │   ├── p3c-review.md
│   │   ├── p3c-fix.md
│   │   └── p3c-learn.md
│   └── skills/            # Skills（AI 指令说明）
│       ├── p3c-init.md
│       ├── p3c-scan.md
│       ├── p3c-review.md
│       ├── p3c-fix.md
│       └── p3c-learn.md
├── agents/
│   └── p3c-reviewer.md    # P3C 审查专家 Agent
├── hooks/
│   ├── post-write-p3c.sh  # Post-Write Hook
│   └── context-inject-p3c.sh  # 上下文注入 Hook
├── src/
│   ├── index.ts           # MCP Server 入口
│   ├── tools/             # MCP 工具实现
│   │   ├── scan.ts        # p3c-scan
│   │   ├── diff-scan.ts   # p3c-diff-scan
│   │   ├── rule-lookup.ts # p3c-rule-lookup
│   │   ├── category-rules.ts  # p3c-category-rules
│   │   └── init.ts        # p3c-init
│   ├── services/          # 核心服务
│   │   ├── pmd-runner.ts  # P3C PMD 执行器
│   │   ├── rule-parser.ts # PMD XML 结果解析
│   │   ├── java-detector.ts   # Java 项目检测
│   │   └── claude-md-writer.ts # CLAUDE.md 读写
│   ├── data/
│   │   ├── rules-loader.ts    # 规则加载器
│   │   └── rules/         # 规则数据（JSON）
│   └── resources/
│       └── rules-resource.ts  # MCP Resource
├── lib/
│   └── p3c-pmd-2.1.1-jar-with-dependencies.jar  # P3C PMD 运行时
├── scripts/
│   ├── install.sh         # 一键安装脚本
│   └── download-pmd.sh    # P3C PMD JAR 下载
├── tests/                 # Vitest 测试
├── skills/                # 源 skills（安装时复制到 ~/.claude/skills/）
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 下载 P3C PMD JAR
npm run download-pmd

# 编译
npm run build

# 监听模式
npm run dev

# 运行测试
npm test

# 测试监听模式
npm run test:watch
```

## 🪝 Hook 配置

插件提供两个 Hook 脚本，需在项目 `.claude/settings.json` 中配置：

### Post-Write Hook

写入 Java 文件后自动提醒扫描：

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

每次会话启动时注入 P3C 规范上下文：

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

> Hook 仅在项目 CLAUDE.md 包含 P3C 配置段时生效，非 Java 项目自动跳过。

## ❓ 常见问题

<details>
<summary>安装后命令不识别？</summary>

重启 Claude Code 使 MCP Server 和 Commands 生效。MCP Server 在会话启动时连接，Commands 在启动时加载。
</details>

<details>
<summary>非 Java 项目会受影响吗？</summary>

不会。`p3c-init` 会检测项目类型，非 Java 项目（无 pom.xml / build.gradle / .java 文件）会自动跳过。Hook 脚本也只在 CLAUDE.md 包含 P3C 配置时才触发。
</details>

<details>
<summary>如何只启用部分规则？</summary>

重新运行 `/project:p3c-init` 选择需要的类别和级别，或直接编辑 CLAUDE.md 中的 P3C 配置段落。
</details>

<details>
<summary>P3C PMD JAR 下载失败？</summary>

手动下载 [p3c-pmd-2.1.1-jar-with-dependencies.jar](https://repo1.maven.org/maven2/com/alibaba/p3c/p3c-pmd/2.1.1/p3c-pmd-2.1.1-jar-with-dependencies.jar) 放到 `lib/` 目录即可。
</details>

## 📄 License

[MIT](LICENSE)

## 🙏 致谢

- [阿里巴巴 P3C](https://github.com/alibaba/p3c) — P3C PMD 规则引擎
- 《阿里巴巴 Java 开发手册（黄山版）》— 规范来源
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — MCP 协议与插件体系
