# 版本兼容与运行边界

> 本页说明哪些代码在浏览器中使用真实依赖，哪些能力由确定性替身模拟，以及仓库当前验证的版本范围。

## 两种运行模式

| 模式 | 需要 API Key | 使用场景 | 真实性边界 |
|------|--------------|----------|------------|
| [浏览器训练场](/playground/) | 否 | 学习 API、完成练习、稳定断言 | `@langchain/core`、Zod、文本切分器是真实包；模型、Embedding、MCP 连接和向量存储是本地确定性替身 |
| [`examples/`](https://github.com/2720768239/langchainjs-handbook/tree/main/examples) | 真实模型示例需要；MCP 示例不需要 | 验证真实包、真实网络或本地服务行为 | 使用正式 LangChain.js 与 MCP TypeScript SDK；RAG 示例仅将 Embedding 替换为明确标注的本地哈希实现 |

Mock 的目标是复现本课程用到的 API 形状和控制流，不承诺覆盖提供商差异、网络错误、token 计费、延迟或完整 SDK 行为。涉及上线决策时，以真实示例和官方文档为准。

## 当前验证基线

最后核对：**2026-08-19**。

| 组件 | 仓库基线 |
|------|----------|
| Node.js | 项目统一使用 22+；这是本仓库的测试基线，不是 LangChain.js 的全部支持范围 |
| LangChain.js | `langchain` 1.5.x、`@langchain/core` 1.2.x；精确版本以 `package-lock.json` 为准 |
| MCP TypeScript SDK | 2.0.x 分包 API：`@modelcontextprotocol/server` 与 `@modelcontextprotocol/node` |
| VitePress | 1.6.x |

依赖升级时，至少运行：

```bash
npm run typecheck
npm run test:samples
npm run test:exercises
npm run test:demos
npm run build
```

若官方 API 与正文冲突，欢迎提交 Issue，并附上官方文档链接、受影响章节和复现代码。
