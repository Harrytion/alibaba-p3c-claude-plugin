# Alibaba P3C Claude Code Plugin

阿里巴巴 Java 开发规范（P3C）插件，为 Claude Code 提供代码扫描、审查和自动修复能力。

基于 [P3C PMD](https://github.com/alibaba/p3c) 实现，遵循《阿里巴巴 Java 开发手册（黄山版）》。

## 功能

- 🔍 **代码扫描** — 精确的 P3C PMD 规则检查（54+ 条规则）
- 📋 **代码审查** — 按阿里巴巴规范审查代码变更
- 🔧 **自动修复** — 自动修复可修复的违规
- 📖 **交互学习** — 交互式学习编码规范
- 🎯 **增量扫描** — 只扫描 Git 变更文件
- 🏷️ **Java 专属** — 非 Java 项目自动跳过
- 📝 **CLAUDE.md 集成** — 配置持久化，可随时编辑修改

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
1. 检测项目是否为 Java 项目（检查 pom.xml / build.gradle / .java 文件）
2. 交互式配置启用的规则类别和级别
3. 选择是否启用 Hook（Post-Write / Pre-Commit）
4. 将配置写入项目 CLAUDE.md

**非 Java 项目会自动跳过**，不会产生任何影响。

### 日常使用

| 命令 | 说明 |
|------|------|
| `/p3c-scan` | 扫描整个项目 |
| `/p3c-review` | 审查代码变更 |
| `/p3c-fix` | 自动修复违规 |
| `/p3c-learn` | 交互式学习 |
| `/p3c-init` | 重新配置插件 |

### 修改配置

编辑项目 `CLAUDE.md` 中的 `## Alibaba P3C Java Coding Guidelines` 段落即可。

删除该段落则完全禁用插件。

## MCP 工具列表

| 工具 | 说明 |
|------|------|
| `p3c-scan` | 扫描 Java 文件/目录，返回违规列表 |
| `p3c-rule-lookup` | 查询规则详情（中文描述、正反例） |
| `p3c-category-rules` | 列出某个类别的所有规则 |
| `p3c-diff-scan` | 仅扫描 Git 变更的 Java 文件 |
| `p3c-init` | 初始化插件，检测 Java 项目，写入 CLAUDE.md |

## 规则类别

| 类别 | 说明 | 规则数 |
|------|------|--------|
| 命名规约 | 类名、方法名、变量名、常量名等 | 11 |
| 注释规约 | Javadoc、作者信息、枚举注释等 | 6 |
| 并发规约 | 线程池、ThreadLocal、SimpleDateFormat 等 | 9 |
| 集合规约 | toArray、subList、foreach 修改等 | 6 |
| OOP 规约 | equals、包装类、POJO 等 | 7 |
| 异常规约 | finally、NPE 风险等 | 3 |
| 流控制规约 | switch default、大括号等 | 4 |
| 常量规约 | 魔法值、Long 后缀等 | 2 |
| ORM 规约 | iBatis 相关 | 1 |
| 其他规约 | 正则预编译、日期格式化、方法长度等 | 7 |

## 前置要求

- Node.js 18+
- Java 8+（P3C PMD 运行时）
- Claude Code

## 规则来源

基于《阿里巴巴 Java 开发手册（黄山版）》和 [P3C PMD](https://github.com/alibaba/p3c) 实现。

## License

Apache 2.0
