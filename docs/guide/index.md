# 学习路线图

> 🎯 从零到一掌握 LangChain.js：这里是全站的导航中心，帮你规划学习路径。

本站是 [LangChain.js for Beginners](https://github.com/microsoft/langchainjs-for-beginners) 课程的中文精华笔记，覆盖从环境搭建到构建 Agentic RAG 系统的完整路径。课程采用 **Agent 优先**的教学顺序：先学工具，再学 Agent，最后组合出智能检索系统——这正是现代生产级 AI 应用的构建方式。

## 你将学到什么

- 🤖 **对话式 AI**：带上下文记忆、流式输出、可定制人格的聊天机器人
- 🛠️ **函数调用与工具**：让 AI 调用你的函数、提取结构化数据
- 🚀 **自主 Agent**：会推理、会决策、自己选工具的 AI 系统
- 🌐 **MCP 集成**：用模型上下文协议（Model Context Protocol）连接外部服务
- 🔍 **语义搜索**：理解「含义」而非仅匹配关键词的搜索系统
- 🎯 **Agentic RAG**：由 Agent 自主决定何时检索知识库的智能问答

## 📍 九章知识地图

| 章节 | 核心知识点 | 训练场练习 |
|------|-----------|-----------|
| [00. 环境搭建](/guide/00-setup) | Node.js 22+、GitHub Models 免费 token、`.env` 配置、多提供商切换 | —（先把环境跑通） |
| [01. 初识 LangChain.js](/guide/01-introduction) | 框架价值（五金店类比）、第一次 LLM 调用、三种消息类型、模型对比 | [第一次 LLM 调用](/playground/?id=ch01-hello-llm) |
| [02. Chat 模型与基本交互](/guide/02-chat-models) | 对话历史管理、流式输出 `stream()`、temperature/maxTokens、重试、token 追踪 | [多轮对话](/playground/?id=ch02-multi-turn)、[流式输出](/playground/?id=ch02-streaming) |
| [03. 提示词、消息与结构化输出](/guide/03-prompts) | 提示词模板、Few-Shot、Zod Schema、结构化输出 | [提示词模板](/playground/?id=ch03-prompt-template)、[Few-shot](/playground/?id=ch03-few-shot)、[结构化输出](/playground/?id=ch03-structured-output) |
| [04. 函数调用与工具](/guide/04-tools) | `tool()` 定义、工具绑定、工具调用循环 | [定义工具](/playground/?id=ch04-define-tool)、[手写调用循环](/playground/?id=ch04-tool-loop) |
| [05. Agent 入门](/guide/05-agents) | ReAct 模式、`createAgent()`、Agent 循环、工具自主选择 | [天气助手 Agent](/playground/?id=ch05-create-agent) |
| [06. 模型上下文协议 MCP](/guide/06-mcp) | MCP 架构、HTTP/stdio 传输、多服务器模式 | [接入 MCP 工具](/playground/?id=ch06-mcp-tools) |
| [07. 文档、Embedding 与语义搜索](/guide/07-embeddings) | 文档加载与切分、向量嵌入、相似度搜索 | [文本分块](/playground/?id=ch07-text-splitter)、[语义搜索](/playground/?id=ch07-semantic-search) |
| [08. 构建 Agentic RAG 系统](/guide/08-agentic-rag) | 检索工具化、Agent 决定何时搜索、传统 RAG vs Agentic RAG | [组装 Agentic RAG](/playground/?id=ch08-agentic-rag) |

## 🧭 建议学习路径

```
00 环境搭建 ──► 01~02 基础篇 ──► 03 提示词 ──► 04~06 进阶篇 ──► 07~08 实战篇
  （必做）      （模型与对话）    （控制输出）   （工具/Agent/MCP）  （检索与 RAG）
```

- **完全新手**：按 00 → 08 顺序走完，每章 1~2 小时，两周内可完成
- **有 LLM API 经验**：快速过 00~02，从 03 章结构化输出开始细读
- **只想学 RAG**：00 → 04（工具）→ 05（Agent）→ 07 → 08，中间章节按需回补

::: tip 为什么 04、05 是 07、08 的前置？
本课程的 RAG 是 **Agentic RAG**——检索被封装成工具，由 Agent 自主决定「要不要搜、搜什么」。不懂工具和 Agent，就无法理解第 08 章的架构。
:::

## 📋 前置要求

- **JavaScript/TypeScript 基础**：变量、函数、对象、async/await
- **Node.js 与 npm**：包管理和命令行基本操作
- **生成式 AI 基本概念**：大致知道 LLM、提示词、token 是什么即可（不熟悉可先看 [Generative AI with JavaScript](https://github.com/microsoft/generative-ai-with-javascript)）
- **一个 GitHub 账号**：用于免费获取 AI 模型访问权限，无需信用卡

## 📖 如何使用本站

推荐「三步学习法」，每章都走一遍：

1. **读笔记**：本站每章笔记提炼了核心概念、关键代码与常见坑，10~20 分钟读完
2. **跑课程代码**：克隆[课程仓库](https://github.com/microsoft/langchainjs-for-beginners)，用 `tsx` 运行各章 `code/` 目录下的完整示例，观察真实输出
3. **去训练场实操**：点击每章末尾的「🏋️ 动手练习」链接，在[训练场](/playground/)里不看答案独立写一遍——写不出来再回头翻笔记

::: warning 别只看不练
LLM 应用开发的很多认知（比如「模型没有记忆」「流式的首字延迟」）只有亲手跑过才会真正内化。笔记是地图，代码才是路。
:::

每章笔记的固定结构：**本章速览** → 知识点小节 → **常见坑** → **核心要点** → **动手练习** → **延伸阅读**。赶时间可以只看速览和核心要点，需要排错时直接翻常见坑。

## 🔗 相关资源

- [LangChain.js 官方文档](https://docs.langchain.com/oss/javascript/langchain/overview)
- [课程术语表](/glossary)
- [GitHub Models 市场](https://github.com/marketplace/models)（免费模型）

---

本站内容基于 [microsoft/langchainjs-for-beginners](https://github.com/microsoft/langchainjs-for-beginners)（MIT License）提炼整理，非逐字翻译；代码示例保留课程 LangChain v1.x API 原貌。
