扫描当前 Java 项目的阿里巴巴 Java 开发规范违规。

## 执行步骤

1. 确认当前项目根目录
2. 调用 `p3c-scan` MCP 工具，传入项目路径
3. 将扫描结果格式化为清晰的中文报告：
   - 按严重级别分组（阻断 > 严重 > 主要 > 次要 > 信息）
   - 每条违规显示：文件路径、行号、规则名称、中文描述
   - 对关键违规，使用 `p3c-rule-lookup` 获取详细说明和修复建议
4. 提供汇总统计：违规总数、各级别数量

## 输出格式示例

```
📋 P3C 扫描报告

🔴 阻断级 (2 条)
  - UserService.java:42 — 线程池必须使用 ThreadPoolExecutor 创建 [ThreadPoolCreationRule]

🟡 严重级 (3 条)
  - UserService.java:20 — 常量命名应全部大写 [ConstantFieldShouldBeUpperCaseRule]

📊 统计: 共 5 条违规 | 阻断 2 | 严重 3
```
