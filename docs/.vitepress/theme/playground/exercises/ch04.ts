import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { FakeChatModel } from "../sandbox/fake-chat-model";
import type { Exercise } from "../types";

export const ch04Exercises: Exercise[] = [
  {
    id: "ch04-define-tool",
    chapter: 4,
    chapterName: "函数调用与工具",
    title: "定义你的第一个工具",
    difficulty: "入门",
    guideLink: "/guide/04-tools",
    description: `
### 📋 题目

LLM 不会算数，但它可以**调用你写的计算器**。用 \`tool()\` + Zod 定义一个计算器工具：

- 名称必须是 \`calculator\`
- 写一句有意义的 \`description\`（模型靠它决定何时调用这个工具）
- Schema：\`{ expression: string }\`（数学表达式）
- 执行逻辑：用 \`evaluate\`（来自 mathjs）求值，**以字符串形式返回结果**

### 要导出的内容

\`\`\`ts
export const calculatorTool = tool(执行函数, 配置对象);
\`\`\`

### 期望行为

\`\`\`ts
await calculatorTool.invoke({ expression: "25 * 8" }); // => "200"
calculatorTool.name;        // => "calculator"
calculatorTool.description; // => "执行数学计算…"
\`\`\`

> 💡 工具本质上就是「一个函数 + 一份给模型看的说明书（name/description/schema）」。
> 本题先单独测试工具本身，下一题再把它交给模型。
`,
    starterCode: `import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";

// TODO: 用 tool(执行函数, { name, description, schema }) 定义计算器
// 注意：工具返回值需要是字符串（String(result)）

export const calculatorTool = tool(
  async (input) => {
    throw new Error("TODO: 用 evaluate(input.expression) 求值并返回字符串");
  },
  {
    name: "TODO",
    description: "TODO",
    schema: z.object({
      // TODO: expression 字段，别忘了 .describe()
    }),
  },
);
`,
    exampleCode: `// 课程示例：04-function-calling-tools/code/01-simple-tool.ts（精简版）
// ⚠️ API 写法参考；本题请实现计算器工具 calculator（不是天气工具）
import { tool } from "langchain";
import * as z from "zod";

// tool() 把普通函数变成模型可用的工具
const weatherTool = tool(
  async (input) => {
    // 真实场景里这里会调用天气 API
    return \`\${input.city}：晴，26°C\`;
  },
  {
    name: "get_weather",
    description: "查询指定城市的当前天气", // 模型靠这句话决定什么时候用它
    schema: z.object({
      city: z.string().describe("城市名，如：北京"),
    }),
  },
);

async function main() {
  // 工具可以脱离模型单独调用（方便测试！）
  const result = await weatherTool.invoke({ city: "北京" });
  console.log(result);
}

main().catch(console.error);
`,
    solution: `import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";

export const calculatorTool = tool(
  async (input: { expression: string }) => {
    const result = evaluate(input.expression);
    return String(result); // 工具的返回值要是字符串
  },
  {
    name: "calculator",
    description: "执行数学计算。当需要计算数学表达式时使用此工具。",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式，如 '25 * 8'"),
    }),
  },
);
`,
    hints: [
      "tool() 的第一个参数是异步执行函数，第二个参数是 { name, description, schema }。",
      "schema: z.object({ expression: z.string().describe('...') })。",
      "evaluate 返回数字，记得用 String() 转成字符串再返回。",
    ],
    demo: async ({ exports, log }) => {
      if (!exports.calculatorTool) {
        log("请先实现并导出 calculatorTool");
        return;
      }
      log("工具名:", exports.calculatorTool.name);
      log("描述:", exports.calculatorTool.description);
      const expr = "25 * 8";
      const result = await exports.calculatorTool.invoke({ expression: expr });
      log(`${expr} =`, result);
      const expr2 = "(3 + 5) * 2";
      log(`${expr2} =`, await exports.calculatorTool.invoke({ expression: expr2 }));
    },
    tests: [
      {
        name: "工具名称是 calculator 且有描述",
        run: ({ exports, expect }) => {
          expect(exports.calculatorTool, "calculatorTool").toBeDefined();
          expect(exports.calculatorTool.name, "工具名").toBe("calculator");
          expect((exports.calculatorTool.description ?? "").length, "描述长度").toBeGreaterThan(4);
        },
      },
      {
        name: "能正确计算表达式并返回字符串",
        run: async ({ exports, expect }) => {
          const result = await exports.calculatorTool.invoke({ expression: "25 * 8" });
          expect(result, "计算结果").toBe("200");
          const result2 = await exports.calculatorTool.invoke({
            expression: "(3 + 5) * 2",
          });
          expect(result2, "带括号的计算结果").toBe("16");
        },
      },
      {
        name: "Schema 会拦截缺少 expression 的非法输入",
        run: async ({ exports, expect }) => {
          let threw = false;
          try {
            await exports.calculatorTool.invoke({});
          } catch {
            threw = true;
          }
          expect(threw, "非法输入应抛出校验错误").toBe(true);
        },
      },
    ],
  },
  {
    id: "ch04-tool-loop",
    chapter: 4,
    chapterName: "函数调用与工具",
    title: "手写工具调用循环",
    difficulty: "进阶",
    guideLink: "/guide/04-tools",
    description: `
### 📋 题目

**核心心智模型：模型只产生"调用意图"（tool_calls），执行永远发生在你的代码里。**
在用 \`createAgent\` 之前，先手写一次完整的调用循环，彻底理解这件事：

1. \`model.bindTools(tools)\` 让模型知道有哪些工具可用
2. 第一次 invoke：检查回复的 \`response.tool_calls\`
3. 若有工具调用：找到对应工具执行（\`tool.invoke(toolCall)\` 会直接返回 \`ToolMessage\`），
   把 **AI 回复 + ToolMessage** 都追加到消息数组，再次 invoke 得到最终回答
4. 若没有工具调用：模型直接回答了，返回其内容即可

### 函数签名

\`\`\`ts
export async function runWithTools(
  model: ChatOpenAI,
  tools: StructuredTool[],
  question: string,
): Promise<string>
\`\`\`

### 期望行为

\`\`\`ts
await runWithTools(model, [calculatorTool], "请计算 25 * 17");
// 模型第 1 次回复：tool_calls = [{ name: "calculator", args: { expression: "25 * 17" } }]
// 你执行工具得到 "425"，回传后模型给出最终回答："计算结果是 425"

await runWithTools(model, [calculatorTool], "你好！");
// 模型不需要工具，直接回答 → 你的循环应能处理这种情况
\`\`\`
`,
    starterCode: `import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";

export async function runWithTools(
  model: ChatOpenAI,
  tools: StructuredTool[],
  question: string,
): Promise<string> {
  // TODO: 1. modelWithTools = model.bindTools(tools)
  // TODO: 2. messages = [new HumanMessage(question)]，invoke 一次
  // TODO: 3. 如果 response.tool_calls 非空：
  //          - 对每个 toolCall：找到同名工具，await tool.invoke(toolCall) 得到 ToolMessage
  //          - 把 AI 回复和所有 ToolMessage 都 push 进 messages，再 invoke 一次
  // TODO: 4. 返回最终回复的 content
  throw new Error("TODO: 请实现 runWithTools");
}
`,
    exampleCode: `// 课程示例：04-function-calling-tools/code/03-tool-execution.ts（精简版）
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";

const calculatorTool = tool(
  async (input: { expression: string }) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "执行数学计算",
    schema: z.object({ expression: z.string() }),
  },
);

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

async function main() {
  const modelWithTools = model.bindTools([calculatorTool]);
  const messages = [new HumanMessage("请计算 25 * 17")];

  // 第一步：模型产生调用意图（不会真的执行！）
  const response = await modelWithTools.invoke(messages);
  console.log("工具调用意图:", response.tool_calls);

  if (response.tool_calls?.length) {
    messages.push(response); // AI 的"我要用工具"也要进历史
    for (const toolCall of response.tool_calls) {
      // 第二步：由你的代码执行工具，得到 ToolMessage
      const toolMessage = await calculatorTool.invoke(toolCall);
      messages.push(toolMessage);
    }
    // 第三步：把结果带回去，模型给出最终回答
    const final = await modelWithTools.invoke(messages);
    console.log("最终回答:", final.content);
  }
}

main().catch(console.error);
`,
    solution: `import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";

export async function runWithTools(
  model: ChatOpenAI,
  tools: StructuredTool[],
  question: string,
): Promise<string> {
  const modelWithTools = model.bindTools(tools);
  const messages: BaseMessage[] = [new HumanMessage(question)];

  const response = await modelWithTools.invoke(messages);

  // 模型不需要工具：直接返回回答
  if (!response.tool_calls || response.tool_calls.length === 0) {
    return response.content as string;
  }

  // 模型需要工具：执行每个调用意图，把结果回传
  messages.push(response);
  for (const toolCall of response.tool_calls) {
    const matched = tools.find((t) => t.name === toolCall.name);
    if (!matched) throw new Error(\`未找到工具：\${toolCall.name}\`);
    const toolMessage = await matched.invoke(toolCall); // 返回 ToolMessage
    messages.push(toolMessage);
  }

  const final = await modelWithTools.invoke(messages);
  return final.content as string;
}
`,
    hints: [
      "bindTools 返回新的模型实例，原模型不变。",
      "把完整的 toolCall 对象传给 tool.invoke()，会直接得到 ToolMessage。",
      "第二次 invoke 前，消息数组应该是 [Human, AI(带 tool_calls), ToolMessage]。",
      "别忘了处理模型不调用工具、直接回答的分支。",
    ],
    modelBehavior: ({ lastHuman, lastToolResults }) => {
      if (lastToolResults.length > 0) {
        return { content: `计算结果是 ${lastToolResults[0].content}` };
      }
      const match = lastHuman.match(/(\d+)\s*[*x×]\s*(\d+)/);
      if (match) {
        return {
          content: "",
          toolCalls: [{ name: "calculator", args: { expression: `${match[1]} * ${match[2]}` } }],
        };
      }
      return { content: `你好！这个问题我不需要工具就能回答：${lastHuman}` };
    },
    demo: async ({ exports, log }) => {
      if (typeof exports.runWithTools !== "function") {
        log("请先实现并导出 runWithTools(model, tools, question)");
        return;
      }
      const calculator = tool(
        async (input: { expression: string }) =>
          String(new Function(`return (${input.expression})`)()),
        {
          name: "calculator",
          description: "执行数学计算",
          schema: z.object({ expression: z.string() }),
        },
      );
      log("需要工具: 请计算 25 * 17");
      log("  →", await exports.runWithTools(new FakeChatModel(), [calculator], "请计算 25 * 17"));
      log("不需要工具: 你好！");
      log("  →", await exports.runWithTools(new FakeChatModel(), [calculator], "你好！"));
    },
    tests: [
      {
        name: "需要计算时：完成 模型→工具→模型 完整循环，返回含结果的回答",
        run: async ({ exports, expect }) => {
          const calculator = tool(
            async (input: { expression: string }) =>
              String(new Function(`return (${input.expression})`)()),
            {
              name: "calculator",
              description: "执行数学计算",
              schema: z.object({ expression: z.string() }),
            },
          );
          const answer = await exports.runWithTools(
            new FakeChatModel(),
            [calculator],
            "请计算 25 * 17",
          );
          expect(answer, "最终回答").toContain("425");
        },
      },
      {
        name: "工具结果确实回传给了模型（第二次调用带有 ToolMessage）",
        run: async ({ exports, expect, modelCalls }) => {
          const calculator = tool(
            async (input: { expression: string }) =>
              String(new Function(`return (${input.expression})`)()),
            {
              name: "calculator",
              description: "执行数学计算",
              schema: z.object({ expression: z.string() }),
            },
          );
          await exports.runWithTools(new FakeChatModel(), [calculator], "请计算 12 * 12");
          expect(modelCalls.length, "模型调用次数").toBe(2);
          expect(modelCalls[1].hadToolResult, "第二次调用应包含工具结果").toBe(true);
        },
      },
      {
        name: "不需要工具时：直接返回模型回答（只调用一次模型）",
        run: async ({ exports, expect, modelCalls }) => {
          const answer = await exports.runWithTools(new FakeChatModel(), [], "你好！");
          expect(answer, "回答").toContain("你好");
          expect(modelCalls.length, "模型调用次数").toBe(1);
        },
      },
    ],
  },
];
