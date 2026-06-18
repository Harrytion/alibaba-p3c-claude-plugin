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
2. 在调用工具前，向用户确认以下配置：
   - **启用哪些规则类别？**（默认全部启用强制级别）
     - 命名规约 / 注释规约 / 并发规约 / 集合规约 / OOP规约 / 异常规约 / 流控制规约 / ORM规约 / 常量规约 / 其他规约
   - **每个类别启用哪些级别？** 强制（mandatory）/ 推荐（recommended）/ 参考（reference）
   - **是否启用 Hook？**
     - Post-Write：写入 Java 文件后自动扫描
     - Pre-Commit：提交前扫描阻止
   - **扫描路径？**（默认 src/main/java/**/*.java）
3. 根据用户选择，组装参数调用 p3c-init 工具
4. 如果工具返回"非 Java 项目"，告知用户 P3C 插件仅适用于 Java 项目
5. 如果初始化成功，告知用户配置已写入 CLAUDE.md，并列出可用命令
