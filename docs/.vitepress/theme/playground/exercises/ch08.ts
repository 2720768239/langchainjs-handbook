import type { Exercise } from "../types";

export const ch08Exercises: Exercise[] = [
  {
    id: "ch08-agentic-rag",
    chapter: 8,
    chapterName: "构建 Agentic RAG 系统",
    title: "毕业设计：组装 Agentic RAG 系统",
    difficulty: "进阶",
    guideLink: "/guide/08-agentic-rag",
    description: `
### 📋 题目

**毕业设计！** 把整个课程串起来：文档 → 向量库 → 检索工具 → Agent。
与传统 RAG「每次都检索」不同，Agentic RAG 让 **Agent 自主决定**何时需要查知识库。

初始代码已给出 3 篇知识库文档，请完成：

1. 用 \`MemoryVectorStore.fromDocuments(docs, new OpenAIEmbeddings())\` 建向量库
2. 把检索包装成工具，**名称必须是 \`search_knowledge_base\`**，Schema \`{ query: string }\`，
   执行 \`similaritySearch(query, 2)\` 并把结果的 \`pageContent\` 用换行拼接返回
3. \`createAgent\` 组装，并实现 \`ask(question)\` 返回最终回答文本

### 函数签名

\`\`\`ts
export async function ask(question: string): Promise<string>
\`\`\`

### 期望行为

\`\`\`ts
await ask("When was LangChain.js released?");
// 知识库问题 → Agent 检索 → "根据知识库：LangChain.js was released in 2023…"

await ask("法国的首都是哪里？");
// 常识问题 → Agent 直接回答"巴黎"，全程不碰知识库 ← 这就是 Agentic 的意义
\`\`\`
`,
    starterCode: `import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import * as z from "zod";

// 知识库文档（已给出）
const docs = [
  new Document({
    pageContent:
      "LangChain.js was released in 2023 as the JavaScript/TypeScript port of the Python LangChain library.",
    metadata: { source: "langchain-history" },
  }),
  new Document({
    pageContent:
      "RAG (Retrieval Augmented Generation) combines document retrieval with LLM generation for accurate answers.",
    metadata: { source: "rag-explanation" },
  }),
  new Document({
    pageContent:
      "Vector stores enable semantic search over documents by storing embeddings and computing similarity.",
    metadata: { source: "vector-stores" },
  }),
];

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

export async function ask(question: string): Promise<string> {
  // TODO: 1. 建向量库：await MemoryVectorStore.fromDocuments(docs, new OpenAIEmbeddings())
  // TODO: 2. 定义检索工具 search_knowledge_base：
  //          similaritySearch(query, 2)，把结果的 pageContent 用 "\\n" 拼接返回
  // TODO: 3. createAgent({ model, tools: [检索工具] })
  // TODO: 4. invoke 并返回最后一条消息的 content
  throw new Error("TODO: 请实现 ask");
}
`,
    exampleCode: `// 课程示例：08-agentic-rag-systems/code/02-agentic-rag.ts（精简版）
// ⚠️ 注意：下面演示 API 写法；本题工具名必须是 search_knowledge_base（见题目/参考答案）
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";

async function main() {
  const embeddings = new OpenAIEmbeddings();
  const docs = [
    new Document({ pageContent: "LangChain.js was released in 2023…" }),
    // …更多知识库文档
  ];

  // 文档 → 向量库
  const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

  // 向量检索 → 包装成工具（关键一步！）
  const retrievalTool = tool(
    async (input: { query: string }) => {
      const results = await vectorStore.similaritySearch(input.query, 2);
      return results.map((doc) => doc.pageContent).join("\\n");
    },
    {
      name: "search_knowledge_base",
      description: "搜索知识库获取事实信息。需要文档中的具体信息时使用。",
      schema: z.object({ query: z.string().describe("检索查询") }),
    },
  );

  const model = new ChatOpenAI({ /* … */ });

  // Agent 拿到检索工具后，会自主决定何时检索
  const agent = createAgent({ model, tools: [retrievalTool] });

  const response = await agent.invoke({
    messages: [new HumanMessage("When was LangChain.js released?")],
  });
  console.log(response.messages[response.messages.length - 1].content);
}

main().catch(console.error);
`,
    solution: `import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import * as z from "zod";

const docs = [
  new Document({
    pageContent:
      "LangChain.js was released in 2023 as the JavaScript/TypeScript port of the Python LangChain library.",
    metadata: { source: "langchain-history" },
  }),
  new Document({
    pageContent:
      "RAG (Retrieval Augmented Generation) combines document retrieval with LLM generation for accurate answers.",
    metadata: { source: "rag-explanation" },
  }),
  new Document({
    pageContent:
      "Vector stores enable semantic search over documents by storing embeddings and computing similarity.",
    metadata: { source: "vector-stores" },
  }),
];

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

export async function ask(question: string): Promise<string> {
  // 1. 文档 → 向量库
  const vectorStore = await MemoryVectorStore.fromDocuments(docs, new OpenAIEmbeddings());

  // 2. 检索能力包装成工具
  const retrievalTool = tool(
    async (input: { query: string }) => {
      const results = await vectorStore.similaritySearch(input.query, 2);
      return results.map((doc) => doc.pageContent).join("\\n");
    },
    {
      name: "search_knowledge_base",
      description:
        "搜索知识库，获取关于 LangChain、RAG、向量库的事实信息。只在需要知识库中的具体信息时使用。",
      schema: z.object({ query: z.string().describe("检索查询") }),
    },
  );

  // 3. Agent 自主决定何时检索
  const agent = createAgent({ model, tools: [retrievalTool] });

  const response = await agent.invoke({ messages: [new HumanMessage(question)] });
  const lastMessage = response.messages[response.messages.length - 1];
  return lastMessage.content as string;
}
`,
    hints: [
      "MemoryVectorStore.fromDocuments 是静态方法，返回 Promise。",
      "检索工具内部：await vectorStore.similaritySearch(input.query, 2)。",
      "工具名必须是 search_knowledge_base，模拟模型按这个名字发起调用。",
      "回顾第 5 章练习：createAgent + invoke + 取最后一条消息。",
    ],
    modelBehavior: ({ lastHuman, lastToolResults }) => {
      if (lastToolResults.length > 0) {
        return { content: `根据知识库：${lastToolResults.map((r) => r.content).join(" / ")}` };
      }
      // 常识问题：直接回答，不检索——这正是 Agentic RAG 的核心
      if (lastHuman.includes("首都")) {
        return { content: "法国的首都是巴黎。这是常识，我不需要查询知识库。" };
      }
      return {
        content: "",
        toolCalls: [{ name: "search_knowledge_base", args: { query: lastHuman } }],
      };
    },
    demo: async ({ exports, log }) => {
      if (typeof exports.ask !== "function") {
        log("请先实现并导出 ask(question)");
        return;
      }
      log("知识库问题: When was LangChain.js released?");
      log("  →", await exports.ask("When was LangChain.js released?"));
      log("常识问题: 法国的首都是哪里？");
      log("  →", await exports.ask("法国的首都是哪里？"));
    },
    tests: [
      {
        name: "知识库问题：检索并给出含事实的回答（LangChain.js 发布于 2023）",
        run: async ({ exports, expect }) => {
          const answer = await exports.ask("When was LangChain.js released?");
          expect(answer, "回答").toContain("2023");
          expect(answer, "回答基于知识库").toContain("根据知识库");
        },
      },
      {
        name: "检索工具真实执行：向量库返回的内容出现在回答中",
        run: async ({ exports, expect, modelCalls }) => {
          const answer = await exports.ask("What is RAG?");
          expect(answer, "回答").toContain("Retrieval Augmented Generation");
          expect(
            modelCalls.some((c) => c.returnedToolCalls.includes("search_knowledge_base")),
            "产生过 search_knowledge_base 调用意图",
          ).toBe(true);
        },
      },
      {
        name: "常识问题：Agent 直接回答，全程不检索知识库",
        run: async ({ exports, expect, modelCalls }) => {
          const answer = await exports.ask("法国的首都是哪里？");
          expect(answer, "回答").toContain("巴黎");
          expect(
            modelCalls.every((c) => c.returnedToolCalls.length === 0),
            "全程没有工具调用",
          ).toBe(true);
        },
      },
    ],
  },
];
