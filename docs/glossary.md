# 术语表

本页汇总 LangChain.js 学习路上最核心的术语，按主题分组，提炼自课程官方 Glossary。每条给出中英文名称、一句话解释与相关章节，可配合站内搜索（右上角）快速查阅。

::: tip 使用建议
术语首次出现在哪一章，就点「相关章节」回去看完整讲解和代码示例；同一主题的术语放在一起，也适合作为章节复习清单。
:::

## 基础概念

模型、Token、参数——与 LLM 打交道绕不开的地基词汇。

| 术语（中英） | 一句话解释 | 相关章节 |
|-------------|-----------|---------|
| 大语言模型（LLM, Large Language Model） | 在海量文本上训练、能理解和生成类人文本的 AI 模型，如 GPT、Claude 系列 | [01. 初识 LangChain.js](/guide/01-introduction) |
| 模型（Model） | 应用中的 AI「大脑」；LangChain 为不同提供商的模型提供统一调用接口 | [01. 初识 LangChain.js](/guide/01-introduction) |
| 提供商（Provider） | 提供 LLM API 的服务商（OpenAI、Azure、Anthropic 等），换提供商通常只需改环境变量 | [01. 初识 LangChain.js](/guide/01-introduction) |
| API 密钥（API Key） | 调用 AI 服务的身份凭证，务必存环境变量、绝不硬编码进代码 | [00. 环境搭建](/guide/00-setup) |
| Token | 模型处理文本的基本单位，约等于 4 个字符或 3/4 个英文单词；计费和上下文限制都按它算 | [02. Chat 模型](/guide/02-chat-models) |
| 上下文窗口（Context Window） | 模型单次请求能处理的最大 token 数（输入 + 输出），超出就要裁剪或摘要历史 | [02. Chat 模型](/guide/02-chat-models) |
| 温度（Temperature） | 控制输出随机性的参数：0 最确定（代码、事实），越高越有创造性也越容易跑题 | [02. Chat 模型](/guide/02-chat-models) |
| 最大 Token 数（Max Tokens） | 限制单次回复长度上限的参数，用于控制成本和篇幅 | [02. Chat 模型](/guide/02-chat-models) |
| 流式输出（Streaming） | 边生成边逐字返回回复，而非等全部生成完，显著改善用户体验 | [02. Chat 模型](/guide/02-chat-models) |
| 记忆（Memory） | AI 跨轮次记住上下文的能力——本质是每次请求都把对话历史一并发送 | [02. Chat 模型](/guide/02-chat-models) |
| 速率限制（Rate Limit） | 提供商对单位时间请求量的限制，超限返回 429；用 `withRetry()` 自动重试应对 | [02. Chat 模型](/guide/02-chat-models) |
| 链（Chain） | 按固定路径串联的一系列操作，上一步输出是下一步输入（对比 Agent 的动态决策） | [08. Agentic RAG](/guide/08-agentic-rag) |
| LCEL（LangChain Expression Language） | 用管道符组合链的语法，如 `prompt.pipe(model).pipe(parser)` | [03. 提示词与输出](/guide/03-prompts) |
| 知识截止（Knowledge Cutoff） | 模型训练数据的时间边界，之后发生的事它一概不知——RAG 和工具正是为此而生 | [08. Agentic RAG](/guide/08-agentic-rag) |

## 消息与提示词

和模型「对话」的方式：消息类型、模板、以及让输出可被程序消费的手段。

