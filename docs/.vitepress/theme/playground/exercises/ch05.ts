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
];
