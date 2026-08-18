# 08. 构建 Agentic RAG 系统

> 🎯 综合前七章所学：把向量检索包装成工具交给 Agent，构建「自己决定何时查资料」的智能问答系统。

::: tip 本章速览
- 选型三岔口：数据小用**提示工程**，知识库大/常更新/要引用用 **RAG**，改模型行为才考虑**微调**
- 传统 RAG 每问必搜；**Agentic RAG** 让 Agent 自主决定「直接回答」还是「先检索」
- 核心模式：`tool()` 包装 `vectorStore.similaritySearch()`，交给 `createAgent()`
- 工具的 `description` 是 Agent 决策的唯一依据，写清楚「何时该用我」
- 在检索结果中带上 `metadata`，就能实现带引用来源（citation）的回答
- 多知识源模式：给 Agent 多个检索工具，它会按问题选择搜哪个源
:::

## 聪明学生类比：三种考试策略

想象三种学生参加考试：

- **闭卷考试（裸 LLM）**：只靠记忆答题，无法查证事实，可能自信地答错，知识停留在训练截止日
- **无脑开卷（传统 RAG）**：每道题都翻书——连 "2+2=?" 也翻，准确性高、能引用出处，但慢且浪费
- **聪明开卷（Agentic RAG）**：**自己判断**什么时候需要翻书。"2+2=?" 直接答；"公司 Q3 营收多少？" 才去查文档。简单题快、复杂题全，需要时还能给出处

![聪明学生类比：闭卷靠记忆，传统 RAG 逢题必翻书，Agentic RAG 智能决定](/images/08-agentic-rag-systems/smart-student-analogy.png)

**RAG（Retrieval Augmented Generation，检索增强生成）** 的本质：从知识库检索相关文档，作为上下文交给 LLM，让它基于*你的数据*而非仅凭训练记忆回答。Agentic RAG 则在此之上加了一层自主决策。

## 什么时候用 RAG？（vs 提示工程 vs 微调）

动手之前先确认 RAG 是正确选择。决策树：

1. 数据能轻松塞进提示词？→ **提示工程（Prompt Engineering）**
2. 知识库太大放不下？→ **RAG**
3. 内容频繁更新？→ **RAG**
4. 需要来源引用？→ **RAG**
5. 要改变模型的写作风格 / 领域语言模式？→ **微调（Fine-tuning）**——贵、慢、知识静态，多数应用用不上

![RAG vs 提示工程决策树](/images/08-agentic-rag-systems/rag-vs-prompt-engineering.png)

两个典型场景对比：

```ts
// 场景 1：5 条 FAQ 的客服机器人 → 提示工程就够了
// 数据小、几乎不变、全部上下文都相关，直接塞进 system prompt
const faqPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful customer service assistant. Answer based on this FAQ:\n\n{context}"],
  ["human", "{question}"],
]);
const faqChain = faqPrompt.pipe(model);

// 场景 2：1000+ 页公司文档机器人 → Agentic RAG
// 超出上下文窗口、频繁更新、需要知道答案出自哪份文档
// → 向量存储 + 检索工具 + Agent（见下文）
```

## 传统 RAG vs Agentic RAG

**传统 RAG** 是一条固定流水线：`用户提问 → 总是检索 → 拼接上下文 → 生成答案`。用 `createRetrievalChain()` 实现：

```ts
// 传统 RAG：不管什么问题都先搜一遍向量存储
const retriever = vectorStore.asRetriever({ k: 2 });

const combineDocsChain = await createStuffDocumentsChain({
  llm: model,
  prompt,  // 模板中含 {context} 占位符，填入检索到的文档
});

const ragChain = await createRetrievalChain({
  retriever,          // 永远先执行检索
  combineDocsChain,   // 再把文档和问题合并生成答案
});
// 问 "What is 2+2?" 它也会认真搜一遍文档……
```

问题一目了然：**"What is the capital of France?" 也会触发一次 Embedding + 向量搜索**，白白浪费时间和 API 费用。

**Agentic RAG** 把检索从「固定步骤」降级为「可选工具」，由 Agent 推理决定用不用：

