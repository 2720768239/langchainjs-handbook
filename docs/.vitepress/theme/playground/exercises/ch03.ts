import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  isAIMessage,
  isHumanMessage,
  isSystemMessage,
} from "@langchain/core/messages";
import { FakeChatModel } from "../sandbox/fake-chat-model";
import type { Exercise } from "../types";

export const ch03Exercises: Exercise[] = [
  {
    id: "ch03-prompt-template",
    chapter: 3,
    chapterName: "提示词、消息与结构化输出",
    title: "提示词模板：像邮件合并一样",
    difficulty: "基础",
    guideLink: "/guide/03-prompts",
    description: `
### 📋 题目

提示词模板（Prompt Template）= 固定结构 + 可变占位符，就像邮件合并。
用**真实的** \`ChatPromptTemplate\`（本题不需要模型）实现：

- 用 \`ChatPromptTemplate.fromMessages\` 创建一个翻译助手模板：
  - system 消息：说明角色，包含 \`{language}\` 占位符（目标语言）
  - human 消息：包含 \`{text}\` 占位符（要翻译的文本）
- 实现 \`buildMessages(language, text)\`：填充变量，返回格式化后的**消息数组**

### 函数签名

\`\`\`ts
export async function buildMessages(language: string, text: string): Promise<BaseMessage[]>
\`\`\`

### 期望行为

\`\`\`ts
const messages = await buildMessages("法语", "你好，世界");
// => [SystemMessage("你是一位精通法语的翻译…"), HumanMessage("请翻译：你好，世界")]
\`\`\`

> 💡 本题用的是**真实的 @langchain/core**——你写的代码和生产环境一模一样。
`,
    starterCode: `import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { BaseMessage } from "@langchain/core/messages";

// TODO: 用 ChatPromptTemplate.fromMessages 创建模板
// 提示：fromMessages 接收 [role, template] 元组数组，如 ["system", "…{language}…"]

export async function buildMessages(language: string, text: string): Promise<BaseMessage[]> {
  // TODO: 用 template.formatMessages({ ... }) 填充变量
  throw new Error("TODO: 请实现 buildMessages");
}
`,
    exampleCode: `// 课程示例：03-prompts-messages-outputs/code/03-basic-template.ts（精简版）
import { ChatPromptTemplate } from "@langchain/core/prompts";

async function main() {
  // {占位符} 会在 format 时被实际值替换
  const template = ChatPromptTemplate.fromMessages([
    ["system", "你是一位乐于助人的{role}"],
    ["human", "{question}"],
  ]);

  const messages = await template.formatMessages({
    role: "数学老师",
    question: "什么是质数？",
  });

  console.log(messages);
}

main().catch(console.error);
`,
    solution: `import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { BaseMessage } from "@langchain/core/messages";

const template = ChatPromptTemplate.fromMessages([
  ["system", "你是一位精通{language}的专业翻译，请把用户的文本翻译成{language}。"],
  ["human", "请翻译：{text}"],
]);

export async function buildMessages(language: string, text: string): Promise<BaseMessage[]> {
  return template.formatMessages({ language, text });
}
`,
    hints: [
      'fromMessages 的每一项是 ["system" | "human", "带{占位符}的模板文本"]。',
      "formatMessages({ language, text }) 返回填充好的消息数组。",
      "占位符名字必须和传给 formatMessages 的对象键一致。",
    ],
    demo: async ({ exports, log }) => {
      if (typeof exports.buildMessages !== "function") {
        log("请先实现并导出 buildMessages(language, text)");
        return;
      }
      const messages = await exports.buildMessages("法语", "你好，世界");
      log(`得到 ${messages.length} 条消息：`);
      for (const [i, msg] of messages.entries()) {
        log(`  [${i}] ${msg.constructor?.name ?? msg._getType?.() ?? "?"}:`, msg.content);
      }
    },
    tests: [
      {
        name: "返回 2 条消息：SystemMessage + HumanMessage",
        run: async ({ exports, expect }) => {
          const messages = await exports.buildMessages("法语", "你好，世界");
          expect(messages, "消息数组").toHaveLength(2);
          expect(isSystemMessage(messages[0]), "第 1 条是 SystemMessage").toBe(true);
          expect(isHumanMessage(messages[1]), "第 2 条是 HumanMessage").toBe(true);
        },
      },
      {
        name: "system 消息中填充了目标语言",
        run: async ({ exports, expect }) => {
          const messages = await exports.buildMessages("日语", "早上好");
          expect(messages[0].content as string, "system 内容").toContain("日语");
        },
      },
      {
        name: "human 消息中填充了待翻译文本（换个输入依然正确）",
        run: async ({ exports, expect }) => {
          const messages = await exports.buildMessages("英语", "千里之行始于足下");
          expect(messages[1].content as string, "human 内容").toContain("千里之行始于足下");
          expect(messages[1].content as string, "human 内容不应残留占位符").toSatisfy(
            (s: string) => !s.includes("{text}"),
            "不包含未填充的 {text}",
          );
        },
      },
    ],
  },
  {
    id: "ch03-few-shot",
    chapter: 3,
    chapterName: "提示词、消息与结构化输出",
    title: "Few-shot 提示：用例子教模型",
    difficulty: "进阶",
    guideLink: "/guide/03-prompts",
    description: `
### 📋 题目

想让模型模仿特定的输出格式？**给它看几个例子**（Few-shot Prompting）比长篇大论的描述有效得多。
实现 \`buildFewShotMessages\`，把示例编织成一段"演示对话"：

1. 第一条：\`SystemMessage\`（内容自拟，说明任务即可）
2. 中间：每个示例展开为一对消息——\`HumanMessage(example.input)\` + \`AIMessage(example.output)\`
3. 最后：真正要提问的 \`HumanMessage(question)\`

### 函数签名

\`\`\`ts
interface Example { input: string; output: string }
export function buildFewShotMessages(examples: Example[], question: string): BaseMessage[]
\`\`\`

### 期望行为

\`\`\`ts
buildFewShotMessages(
  [{ input: "开心", output: "😄" }, { input: "难过", output: "😢" }],
  "生气",
);
// => [System, Human("开心"), AI("😄"), Human("难过"), AI("😢"), Human("生气")]
//    共 2 + 2×2 = 6 条
\`\`\`

模型看到"人问 → AI 这样答"的模式后，就会照着例子的风格回答最后的问题。
`,
    starterCode: `import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";

interface Example {
  input: string;
  output: string;
}

export function buildFewShotMessages(examples: Example[], question: string): BaseMessage[] {
  // TODO: [SystemMessage, ...每个示例的 Human/AI 对, 最后的 HumanMessage]
  throw new Error("TODO: 请实现 buildFewShotMessages");
}
`,
    exampleCode: `// 课程示例：03-prompts-messages-outputs/code/05-few-shot.ts（精简版）
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

async function main() {
  // 通过"假装发生过的对话"给模型演示输出格式
  const messages = [
    new SystemMessage("你把情绪词翻译成 emoji。"),
    new HumanMessage("开心"),
    new AIMessage("😄"),
    new HumanMessage("难过"),
    new AIMessage("😢"),
    new HumanMessage("生气"), // 模型会模仿上面的模式回答
  ];

  const response = await model.invoke(messages);
  console.log(response.content); // 大概率是 😠
}

main().catch(console.error);
`,
    solution: `import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";

interface Example {
  input: string;
  output: string;
}

export function buildFewShotMessages(examples: Example[], question: string): BaseMessage[] {
  const messages: BaseMessage[] = [
    new SystemMessage("请严格模仿示例的输出格式回答。"),
  ];
  for (const example of examples) {
    messages.push(new HumanMessage(example.input));
    messages.push(new AIMessage(example.output));
  }
  messages.push(new HumanMessage(question));
  return messages;
}
`,
    hints: [
      "整体结构：1 条 System + N 对 (Human, AI) + 1 条 Human。",
      "示例的 input 用 HumanMessage 包装，output 用 AIMessage 包装。",
      "顺序很重要：模型是按顺序『读对话』来学习模式的。",
    ],
    demo: async ({ exports, log }) => {
      if (typeof exports.buildFewShotMessages !== "function") {
        log("请先实现并导出 buildFewShotMessages(examples, question)");
        return;
      }
      const messages = exports.buildFewShotMessages(
        [
          { input: "开心", output: "😄" },
          { input: "难过", output: "😢" },
        ],
        "生气",
      );
      log(`共 ${messages.length} 条消息（期望 6）：`);
      for (const [i, msg] of messages.entries()) {
        const kind = msg.constructor?.name ?? "?";
        log(`  [${i}] ${kind}:`, msg.content);
      }
    },
    tests: [
      {
        name: "2 个示例 → 共 6 条消息",
        run: ({ exports, expect }) => {
          const messages = exports.buildFewShotMessages(
            [
              { input: "开心", output: "😄" },
              { input: "难过", output: "😢" },
            ],
            "生气",
          );
          expect(messages, "消息数组").toHaveLength(6);
        },
      },
      {
        name: "消息类型顺序正确：System → (Human, AI)×2 → Human",
        run: ({ exports, expect }) => {
          const messages = exports.buildFewShotMessages(
            [
              { input: "开心", output: "😄" },
              { input: "难过", output: "😢" },
            ],
            "生气",
          );
          expect(isSystemMessage(messages[0]), "第 1 条是 SystemMessage").toBe(true);
          expect(isHumanMessage(messages[1]), "第 2 条是 HumanMessage").toBe(true);
          expect(isAIMessage(messages[2]), "第 3 条是 AIMessage").toBe(true);
          expect(isHumanMessage(messages[3]), "第 4 条是 HumanMessage").toBe(true);
          expect(isAIMessage(messages[4]), "第 5 条是 AIMessage").toBe(true);
          expect(isHumanMessage(messages[5]), "第 6 条是 HumanMessage").toBe(true);
        },
      },
      {
        name: "示例内容与最终问题填充正确",
        run: ({ exports, expect }) => {
          const messages = exports.buildFewShotMessages(
            [{ input: "苹果", output: "🍎" }],
            "香蕉",
          );
          expect(messages, "消息数组").toHaveLength(4);
          expect(messages[1].content as string, "示例输入").toBe("苹果");
          expect(messages[2].content as string, "示例输出").toBe("🍎");
          expect(messages[3].content as string, "最终问题").toBe("香蕉");
        },
      },
    ],
  },
  {
    id: "ch03-structured-output",
    chapter: 3,
    chapterName: "提示词、消息与结构化输出",
    title: "结构化输出：让模型返回类型安全的数据",
    difficulty: "基础",
    guideLink: "/guide/03-prompts",
    description: `
### 📋 题目

从自由文本中提取**结构化数据**是 LLM 最实用的能力之一。
用 Zod Schema + \`withStructuredOutput\` 实现商品信息提取：

1. 定义并导出 \`ProductSchema\`（Zod），包含三个字段：
   - \`name\`：字符串（商品名）
   - \`price\`：数字（价格）
   - \`inStock\`：布尔（是否有货）
2. 实现 \`extractProduct(model, text)\`：用 \`model.withStructuredOutput(ProductSchema)\` 从文本提取商品信息

### 函数签名

\`\`\`ts
export const ProductSchema: z.ZodObject<...>;
export async function extractProduct(model: ChatOpenAI, text: string): Promise<Product>
\`\`\`

### 期望行为

\`\`\`ts
await extractProduct(model, "无线机械键盘现价 399 元，现货充足");
// => { name: "无线机械键盘", price: 399, inStock: true }   ← price 是 number！
\`\`\`

> 💡 模拟模型认识两种商品文本：包含「机械键盘」或「显示器」的描述。
> 返回值会先经过你的 Schema 校验——字段类型写错测试就会失败。
`,
    starterCode: `import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

// TODO: 定义商品 Schema：name(string) / price(number) / inStock(boolean)
// 建议用 .describe() 给每个字段写说明——真实场景中这会显著提升提取准确率
export const ProductSchema = z.object({
  // ...
});

export async function extractProduct(model: ChatOpenAI, text: string) {
  // TODO: 用 model.withStructuredOutput(ProductSchema) 创建结构化模型并 invoke
  throw new Error("TODO: 请实现 extractProduct");
}
`,
    exampleCode: `// 课程示例：03-prompts-messages-outputs/code/07-structured-output.ts（精简版）
// ⚠️ API 写法参考；本题 Schema 是商品 Product（name/price/inStock），不是 Person
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

const PersonSchema = z.object({
  name: z.string().describe("此人的全名"),
  age: z.number().describe("年龄（数字）"),
  occupation: z.string().describe("职业"),
});

async function main() {
  // withStructuredOutput 返回的模型会直接输出符合 Schema 的对象
  const structuredModel = model.withStructuredOutput(PersonSchema);

  const person = await structuredModel.invoke(
    "我叫张伟，今年 28 岁，是一名软件工程师",
  );

  console.log(person.name, person.age); // 类型安全：age 一定是 number
}

main().catch(console.error);
`,
    solution: `import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

export const ProductSchema = z.object({
  name: z.string().describe("商品名称"),
  price: z.number().describe("商品价格（数字，不含货币符号）"),
  inStock: z.boolean().describe("是否有现货"),
});

export async function extractProduct(model: ChatOpenAI, text: string) {
  const structuredModel = model.withStructuredOutput(ProductSchema);
  return structuredModel.invoke(text);
}
`,
    hints: [
      "z.object({ name: z.string(), price: z.number(), inStock: z.boolean() })。",
      "withStructuredOutput(schema) 返回一个新的可 invoke 的对象。",
      "结构化模型的 invoke 直接返回数据对象，不需要再取 .content。",
    ],
    demo: async ({ exports, log }) => {
      if (typeof exports.extractProduct !== "function") {
        log("请先实现并导出 ProductSchema 与 extractProduct(model, text)");
        return;
      }
      const text = "无线机械键盘现价 399 元，现货充足";
      log("输入:", text);
      const product = await exports.extractProduct(new FakeChatModel(), text);
      log("提取结果:", product);
      log(
        `类型检查: price=${typeof product.price}, inStock=${typeof product.inStock}`,
      );
    },
    modelBehavior: ({ lastHuman }) => {
      if (lastHuman.includes("机械键盘")) {
        return { structured: { name: "无线机械键盘", price: 399, inStock: true } };
      }
      if (lastHuman.includes("显示器")) {
        return { structured: { name: "4K 显示器", price: 1899, inStock: false } };
      }
      return { structured: { name: "未知商品", price: 0, inStock: false } };
    },
    tests: [
      {
        name: "从文本中提取出完整的商品对象",
        run: async ({ exports, expect }) => {
          const product = await exports.extractProduct(
            new FakeChatModel(),
            "无线机械键盘现价 399 元，现货充足",
          );
          expect(product, "提取结果").toEqual({
            name: "无线机械键盘",
            price: 399,
            inStock: true,
          });
        },
      },
      {
        name: "price 是 number、inStock 是 boolean（类型安全）",
        run: async ({ exports, expect }) => {
          const product = await exports.extractProduct(
            new FakeChatModel(),
            "这台 4K 显示器售价 1899，目前缺货",
          );
          expect(typeof product.price, "price 类型").toBe("number");
          expect(typeof product.inStock, "inStock 类型").toBe("boolean");
          expect(product.inStock, "缺货商品的 inStock").toBe(false);
        },
      },
      {
        name: "ProductSchema 会拒绝缺字段/类型错误的数据",
        run: ({ exports, expect }) => {
          expect(exports.ProductSchema, "ProductSchema").toBeDefined();
          const bad = exports.ProductSchema.safeParse({ name: "键盘", price: "很贵" });
          expect(bad.success, "错误数据应校验失败").toBe(false);
          const good = exports.ProductSchema.safeParse({
            name: "键盘",
            price: 99,
            inStock: true,
          });
          expect(good.success, "正确数据应校验通过").toBe(true);
        },
      },
    ],
  },
];