| 术语（中英） | 一句话解释 | 相关章节 |
|-------------|-----------|---------|
| 提示词（Prompt） | 提供给模型的指令、问题和上下文；清晰、具体、带上下文的提示词效果最好 | [03. 提示词与输出](/guide/03-prompts) |
| 提示词模板（Prompt Template） | 带占位符的可复用提示词结构，如 `"把 {text} 翻译成 {lang}"`，便于测试维护并防注入 | [03. 提示词与输出](/guide/03-prompts) |
| 系统消息（SystemMessage） | 设定 AI 行为、人格和规则的消息类型，如「你是一位耐心的编程导师」 | [01. 初识 LangChain.js](/guide/01-introduction) |
| 用户消息（HumanMessage） | 代表用户输入的消息类型，加入对话历史以维持上下文 | [01. 初识 LangChain.js](/guide/01-introduction) |
| AI 消息（AIMessage） | 代表模型回复的消息类型，通常在生成后自动追加进对话历史 | [01. 初识 LangChain.js](/guide/01-introduction) |
| 工具消息（ToolMessage） | 承载工具执行结果的消息类型，让 Agent 知道工具返回了什么 | [05. Agent 入门](/guide/05-agents) |
| 少样本提示（Few-Shot Prompting） | 在提示词中给出 2~5 个输入-输出示例来「教会」模型模式，比零样本更可靠、比微调更便宜 | [03. 提示词与输出](/guide/03-prompts) |
| 输出解析器（Output Parser） | 把模型的原始文本输出转换为 JSON、列表等结构化数据的组件 | [03. 提示词与输出](/guide/03-prompts) |
| Zod Schema | TypeScript 优先的模式校验库，用于定义工具参数和结构化输出，兼得编译期与运行时类型安全 | [03. 提示词与输出](/guide/03-prompts) |
| 结构化输出（Structured Output） | 让模型按预定义 Schema（通常是 Zod）返回 JSON 等结构化数据，而非自由文本 | [03. 提示词与输出](/guide/03-prompts) |
| 提示工程（Prompt Engineering） | 通过精心设计提示词（含上下文数据）来引导模型输出的方法；数据小且静态时它比 RAG 更简单高效 | [08. Agentic RAG](/guide/08-agentic-rag) |

## 工具与 Agent

从「模型会说话」到「模型会做事」的关键一跃。

| 术语（中英） | 一句话解释 | 相关章节 |
|-------------|-----------|---------|
| 工具（Tool） | Agent 可调用的函数（计算、搜索、查库等），把 AI 能力扩展到文本生成之外 | [04. 函数调用与工具](/guide/04-tools) |
| 函数调用（Function Calling） | LLM 生成「调用哪个函数、传什么参数」的结构化输出；模型只做决定，执行由你的代码完成 | [04. 函数调用与工具](/guide/04-tools) |
| Agent（智能体） | 能推理问题、动态决定用哪些工具、迭代逼近答案的 AI 系统（对比固定路径的链） | [05. Agent 入门](/guide/05-agents) |
| ReAct 模式（Reasoning + Acting） | Agent 的核心推理模式：思考 → 行动（调工具）→ 观察结果 → 循环直至解决 → 作答 | [05. Agent 入门](/guide/05-agents) |
| Agent 循环（Agent Loop） | ReAct 的迭代过程本身；`createAgent()` 已内置该循环，无需手写 | [05. Agent 入门](/guide/05-agents) |
| createAgent() | LangChain v1 创建 Agent 的入口函数：传入 `model` 和 `tools`，内置 ReAct 循环开箱即用 | [05. Agent 入门](/guide/05-agents) |
| 工具描述（Tool Description） | 工具定义中的 `description` 字段，是 Agent 判断「何时调用该工具」的唯一依据，务必写得具体 | [04. 函数调用与工具](/guide/04-tools) |

## MCP

标准化的工具接入协议——第 06 章的主角。

| 术语（中英） | 一句话解释 | 相关章节 |
|-------------|-----------|---------|
| 模型上下文协议（MCP, Model Context Protocol） | 让 AI 应用通过统一接口连接外部工具和数据源的开放标准——「AI 应用的 USB-C」 | [06. MCP](/guide/06-mcp) |
| MCP 服务器（MCP Server） | 通过 MCP 协议暴露工具能力的程序（GitHub、数据库、文件系统等），写一次即可被任何兼容客户端使用 | [06. MCP](/guide/06-mcp) |
| Streamable HTTP 传输 | MCP 的网络传输方式，客户端通过 URL 连接独立运行的服务器，适合网络可达的服务 | [06. MCP](/guide/06-mcp) |
| stdio 传输 | MCP 的进程传输方式，服务器作为子进程运行、通过标准输入/输出流通信，适合本地紧耦合工具 | [06. MCP](/guide/06-mcp) |
| MultiServerMCPClient | `@langchain/mcp-adapters` 提供的客户端，可同时连接多个 MCP 服务器并用 `getTools()` 合并全部工具 | [06. MCP](/guide/06-mcp) |