| 维度 | 传统 RAG | Agentic RAG |
|------|---------|-------------|
| 检索时机 | 每次都搜 | 只在需要时搜 |
| 速度 | 简单问题也慢 | 简单快、复杂全 |
| 成本 | 每次查询都有检索开销 | 按需产生 |
| 行为 | 僵化、可预测 | 自适应、会决策 |
| 复杂度 | 简单链 | 需要 Agent 循环 |

![传统 RAG 总是检索，Agentic RAG 智能决策](/images/08-agentic-rag-systems/traditional-vs-agentic-rag.png)

::: tip 传统 RAG 并非一无是处
如果*每个*问题都必然需要搜文档（例如「在法律数据库中检索 X 相关案例」），传统 RAG 的可预测性反而是优点。但对于混合通用知识和私有数据的场景，Agentic RAG 几乎总是更好的选择。
:::

## 核心模式：把检索包装成工具

Agentic RAG 的全部秘密就是这一个模式——用第 04 章的 `tool()` 把向量搜索包起来，交给第 05 章的 `createAgent()`：

```ts
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";

// 🔑 关键模式：向量存储 → 检索工具
const retrievalTool = tool(
  async (input) => {
    // 语义搜索，取最相关的 2 个文档
    const results = await vectorStore.similaritySearch(input.query, 2);
    // 带上来源，方便 Agent 在回答中引用
    return results
      .map((doc) => `[${doc.metadata.source}]: ${doc.pageContent}`)
      .join("\n\n") || "No relevant documents found.";
  },
  {
    name: "searchCompanyDocs",
    // ⚠️ description 是 Agent 决定「何时调用」的唯一依据，务必写清楚
    description:
      "Search company documents for specific information about our company history, " +
      "office locations, financials, policies, etc. Use this when you need factual " +
      "information about our company that isn't general knowledge.",
    schema: z.object({
      query: z.string().describe("The search query to find relevant company documents"),
    }),
  }
);

// Agent 自主决策：通用知识直接答，公司信息才调工具
const agent = createAgent({ model, tools: [retrievalTool] });
```

注意 `description` 里那句 **"Use this when you need factual information about our company that isn't general knowledge"**——这就是 Agent 的决策规则，写得越具体，决策越准。

## 完整 Agentic RAG 系统组装

从零到可用只需四步：建知识库 → 建向量存储 → 包装检索工具 → 创建 Agent。下面把上一节的检索工具一并写进可运行示例：

```ts
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import "dotenv/config";

// 1. 模型与 Embedding
const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});
const embeddings = new OpenAIEmbeddings({
  model: process.env.AI_EMBEDDING_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

// 2. 知识库 → 向量存储
const docs = [
  new Document({
    pageContent: "Our company was founded in 2020 by Jane Smith and John Doe.",
    metadata: { source: "company-history.md" },
  }),
  new Document({
    pageContent: "Our main office is located at 123 Tech Street, San Francisco, CA 94105.",
    metadata: { source: "office-locations.md" },
  }),
  new Document({
    pageContent: "We achieved $5.2M in revenue in Q3 2024, a 35% increase over Q2.",
    metadata: { source: "financials-q3-2024.md" },
  }),
];
const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

const retrievalTool = tool(
  async (input) => {
    const results = await vectorStore.similaritySearch(input.query, 2);
    return results
      .map((doc) => `[${doc.metadata.source}]: ${doc.pageContent}`)
      .join("\n\n") || "No relevant documents found.";
  },
  {
    name: "searchCompanyDocs",
    description:
      "Search company documents for specific information about our company history, " +
      "office locations, financials, policies, etc. Use this when you need factual " +
      "information about our company that isn't general knowledge.",
    schema: z.object({
      query: z.string().describe("The search query to find relevant company documents"),
    }),
  },
);

const agent = createAgent({
  model,
  tools: [retrievalTool],
  systemPrompt:
    "You are a company assistant. Use searchCompanyDocs for internal facts; answer general knowledge directly.",
});

// 用混合问题验证 Agent 的决策
const questions = [
  "What is 2 + 2?",                     // → 直接回答，不检索
  "Where is our main office located?",  // → 调用检索工具
  "What's the capital of France?",      // → 直接回答，不检索
  "What was our Q3 2024 revenue?",      // → 调用检索工具
];

for (const question of questions) {
  const response = await agent.invoke({ messages: [new HumanMessage(question)] });
  console.log(response.messages[response.messages.length - 1].content);

  // 检查本轮是否真的用了检索：看消息历史里有没有 tool_calls
  const usedRetrieval = response.messages.some(
    (msg) => msg.tool_calls && msg.tool_calls.length > 0
  );
  console.log(`📊 Used retrieval: ${usedRetrieval ? "YES" : "NO"}`);
}
```

