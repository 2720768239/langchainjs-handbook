import { tool } from "@langchain/core/tools";
import * as z from "zod";
import type { Exercise } from "../types";

/** 本练习的模拟 MCP 服务器暴露的工具 */
const docsSearchTool = tool(
  async (input: { query: string }) => {
    const docs: Record<string, string> = {
      useState:
        "useState 是 React 提供的状态管理 Hook，返回 [当前状态, 更新函数]。调用更新函数会触发组件重新渲染。",
      useEffect:
        "useEffect 用于处理副作用（数据请求、订阅、DOM 操作），在渲染完成后执行，依赖数组控制触发时机。",
    };
    const hit = Object.entries(docs).find(([key]) => input.query.includes(key));
    return hit ? `【文档】${hit[1]}` : "【文档】未找到相关内容，请换个关键词试试。";
  },
  {
    name: "search_docs",
    description: "搜索最新的技术文档，返回与查询相关的文档片段",
    schema: z.object({ query: z.string().describe("搜索关键词") }),
  },
);

export const ch06Exercises: Exercise[] = [
  {
    id: "ch06-mcp-tools",
    chapter: 6,
    chapterName: "模型上下文协议 MCP",
    title: "把 MCP 工具接入 Agent",
    difficulty: "基础",
    guideLink: "/guide/06-mcp",
    description: `
### 📋 题目

MCP（Model Context Protocol）是 AI 连接外部服务的「USB-C 接口」。
接入流程只有三步，而且**接入后与普通工具毫无区别**：

1. 创建 \`MultiServerMCPClient\`，配置一个名为 \`docs\` 的服务器（HTTP 传输，URL 用 \`process.env.MCP_SERVER_URL\`）
2. \`await client.getTools()\` 获取服务器暴露的工具
3. 把工具交给 \`createAgent\`，实现 \`askDocs(question)\` 返回最终回答文本

### 函数签名

\`\`\`ts
export async function askDocs(question: string): Promise<string>
\`\`\`

### 期望行为

\`\`\`ts
await askDocs("useState 是什么？");
// Agent 调用 MCP 服务器的 search_docs 工具 →
// => "为你查到了文档：【文档】useState 是 React 提供的状态管理 Hook…"
\`\`\`

> 💡 训练场中的 MCP 客户端是模拟实现：\`getTools()\` 返回一个 \`search_docs\` 工具
> （内置 useState / useEffect 两条文档），不会发起真实网络连接。
> 真实环境中，唯一的区别只是 URL 指向真正的 MCP 服务器。
`,
    starterCode: `import { createAgent, HumanMessage } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

// TODO: 1. 创建 MCP 客户端：
// const mcpClient = new MultiServerMCPClient({
//   docs: { transport: "http", url: process.env.MCP_SERVER_URL },
// });

export async function askDocs(question: string): Promise<string> {
  // TODO: 2. const tools = await mcpClient.getTools()
  // TODO: 3. createAgent({ model, tools }) 并 invoke
  // TODO: 4. 返回最后一条消息的 content
  throw new Error("TODO: 请实现 askDocs");
}
`,
    exampleCode: `// 课程示例：06-mcp/code/01-mcp-integration.ts（精简版）
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, HumanMessage } from "langchain";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

async function main() {
  // 1. 连接 MCP 服务器（可以同时配多个）
  const mcpClient = new MultiServerMCPClient({
    context7: {
      transport: "http",
      url: "https://mcp.context7.com/mcp",
    },
  });

  try {
    // 2. 获取服务器暴露的所有工具
    const tools = await mcpClient.getTools();
    console.log(\`获取到 \${tools.length} 个 MCP 工具\`);

    const model = new ChatOpenAI({
      model: process.env.AI_MODEL,
      configuration: { baseURL: process.env.AI_ENDPOINT },
      apiKey: process.env.AI_API_KEY,
    });

    // 3. MCP 工具和普通工具用法完全一样！
    const agent = createAgent({ model, tools });

    const response = await agent.invoke({
      messages: [new HumanMessage("React useState 怎么用？查一下最新文档。")],
    });
    console.log(response.messages[response.messages.length - 1].content);
  } finally {
    await mcpClient.close(); // 记得关闭连接
  }
}

main().catch(console.error);
`,
    solution: `import { createAgent, HumanMessage } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const mcpClient = new MultiServerMCPClient({
  docs: { transport: "http", url: process.env.MCP_SERVER_URL },
});

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

export async function askDocs(question: string): Promise<string> {
  const tools = await mcpClient.getTools(); // MCP 服务器暴露的工具
  const agent = createAgent({ model, tools }); // 用法与普通工具完全一致

  const response = await agent.invoke({ messages: [new HumanMessage(question)] });
  const lastMessage = response.messages[response.messages.length - 1];
  return lastMessage.content as string;
}
`,
    hints: [
      "MultiServerMCPClient 的配置键是服务器别名，值是 { transport, url }。",
      "getTools() 是异步的，返回的工具数组可直接传给 createAgent。",
      "最终回答仍然是 response.messages 的最后一条。",
    ],
    modelBehavior: ({ lastHuman, lastToolResults }) => {
      if (lastToolResults.length > 0) {
        return { content: `为你查到了文档：${lastToolResults[0].content}` };
      }
      return {
        content: "",
        toolCalls: [{ name: "search_docs", args: { query: lastHuman } }],
      };
    },
    mcpTools: [docsSearchTool],
    demo: async ({ exports, log }) => {
      if (typeof exports.askDocs !== "function") {
        log("请先实现并导出 askDocs(question)");
        return;
      }
      log("问:", "useState 是什么？");
      log("  →", await exports.askDocs("useState 是什么？"));
      log("问:", "useEffect 是干什么的？");
      log("  →", await exports.askDocs("useEffect 是干什么的？"));
    },
    tests: [
      {
        name: "询问 useState → Agent 通过 MCP 工具查到文档",
        run: async ({ exports, expect }) => {
          const answer = await exports.askDocs("useState 是什么？");
          expect(answer, "回答").toContain("useState");
          expect(answer, "回答").toContain("Hook");
        },
      },
      {
        name: "模型产生了 search_docs 的调用意图，且工具结果被回传",
        run: async ({ exports, expect, modelCalls }) => {
          await exports.askDocs("useEffect 是干什么的？");
          expect(
            modelCalls.some((c) => c.returnedToolCalls.includes("search_docs")),
            "产生过 search_docs 调用意图",
          ).toBe(true);
          expect(
            modelCalls.some((c) => c.hadToolResult),
            "工具结果被回传给模型",
          ).toBe(true);
        },
      },
      {
        name: "回答中包含 MCP 工具返回的文档内容（而非模型编造）",
        run: async ({ exports, expect }) => {
          const answer = await exports.askDocs("useEffect 是干什么的？");
          expect(answer, "回答").toContain("副作用");
        },
      },
    ],
  },
];