## 文档与检索

从原始文档到语义搜索再到 RAG 的完整链路词汇，覆盖第 07、08 两章。

| 术语（中英） | 一句话解释 | 相关章节 |
|-------------|-----------|---------|
| 文档（Document） | LangChain 处理文本的基本单元：`pageContent`（正文）+ `metadata`（来源等信息） | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 文档加载器（Document Loader） | 读取各种格式（文本、PDF、网页等）并统一转成 Document 对象的组件 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 文本拆分器（Text Splitter） | 把长文档切成小块的组件；首选 `RecursiveCharacterTextSplitter`（段落 → 句子 → 单词逐级切分） | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 分块（Chunk / Chunking） | 把长文档拆成小片段的过程；小块检索精确但缺上下文，大块相反，需要权衡 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 块重叠（Chunk Overlap） | 相邻块共享的字符数（推荐块大小的 10~20%），防止句子在边界被切断导致语义丢失 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 元数据（Metadata） | 附着在文档上的额外信息（来源、类别、日期等），分块时自动继承，可用于过滤和溯源 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 嵌入（Embedding） | 文本的数值向量表示，核心性质：相似含义产生相似向量，让机器能数学化比较语义 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 嵌入模型（Embedding Model） | 把文本转成向量的专用模型，如 `text-embedding-3-small`（1536 维）；与 Chat 模型是两回事 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 向量（Vector） | 表示文本语义的数字数组（通常 1536 或 3072 维），是语义空间中的一个坐标点 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 向量存储（Vector Store） | 为存储和检索向量优化的数据库；测试用 `MemoryVectorStore`，生产用 Pinecone、Chroma 等 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 余弦相似度（Cosine Similarity） | 通过向量夹角衡量语义相似度的指标（文本通常 0~1，越高越相似），文本比较的首选 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 语义搜索（Semantic Search） | 按含义而非关键词匹配的搜索方式，能理解 "cooking pasta" 与 "preparing noodles" 是一回事 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 批量处理（Batch Processing） | 一次 API 调用处理多条文本，如 `embedDocuments()`，比逐条调用快 5~10 倍 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 相似性搜索（Similarity Search） | 向量存储的核心操作：给定查询，返回向量最接近的 K 个文档；`similaritySearchWithScore()` 还附带分数 | [07. Embedding 与语义搜索](/guide/07-embeddings) |
| 检索器（Retriever） | 封装向量存储搜索接口的组件，可切换相似性、MMR、分数阈值等策略而不改业务代码 | [08. Agentic RAG](/guide/08-agentic-rag) |
| 检索增强生成（RAG, Retrieval Augmented Generation） | 先从知识库检索相关文档、再作为上下文交给 LLM 生成答案的模式，让 AI 基于你的数据回答 | [08. Agentic RAG](/guide/08-agentic-rag) |
| 传统 RAG（Traditional RAG） | 「每问必检索」的固定流水线（如 `createRetrievalChain()`），简单可预测，但连 "2+2" 也要搜一遍 | [08. Agentic RAG](/guide/08-agentic-rag) |
| Agentic RAG | RAG 的智能升级版：检索被包装成工具，由 Agent 自主决定何时检索、何时直接回答 | [08. Agentic RAG](/guide/08-agentic-rag) |
| 来源归属（Citation / Source Attribution） | 在回答中标注信息出自哪份文档（如 `[1]` 编号引用），靠检索结果携带 metadata 实现，RAG 的独有优势 | [08. Agentic RAG](/guide/08-agentic-rag) |
| 最大边际相关性（MMR, Maximum Marginal Relevance） | 兼顾相关性与多样性的检索策略，避免返回一堆大同小异的近似重复结果 | [08. Agentic RAG](/guide/08-agentic-rag) |
| 微调（Fine-tuning） | 用自有数据继续训练模型以改变其行为或风格；昂贵且知识静态，多数场景先考虑提示工程或 RAG | [08. Agentic RAG](/guide/08-agentic-rag) |