运行后可以清楚看到：数学题和常识题 `Used retrieval: NO`，公司相关问题 `Used retrieval: YES`——Agent 确实在做决策，而不是机械检索。

![Agentic RAG 架构：Agent 判断是否需要检索，再生成带引用的回答](/images/08-agentic-rag-systems/agentic-rag-architecture.png)

::: details 检索策略进阶：不止 similaritySearch
把向量存储转成 Retriever 后可以切换搜索策略：

```ts
// 默认：相似性搜索，取 top 4
const retriever = vectorStore.asRetriever({ k: 4 });

// MMR（最大边际相关性）：在相关性与多样性间取平衡，避免返回 5 条大同小异的结果
const mmrRetriever = vectorStore.asRetriever({
  searchType: "mmr",
  searchKwargs: { fetchK: 20, lambda: 0.5 },
});

// 分数阈值：只要足够相似的结果
const thresholdRetriever = vectorStore.asRetriever({
  searchType: "similarity_score_threshold",
  searchKwargs: { scoreThreshold: 0.8 },
});
```

更进一步还有多查询 RAG（生成多个搜索词）、上下文压缩、混合搜索（语义 + 关键词）、以及用独立模型做 **rerank（重排序）**。入门用 `similaritySearch` 即可；相关性不够时再换 MMR 或接 [检索器集成](https://docs.langchain.com/oss/javascript/integrations/retrievers)。官方端到端流程见 [RAG](https://docs.langchain.com/oss/javascript/langchain/rag)。
:::

## 引用来源（Citation）模式

企业场景常要求「答案必须注明出处」。做法：知识库带上丰富的 `metadata`，检索工具返回**带编号的引用格式**，并在工具描述中要求 Agent 引用编号。

```ts
const searchWithCitations = tool(
  async (input) => {
    const results = await vectorStore.similaritySearchWithScore(input.query, 3);

    // 把每条结果格式化为 [编号] + 内容 + 出处
    return results
      .map(([doc, score], index) => {
        const relevancePercent = Math.round(score * 100); // MemoryVectorStore：分数越高越相似
        return `[${index + 1}] ${doc.pageContent}
Source: ${doc.metadata.title} - ${doc.metadata.section} (Page ${doc.metadata.page})
Author: ${doc.metadata.author}
Relevance: ${relevancePercent}%`;
      })
      .join("\n\n");
  },
  {
    name: "searchKnowledgeBase",
    // 明确告诉 Agent：结果带 [1][2][3] 编号，回答时要引用它们
    description:
      "Search the knowledge base for AI/ML technical information. The tool returns " +
      "results with citation numbers [1], [2], [3] that you should reference in your answer.",
    schema: z.object({ query: z.string().describe("The search query") }),
  }
);
```

Agent 回答时就会自然带上 `[1]`、`[2]` 这样的引用标记，用户可以追溯每个论断的来源——这是提示工程方案给不了的能力。

::: warning 分数方向因存储而异
`MemoryVectorStore` 的 score 是**相似度**（越高越相关），所以上面用 `score * 100`。部分生产库（L2 / 某些 pgvector 配置）返回的是**距离**（越低越相关）。换存储时先打印几个样本，不要盲目套 `1 - score`。
:::

## 多知识源模式

真实知识库往往横跨多种来源：文本文件、Markdown 文档、网页。给 Agent **多个各有分工的检索工具**，它会根据问题语境选择搜哪个源：

```ts
// 全源搜索 + 按 metadata.source_type 过滤的专项搜索
const searchAllSources = tool(
  async (input) => {
    const results = await vectorStore.similaritySearch(input.query, 3);
    return results
      .map((doc, i) => `[${i + 1}] [${doc.metadata.source_type.toUpperCase()}] ${doc.metadata.source}\nContent: ${doc.pageContent}`)
      .join("\n\n");
  },
  {
    name: "searchAllSources",
    description: "Search across ALL document sources (text files, markdown docs, web pages).",
    schema: z.object({ query: z.string() }),
  }
);

const searchMarkdownDocs = tool(
  async (input) => {
    // 先多召回，再按元数据过滤出 markdown 源
    const all = await vectorStore.similaritySearch(input.query, 10);
    return all
      .filter((doc) => doc.metadata.source_type === "markdown")
      .slice(0, 3)
      .map((doc, i) => `[${i + 1}] ${doc.metadata.source}\nContent: ${doc.pageContent}`)
      .join("\n\n");
  },
  {
    name: "searchMarkdownDocs",
    description: "Search ONLY markdown documentation (.md). Use for docs, guides, or README files.",
    schema: z.object({ query: z.string() }),
  }
);

// 同理可加 searchTextFiles、searchWebPages……
const agent = createAgent({
  model,
  tools: [searchAllSources, searchTextFiles, searchMarkdownDocs, searchWebPages],
});
// 问「怎么安装？」→ Agent 大概率选 searchMarkdownDocs
// 问「LangChain 是什么？」→ Agent 可能选 searchAllSources
```

这本质上还是第 05 章的多工具决策，只是每个工具背后都是同一个向量存储的不同切片。

::: details 企业级延伸：把 RAG 暴露成 MCP 服务
如果多个 Agent 需要共享同一个知识库，与其在每个 Agent 里复制 RAG 逻辑，不如把知识库包装成 **MCP 服务器**（第 06 章技能回收！）：RAG 逻辑与 Agent 逻辑解耦、知识集中管理、更新知识无需重新部署 Agent。课程的 `samples/mcp-rag-server/` 提供了完整示例——一个暴露 `searchDocuments` / `addDocument` 工具的 HTTP MCP 服务器。注意生产环境务必补上认证、授权、速率限制和审计日志。
:::

## ⚠️ 常见坑

| 坑 | 说明 |
|----|------|
| 工具描述含糊 | `description: "Search docs"` 这种描述让 Agent 无从决策，会导致该搜不搜、不该搜乱搜——写明数据范围和使用时机 |
| 明明该用提示工程却上了 RAG | 几条 FAQ 就建向量库属于过度设计，先过一遍决策树 |
| 检索结果不带来源 | 返回裸文本就丢失了引用能力，始终在工具输出中拼上 `[metadata.source]` |
| 把距离当相似度 | 有的向量库 score 越高越好，有的越低越好；换存储先核对，再决定要不要 `1 - score` |
| 误判 Agent 是否检索了 | 别猜，检查 `response.messages` 中是否存在 `tool_calls` |
| 检索到空结果时 Agent 胡编 | 工具要显式返回 "No relevant documents found."，让 Agent 知道知识库里没有 |
| 系统提示与工具描述打架 | 如果 system prompt 说「只用自身知识回答」，Agent 可能永远不调检索工具——两处指令要一致 |
| 知识库更新后答案陈旧 | 向量存储不会自动同步源文档，文档变更后要重新 Embedding 入库 |

## ✅ 核心要点

- **Agentic RAG = Agent + 检索工具**：把 `similaritySearch()` 用 `tool()` 包起来，交给 `createAgent()`，Agent 自己决定何时搜
- **`systemPrompt` 与工具 `description` 要一致**：一边说「先查公司文档」、一边说「只用自身知识」，Agent 会无所适从
- **效率来自决策**：只在必要时检索，简单问题省下 Embedding 和搜索的时间与成本
- **`description` 决定成败**：它是 Agent 判断「该不该调用检索」的唯一依据
- **来源归属是刚需**：metadata 一路带到工具输出，就能实现带 `[1]` `[2]` 引用的可追溯回答
- **多源即多工具**：按 `source_type` 过滤出多个专项检索工具，Agent 自动路由
- **这是全课程的集大成**：工具（04）+ Agent（05）+ MCP（06）+ 语义检索（07）= 智能问答系统

## 🏋️ 动手练习

- [组装 Agentic RAG 系统](/playground/?id=ch08-agentic-rag)

## 📚 延伸阅读

- [LangChain.js RAG](https://docs.langchain.com/oss/javascript/langchain/rag)
- [检索器集成](https://docs.langchain.com/oss/javascript/integrations/retrievers)
- [LangGraph：有状态 Agent 编排](https://docs.langchain.com/oss/javascript/langgraph/quickstart)
- [Deep Agents 概览](https://docs.langchain.com/oss/javascript/deepagents/overview)
