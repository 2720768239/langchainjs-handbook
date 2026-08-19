# LangChain.js 学习笔记

> 9 章中文笔记 + 15 道浏览器练习，从第一次模型调用走到 Agentic RAG。

这里是全站的学习入口。第 01～08 章是主线；第 00 章只用于配置真实模型环境，如果只看笔记和使用训练场，可以先跳过。

::: tip 第一次来？
先读[第 01 章：初识 LangChain.js](/guide/01-introduction)，再完成[第一道练习](/playground/?id=ch01-hello-llm)。浏览器训练场无需安装，也不需要 API Key。
:::

## 先选一个起点

| 你的情况 | 建议路线 |
|----------|----------|
| 第一次接触 LangChain.js | 01 → 08，按顺序学习 |
| 已经调用过 LLM API | 快速浏览 01～02，从 03 的提示词与结构化输出开始 |
| 只想学习 Agentic RAG | 04 工具 → 05 Agent → 07 检索 → 08 Agentic RAG |
| 准备连接真实模型 | 先完成 01，再回到 00 配置环境 |

## 9 章学习路线

| 章节 | 读完能够做什么 | 练习 |
|------|----------------|------|
| [00. 环境搭建](/guide/00-setup) | 配置 Node.js、环境变量与真实模型提供商 | 可选，无浏览器练习 |
| [01. 初识 LangChain.js](/guide/01-introduction) | 完成第一次模型调用，区分 System、Human、AI 消息 | [第一次 LLM 调用](/playground/?id=ch01-hello-llm) |
| [02. Chat 模型与基本交互](/guide/02-chat-models) | 管理对话历史，使用 `stream()` 读取流式输出 | [多轮对话](/playground/?id=ch02-multi-turn) · [流式输出](/playground/?id=ch02-streaming) |
| [03. 提示词、消息与结构化输出](/guide/03-prompts) | 复用提示词模板，并用 Zod 约束输出结构 | [3 道练习](/playground/?id=ch03-prompt-template) |
| [04. 函数调用与工具](/guide/04-tools) | 定义工具，并手动完成一次工具调用循环 | [2 道练习](/playground/?id=ch04-define-tool) |
| [05. Agent 入门](/guide/05-agents) | 让 Agent 选择工具、保留短时记忆并输出执行步骤 | [3 道练习](/playground/?id=ch05-create-agent) |
| [06. MCP](/guide/06-mcp) | 通过 MCP 客户端加载外部工具 | [接入 MCP 工具](/playground/?id=ch06-mcp-tools) |
| [07. 文档、Embedding 与语义搜索](/guide/07-embeddings) | 切分文档、生成向量并进行相似度检索 | [2 道练习](/playground/?id=ch07-text-splitter) |
| [08. Agentic RAG](/guide/08-agentic-rag) | 把检索封装成工具，由 Agent 决定何时查询 | [组装 Agentic RAG](/playground/?id=ch08-agentic-rag) |

## 每章怎么学

1. **读笔记**：先看「本章速览」，再理解关键 API、常见坑和核心要点，通常需要 10～20 分钟。
2. **做练习**：补全训练场中的 TODO，先点「运行代码」观察输出，再点「运行测试」检查结果。
3. **对照答案**：卡住时逐条查看提示；完成后再比较参考答案，不必追求逐字一致。
4. **校准真实环境**：需要连接模型或 MCP 时，运行仓库中的 `examples/`，确认真实网络与提供商行为。

## 浏览器练习与真实示例的区别

| 环境 | 适合做什么 | 运行边界 |
|------|------------|----------|
| [代码训练场](/playground/) | 学习 API、完成练习、稳定判题 | 模型、Embedding、MCP 和向量存储使用本地确定性替身；无需 API Key |
| 仓库 `examples/` | 验证真实 SDK、本地 MCP 服务和提供商接入 | 部分示例需要安装依赖、配置 `.env` 或访问网络 |

训练场不是线上模型的替代品。它负责让概念可练、结果可重复；真实响应质量、延迟、限流和网络错误，需要在实际接入时验证。完整说明见[版本兼容与运行边界](/compatibility)。

## 学习前需要什么

- 能阅读基本的 JavaScript/TypeScript，并了解 `async/await`。
- 会使用 Node.js、npm 和命令行；只使用训练场时不必先安装项目。
- 大致知道 LLM、提示词和 token 的含义即可。

## 学完之后

- 需要持久会话、分支流程或人工审批：继续学习 [LangGraph](https://docs.langchain.com/oss/javascript/langgraph/quickstart)。
- 需要观察工具参数、耗时与失败原因：了解 [LangSmith](https://docs.langchain.com/langsmith/observability)。
- 需要规划、子 Agent 和文件系统式上下文：了解 [Deep Agents](https://docs.langchain.com/oss/javascript/deepagents/overview)。

本站内容基于 [microsoft/langchainjs-for-beginners](https://github.com/microsoft/langchainjs-for-beginners)（MIT License）整理提炼，并按当前仓库的 LangChain v1 API、训练场和示例补充说明。
