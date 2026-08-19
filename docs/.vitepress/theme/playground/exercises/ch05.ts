import type { Exercise } from "../types";

export const ch05Exercises: Exercise[] = [
  {
    id: "ch05-create-agent",
    chapter: 5,
    chapterName: "Agent 入门",
    title: "用 createAgent 构建天气助手",
    difficulty: "基础",
    guideLink: "/guide/05-agents",
    description: `
### 📋 题目

上一章你手写了工具调用循环——\`createAgent()\` 把这个循环自动化了（ReAct 模式：推理 → 行动 → 观察）。
构建一个天气查询 Agent：

1. 定义 \`get_weather\` 工具：Schema 为 \`{ city: string }\`，从下面的数据表查询：

\`\`\`ts
const weatherData: Record<string, string> = {
  北京: "晴，26°C",
  上海: "多云，29°C",
  深圳: "雷阵雨，31°C",
};
\`\`\`

查不到的城市返回 \`"暂无该城市的天气数据"\`。

2. 用 \`createAgent({ model, tools })\` 创建 Agent
3. 实现 \`askWeather(question)\`：调用 Agent，返回**最后一条消息**的文本内容

### 函数签名

\`\`\`ts
export async function askWeather(question: string): Promise<string>
\`\`\`

### 期望行为

\`\`\`ts
await askWeather("北京今天天气怎么样？");
// Agent 自动：识别需要工具 → 调用 get_weather({city:"北京"}) → 组织最终回答
// => "根据查询结果：北京今天晴，26°C"

await askWeather("给我讲个笑话");
// 不涉及天气 → Agent 直接回答，不调用工具
\`\`\`
`,
    starterCode: `import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const weatherData: Record<string, string> = {
  北京: "晴，26°C",
  上海: "多云，29°C",
  深圳: "雷阵雨，31°C",
};

// TODO: 1. 定义 get_weather 工具（name 必须是 "get_weather"）

// TODO: 2. 创建模型和 Agent

export async function askWeather(question: string): Promise<string> {
  // TODO: 3. agent.invoke({ messages: [new HumanMessage(question)] })
  //          返回值的 messages 数组里，最后一条就是 Agent 的最终回答
  throw new Error("TODO: 请实现 askWeather");
}
`,
    exampleCode: `// 课程示例：05-agents/code/01-create-agent-basic.ts（精简版）
// ⚠️ API 写法参考；本题请做天气助手 get_weather（示例用的是计算器）
import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { evaluate } from "mathjs";

const calculatorTool = tool(
  async (input: { expression: string }) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "执行数学计算",
    schema: z.object({ expression: z.string().describe("数学表达式") }),
  },
);

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

async function main() {
  // 一行创建 Agent：ReAct 循环、错误处理全部内置
  const agent = createAgent({ model, tools: [calculatorTool] });

  const response = await agent.invoke({
    messages: [new HumanMessage("125 * 8 等于多少？")],
  });

  // response.messages 包含完整过程：Human → AI(tool_calls) → Tool → AI(最终回答)
  const lastMessage = response.messages[response.messages.length - 1];
  console.log(lastMessage.content);
}

main().catch(console.error);
`,
    solution: `import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const weatherData: Record<string, string> = {
  北京: "晴，26°C",
  上海: "多云，29°C",
  深圳: "雷阵雨，31°C",
};

const weatherTool = tool(
  async (input: { city: string }) => {
    return weatherData[input.city] ?? "暂无该城市的天气数据";
  },
  {
    name: "get_weather",
    description: "查询指定城市的当前天气",
    schema: z.object({ city: z.string().describe("城市名，如：北京") }),
  },
);

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

const agent = createAgent({ model, tools: [weatherTool] });

export async function askWeather(question: string): Promise<string> {
  const response = await agent.invoke({ messages: [new HumanMessage(question)] });
  const lastMessage = response.messages[response.messages.length - 1];
  return lastMessage.content as string;
}
`,
    hints: [
      "工具执行函数里用 weatherData[input.city] 查表，注意用 ?? 提供兜底。",
      "createAgent({ model, tools: [weatherTool] }) 即可，循环是自动的。",
      "agent.invoke 返回 { messages }，最终回答是 messages 的最后一条。",
    ],
    modelBehavior: ({ lastHuman, lastToolResults }) => {
      if (lastToolResults.length > 0) {
        const city = ["北京", "上海", "深圳"].find((c) => lastHuman.includes(c)) ?? "该城市";
        return { content: `根据查询结果：${city}今天${lastToolResults[0].content}` };
      }
      if (lastHuman.includes("天气")) {
        const city = ["北京", "上海", "深圳", "火星"].find((c) => lastHuman.includes(c)) ?? "北京";
        return { content: "", toolCalls: [{ name: "get_weather", args: { city } }] };
      }
      return { content: `这个问题不需要查天气：${lastHuman}` };
    },
    demo: async ({ exports, log }) => {
      if (typeof exports.askWeather !== "function") {
        log("请先实现并导出 askWeather(question)");
        return;
      }
      log("问天气:", "北京今天天气怎么样？");
      log("  →", await exports.askWeather("北京今天天气怎么样？"));
      log("无关问题:", "给我讲个笑话");
      log("  →", await exports.askWeather("给我讲个笑话"));
      log("未知城市:", "火星今天天气怎么样？");
      log("  →", await exports.askWeather("火星今天天气怎么样？"));
    },
    tests: [
      {
        name: "询问北京天气 → Agent 调用工具并给出含天气数据的回答",
        run: async ({ exports, expect }) => {
          const answer = await exports.askWeather("北京今天天气怎么样？");
          expect(answer, "回答").toContain("26°C");
        },
      },
      {
        name: "Agent 确实经历了『工具调用 → 结果回传』的完整循环",
        run: async ({ exports, expect, modelCalls }) => {
          await exports.askWeather("上海今天天气怎么样？");
          expect(
            modelCalls.some((c) => c.returnedToolCalls.includes("get_weather")),
            "模型产生过 get_weather 调用意图",
          ).toBe(true);
          expect(
            modelCalls.some((c) => c.hadToolResult),
            "工具结果被回传给了模型",
          ).toBe(true);
        },
      },
      {
        name: "工具处理未知城市：返回兜底文案而不是崩溃",
        run: async ({ exports, expect }) => {
          const answer = await exports.askWeather("火星今天天气怎么样？");
          expect(answer, "回答").toContain("暂无该城市的天气数据");
        },
      },
      {
        name: "与天气无关的问题：不调用工具，直接回答",
        run: async ({ exports, expect, modelCalls }) => {
          await exports.askWeather("给我讲个笑话");
          expect(
            modelCalls.every((c) => c.returnedToolCalls.length === 0),
            "全程没有工具调用",
          ).toBe(true);
        },
      },
    ],
  },
  {
    id: "ch05-agent-memory",
    chapter: 5,
    chapterName: "Agent 入门",
    title: "用 checkpointer 记住多轮对话",
    difficulty: "进阶",
    guideLink: "/guide/05-agents",
    description: `
### 📋 题目

第 02 章里，多轮对话要靠你自己维护 \`messages\` 数组。生产环境里，Agent 用 **checkpointer + \`thread_id\`** 自动保管历史：同一条线程接着聊，换一条线程互不干扰。

请实现一个带记忆的对话函数：

1. 创建 \`MemorySaver\`（从 \`@langchain/langgraph\` 导入）
2. \`createAgent({ model, checkpointer, systemPrompt: "你是一个会记住用户信息的助手。" })\`——本题不需要工具
3. **Agent 和 MemorySaver 必须放在模块顶层**（不要写在函数里面，否则每次调用都是新记忆）
4. 实现 \`chat(threadId, question)\`：用同一个 \`thread_id\` 调用 \`agent.invoke\`，返回最后一条消息的文本

### 函数签名

\`\`\`ts
export async function chat(threadId: string, question: string): Promise<string>
\`\`\`

### 期望行为

\`\`\`ts
await chat("user-a", "我叫小明，请记住。");
await chat("user-a", "我叫什么名字？");
// => 回答里包含「小明」

await chat("user-b", "我叫什么名字？");
// => 另一条线程没有这段历史，回答里不应出现「小明」
\`\`\`
`,
    starterCode: `import { createAgent, HumanMessage } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

// TODO: 1. 创建 MemorySaver 和 Agent（放在模块顶层）

export async function chat(threadId: string, question: string): Promise<string> {
  // TODO: 2. agent.invoke({ messages: [...] }, { configurable: { thread_id: threadId } })
  throw new Error("TODO: 请实现 chat");
}
`,
    exampleCode: `import { createAgent, HumanMessage } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

const checkpointer = new MemorySaver();
const agent = createAgent({
  model,
  tools: [],
  checkpointer,
  systemPrompt: "你是一个会记住用户信息的助手。",
});

const config = { configurable: { thread_id: "demo-thread" } };

await agent.invoke(
  { messages: [new HumanMessage("我叫小明，请记住。")] },
  config,
);
const followUp = await agent.invoke(
  { messages: [new HumanMessage("我叫什么名字？")] },
  config,
);
console.log(followUp.messages.at(-1)?.content);
`,
    solution: `import { createAgent, HumanMessage } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

const checkpointer = new MemorySaver();
const agent = createAgent({
  model,
  tools: [],
  checkpointer,
  systemPrompt: "你是一个会记住用户信息的助手。",
});

export async function chat(threadId: string, question: string): Promise<string> {
  const response = await agent.invoke(
    { messages: [new HumanMessage(question)] },
    { configurable: { thread_id: threadId } },
  );
  const lastMessage = response.messages[response.messages.length - 1];
  return lastMessage.content as string;
}
`,
    hints: [
      "MemorySaver 和 createAgent 都要写在文件顶层，chat() 里只负责 invoke。",
      "第二参数是 { configurable: { thread_id: threadId } }，不要把 thread_id 塞进 messages。",
      "同一 thread_id 会自动带上上次的历史；换一个 id 就是一场新对话。",
    ],
    modelBehavior: ({ lastHuman, messages }) => {
      const textOf = (content: unknown) =>
        typeof content === "string" ? content : JSON.stringify(content ?? "");
      if (lastHuman.includes("叫什么") || lastHuman.includes("我的名字")) {
        const remembered = messages.some((m) => {
          const t = textOf(m.content);
          return t.includes("我叫小明");
        });
        return remembered ? { content: "你叫小明。" } : { content: "我还不知道你的名字。" };
      }
      if (lastHuman.includes("我叫")) {
        return { content: "好的，我记住了。" };
      }
      return { content: `[模拟模型回复] ${lastHuman}` };
    },
    demo: async ({ exports, log }) => {
      if (typeof exports.chat !== "function") {
        log("请先实现并导出 chat(threadId, question)");
        return;
      }
      log("线程 A 自我介绍:", await exports.chat("user-a", "我叫小明，请记住。"));
      log("线程 A 追问名字:", await exports.chat("user-a", "我叫什么名字？"));
      log("线程 B 直接问名字:", await exports.chat("user-b", "我叫什么名字？"));
    },
    tests: [
      {
        name: "同一 thread_id 能记住上一轮的名字",
        run: async ({ exports, expect }) => {
          await exports.chat("user-a", "我叫小明，请记住。");
          const answer = await exports.chat("user-a", "我叫什么名字？");
          expect(answer, "同一线程的追问").toContain("小明");
        },
      },
      {
        name: "不同 thread_id 的历史互相隔离",
        run: async ({ exports, expect }) => {
          await exports.chat("user-a", "我叫小明，请记住。");
          const other = await exports.chat("user-b", "我叫什么名字？");
          expect(other, "另一条线程").toContain("不知道");
        },
      },
      {
        name: "必须真正走 invoke + thread_id，而不是手写全局数组糊弄",
        run: async ({ exports, expect, modelCalls }) => {
          await exports.chat("t1", "我叫小明，请记住。");
          await exports.chat("t1", "我叫什么名字？");
          expect(modelCalls.length, "同一线程的两次提问都应调用模型").toBeGreaterThanOrEqual(2);
          const second = modelCalls[1];
          expect(
            second.messageCount,
            "第二次调用应带上第一轮的历史（含系统消息时消息数应 > 2）",
          ).toBeGreaterThan(2);
        },
      },
    ],
  },
  {
    id: "ch05-agent-stream",
    chapter: 5,
    chapterName: "Agent 入门",
    title: "流式观察 Agent 的工具调用",
    difficulty: "进阶",
    guideLink: "/guide/05-agents",
    description: `
### 📋 题目

\`invoke()\` 会等到 Agent 全部跑完才返回。面向用户的界面更常用 \`stream()\`：每完成一步（模型决策 / 工具执行）就吐出一个增量。

请实现 \`collectToolNames(question)\`：

1. 定义 \`get_weather\` 工具（与上一题相同的城市表即可）
2. \`createAgent({ model, tools })\`
3. 用 \`agent.stream({ messages }, { streamMode: "updates" })\` 消费流
4. 从 \`chunk.model.messages\` 里收集所有 \`tool_calls[].name\`，按出现顺序返回

### 函数签名

\`\`\`ts
export async function collectToolNames(question: string): Promise<string[]>
\`\`\`

### 期望行为

\`\`\`ts
await collectToolNames("北京今天天气怎么样？");
// => ["get_weather"]

await collectToolNames("给我讲个笑话");
// => []   // 不需要工具，流里不会出现 tool_calls
\`\`\`
`,
    starterCode: `import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const weatherData: Record<string, string> = {
  北京: "晴，26°C",
  上海: "多云，29°C",
  深圳: "雷阵雨，31°C",
};

// TODO: 定义工具、创建 Agent

export async function collectToolNames(question: string): Promise<string[]> {
  // TODO: const stream = await agent.stream(...)
  //       for await (const chunk of stream) { ... }
  throw new Error("TODO: 请实现 collectToolNames");
}
`,
    exampleCode: `import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const weatherTool = tool(
  async (input: { city: string }) => \`Weather in \${input.city}\`,
  {
    name: "get_weather",
    description: "查询城市天气",
    schema: z.object({ city: z.string() }),
  },
);

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});
const agent = createAgent({ model, tools: [weatherTool] });

const stream = await agent.stream(
  { messages: [new HumanMessage("北京今天天气怎么样？")] },
  { streamMode: "updates" },
);

for await (const chunk of stream) {
  const aiMessages = chunk.model?.messages ?? [];
  for (const msg of aiMessages) {
    for (const call of msg.tool_calls ?? []) {
      console.log("工具:", call.name, call.args);
    }
  }
}
`,
    solution: `import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const weatherData: Record<string, string> = {
  北京: "晴，26°C",
  上海: "多云，29°C",
  深圳: "雷阵雨，31°C",
};

const weatherTool = tool(
  async (input: { city: string }) => {
    return weatherData[input.city] ?? "暂无该城市的天气数据";
  },
  {
    name: "get_weather",
    description: "查询指定城市的当前天气",
    schema: z.object({ city: z.string().describe("城市名，如：北京") }),
  },
);

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

const agent = createAgent({ model, tools: [weatherTool] });

export async function collectToolNames(question: string): Promise<string[]> {
  const names: string[] = [];
  const stream = await agent.stream(
    { messages: [new HumanMessage(question)] },
    { streamMode: "updates" },
  );
  for await (const chunk of stream) {
    const aiMessages = chunk.model?.messages ?? [];
    for (const msg of aiMessages) {
      for (const call of msg.tool_calls ?? []) {
        names.push(call.name);
      }
    }
  }
  return names;
}
`,
    hints: [
      "stream() 返回的是异步可迭代对象：for await (const chunk of stream)。",
      'streamMode: "updates" 时，模型节点的增量在 chunk.model.messages。',
      "tool_calls 可能是 undefined，用 ?? [] 再遍历。",
    ],
    modelBehavior: ({ lastHuman, lastToolResults }) => {
      if (lastToolResults.length > 0) {
        return { content: `根据查询结果：${lastToolResults[0].content}` };
      }
      if (lastHuman.includes("天气")) {
        const city = ["北京", "上海", "深圳"].find((c) => lastHuman.includes(c)) ?? "北京";
        return { content: "", toolCalls: [{ name: "get_weather", args: { city } }] };
      }
      return { content: `这个问题不需要查天气：${lastHuman}` };
    },
    demo: async ({ exports, log }) => {
      if (typeof exports.collectToolNames !== "function") {
        log("请先实现并导出 collectToolNames(question)");
        return;
      }
      log("问天气:", await exports.collectToolNames("北京今天天气怎么样？"));
      log("讲笑话:", await exports.collectToolNames("给我讲个笑话"));
    },
    tests: [
      {
        name: "天气问题：流中能收集到 get_weather",
        run: async ({ exports, expect }) => {
          const names = await exports.collectToolNames("北京今天天气怎么样？");
          expect(names, "工具名列表").toContain("get_weather");
        },
      },
      {
        name: "无关问题：流中没有工具调用",
        run: async ({ exports, expect }) => {
          const names = await exports.collectToolNames("给我讲个笑话");
          expect(names.length, "工具名数量").toBe(0);
        },
      },
      {
        name: "返回值是数组，且天气题至少有一个元素",
        run: async ({ exports, expect }) => {
          const names = await exports.collectToolNames("上海今天天气怎么样？");
          expect(Array.isArray(names), "返回数组").toBe(true);
          expect(names.length, "天气题应收集到工具名").toBeGreaterThan(0);
        },
      },
    ],
  },
];
