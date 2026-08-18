import type { Exercise } from "../types";

export const ch01Exercises: Exercise[] = [
  {
    id: "ch01-hello-llm",
    chapter: 1,
    chapterName: "初识 LangChain.js",
    title: "第一次 LLM 调用",
    difficulty: "入门",
    guideLink: "/guide/01-introduction",
    description: `
### 📋 题目

完成你的第一次 LangChain.js 模型调用！实现并导出函数 \`askModel\`：

- 创建一个 \`ChatOpenAI\` 模型实例
- 用 \`model.invoke(question)\` 向模型提问
- 返回回复的**文本内容**（\`response.content\`），而不是整个消息对象

### 函数签名

\`\`\`ts
export async function askModel(question: string): Promise<string>
\`\`\`

### 期望行为

\`\`\`ts
await askModel("什么是 LangChain？");
// => "[模拟模型回复] 我收到了你的消息：什么是 LangChain？"
\`\`\`

> 💡 训练场中的 \`ChatOpenAI\` 是**离线确定性模拟模型**，无需 API Key。
> 它的 API（\`invoke\` / \`stream\` / \`bindTools\`…）与真实模型完全一致，
> 回复内容是可预测的，因此测试可以精确断言。
`,
    starterCode: `import { ChatOpenAI } from "@langchain/openai";

// TODO: 1. 创建模型实例（训练场中无需真实的 API Key，参数照常传即可）
// TODO: 2. 实现 askModel：调用模型并返回回复文本

export async function askModel(question: string): Promise<string> {
  throw new Error("TODO: 请实现 askModel");
}
`,
    exampleCode: `// 课程示例：01-introduction/code/01-hello-world.ts（精简版）
import { ChatOpenAI } from "@langchain/openai";

async function main() {
  const model = new ChatOpenAI({
    model: process.env.AI_MODEL,
    configuration: { baseURL: process.env.AI_ENDPOINT },
    apiKey: process.env.AI_API_KEY,
  });

  // invoke() 返回 AIMessage 对象，.content 才是文本
  const response = await model.invoke("What is LangChain in one sentence?");
  console.log("AI 回复:", response.content);
}

main().catch(console.error);
`,
    solution: `import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

export async function askModel(question: string): Promise<string> {
  const response = await model.invoke(question);
  // response 是 AIMessage，content 才是文本内容
  return response.content as string;
}
`,
    hints: [
      "invoke() 的返回值是一个 AIMessage 对象，不是字符串。",
      "AIMessage 上的 .content 属性才是模型回复的文本。",
      "别忘了 invoke 是异步的，需要 await。",
    ],
    demo: async ({ exports, log }) => {
      if (typeof exports.askModel !== "function") {
        log("请先实现并导出 askModel(question)");
        return;
      }
      const question = "什么是 LangChain？";
      log("提问:", question);
      const answer = await exports.askModel(question);
      log("回复:", answer);
    },
    tests: [
      {
        name: "导出了 askModel 函数",
        run: ({ exports, expect }) => {
          expect(typeof exports.askModel, "askModel").toBe("function");
        },
      },
      {
        name: "返回的是回复文本（string），而不是消息对象",
        run: async ({ exports, expect }) => {
          const result = await exports.askModel("什么是 LangChain？");
          expect(typeof result, "返回值类型").toBe("string");
        },
      },
      {
        name: "回复内容包含提问原文（模拟模型会回声你的问题）",
        run: async ({ exports, expect }) => {
          const result = await exports.askModel("什么是 LangChain？");
          expect(result, "回复内容").toContain("什么是 LangChain？");
          expect(result, "回复内容").toContain("[模拟模型回复]");
        },
      },
    ],
  },
];
