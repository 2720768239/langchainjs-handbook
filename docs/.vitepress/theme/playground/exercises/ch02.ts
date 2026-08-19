import { isAIMessage, isHumanMessage } from "@langchain/core/messages";
import { FakeChatModel } from "../sandbox/fake-chat-model";
import type { Exercise } from "../types";

export const ch02Exercises: Exercise[] = [
  {
    id: "ch02-multi-turn",
    chapter: 2,
    chapterName: "Chat 模型与基本交互",
    title: "多轮对话：管理历史",
    difficulty: "基础",
    guideLink: "/guide/02-chat-models",
    description: `
### 📋 题目

LLM 本身**没有记忆**——想让它记住上下文，就要每次把完整历史发过去。
实现工厂函数 \`createConversation\`，返回一个带记忆的对话对象：

- \`send(text)\`：把用户输入加入历史 → 携带**完整历史**调用模型 → 把 AI 回复也放回历史 → 返回回复文本
- \`history\`：完整的消息数组（\`HumanMessage\` / \`AIMessage\` 交替）

### 函数签名

\`\`\`ts
export function createConversation(model: ChatOpenAI): {
  send(text: string): Promise<string>;
  history: BaseMessage[];
}
\`\`\`

### 期望行为

\`\`\`ts
const chat = createConversation(model);
await chat.send("我叫小明");
// 模拟模型会报告它收到的消息数："我收到了 1 条消息……"
await chat.send("我叫什么名字？");
// => "我收到了 3 条消息……"  ← 说明历史被完整带上了！
chat.history.length; // => 4（人、AI、人、AI）
\`\`\`

> ⚠️ 最容易踩的坑：**忘记把 AI 的回复 push 回历史**，导致模型永远只看到用户说的话。
`,
    starterCode: `import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";

export function createConversation(model: ChatOpenAI) {
  const history: BaseMessage[] = [];

  return {
    history,
    async send(text: string): Promise<string> {
      // TODO: 1. 把用户消息（HumanMessage）加入 history
      // TODO: 2. 携带完整 history 调用 model.invoke
      // TODO: 3. 把模型返回的 AIMessage 也加入 history
      // TODO: 4. 返回回复文本
      throw new Error("TODO: 请实现 send");
    },
  };
}
`,
    exampleCode: `// 课程示例：02-chat-models/code/01-multi-turn.ts（精简版）
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

async function main() {
  const history: BaseMessage[] = [];

  // 第一轮
  history.push(new HumanMessage("你好，我叫小明"));
  const reply1 = await model.invoke(history);
  history.push(reply1); // 关键：AI 的回复也要进历史！

  // 第二轮——模型能"记住"名字，全靠完整历史
  history.push(new HumanMessage("我叫什么名字？"));
  const reply2 = await model.invoke(history);
  history.push(reply2);

  console.log(reply2.content);
}

main().catch(console.error);
`,
    solution: `import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";

export function createConversation(model: ChatOpenAI) {
  const history: BaseMessage[] = [];

  return {
    history,
    async send(text: string): Promise<string> {
      history.push(new HumanMessage(text));
      const reply = await model.invoke(history);
      history.push(reply); // AI 回复放回历史，下一轮才有"记忆"
      return reply.content as string;
    },
  };
}
`,
    hints: [
      "用 new HumanMessage(text) 构造用户消息。",
      "model.invoke() 可以直接接收消息数组。",
      "invoke 返回的 AIMessage 要原样 push 进 history。",
    ],
    modelBehavior: ({ messages, lastHuman }) => ({
      content: `我收到了 ${messages.length} 条消息。你刚才说：${lastHuman}`,
    }),
    demo: async ({ exports, log }) => {
      if (typeof exports.createConversation !== "function") {
        log("请先实现并导出 createConversation(model)");
        return;
      }
      const chat = exports.createConversation(new FakeChatModel());
      log("第 1 轮: 我叫小明");
      log("  →", await chat.send("我叫小明"));
      log("第 2 轮: 我叫什么名字？");
      log("  →", await chat.send("我叫什么名字？"));
      log(`history.length = ${chat.history.length}（期望 4：人、AI、人、AI）`);
    },
    tests: [
      {
        name: "第一轮对话：模型收到 1 条消息并返回回复文本",
        run: async ({ exports, expect }) => {
          const chat = exports.createConversation(new FakeChatModel());
          const reply = await chat.send("你好，我叫小明");
          expect(reply, "第一轮回复").toContain("我收到了 1 条消息");
        },
      },
      {
        name: "第二轮对话：历史被完整携带（模型应收到 3 条消息）",
        run: async ({ exports, expect }) => {
          const chat = exports.createConversation(new FakeChatModel());
          await chat.send("你好，我叫小明");
          const reply2 = await chat.send("我叫什么名字？");
          expect(reply2, "第二轮回复").toContain("我收到了 3 条消息");
        },
      },
      {
        name: "history 中人类消息与 AI 消息交替（共 4 条）",
        run: async ({ exports, expect }) => {
          const chat = exports.createConversation(new FakeChatModel());
          await chat.send("第一句");
          await chat.send("第二句");
          expect(chat.history, "history").toHaveLength(4);
          expect(isHumanMessage(chat.history[0]), "history[0] 是 HumanMessage").toBe(true);
          expect(isAIMessage(chat.history[1]), "history[1] 是 AIMessage").toBe(true);
          expect(isHumanMessage(chat.history[2]), "history[2] 是 HumanMessage").toBe(true);
          expect(isAIMessage(chat.history[3]), "history[3] 是 AIMessage").toBe(true);
        },
      },
    ],
  },
  {
    id: "ch02-streaming",
    chapter: 2,
    chapterName: "Chat 模型与基本交互",
    title: "流式输出：逐块接收回复",
    difficulty: "基础",
    guideLink: "/guide/02-chat-models",
    description: `
### 📋 题目

等模型把长回复全部生成完再显示，体验很糟。用 \`model.stream()\` 实现**流式输出**：

- 调用 \`model.stream(prompt)\` 获得异步迭代器
- 用 \`for await\` 逐块消费，每块调用一次 \`onChunk(片段文本)\`
- 把所有片段拼接成完整文本返回

### 函数签名

\`\`\`ts
export async function streamStory(
  model: ChatOpenAI,
  topic: string,
  onChunk: (piece: string) => void,
): Promise<string>
\`\`\`

### 期望行为

\`\`\`ts
const full = await streamStory(model, "程序员", (piece) => process.stdout.write(piece));
// onChunk 被调用多次，每次收到几个字符
// full === 所有片段按顺序拼接的完整文本
\`\`\`

> 💡 提示词请包含 \`topic\`（例如 \`\\\`请讲一个关于\${topic}的故事\\\`\`），模拟模型会把话题回声到回复里。
`,
    starterCode: `import { ChatOpenAI } from "@langchain/openai";

export async function streamStory(
  model: ChatOpenAI,
  topic: string,
  onChunk: (piece: string) => void,
): Promise<string> {
  // TODO: 1. 构造包含 topic 的提示词
  // TODO: 2. 调用 model.stream(...) 并用 for await 逐块处理
  // TODO: 3. 每个 chunk 的文本在 chunk.content 上；调用 onChunk 并累加
  // TODO: 4. 返回完整文本
  throw new Error("TODO: 请实现 streamStory");
}
`,
    exampleCode: `// 课程示例：02-chat-models/code/02-streaming.ts（精简版）
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

async function main() {
  // stream() 返回异步迭代器，而不是完整回复
  const stream = await model.stream("给我讲一个关于 AI 的短故事");

  for await (const chunk of stream) {
    // 每个 chunk 是 AIMessageChunk，content 是本次新增的文本片段
    process.stdout.write(chunk.content as string);
  }
}

main().catch(console.error);
`,
    solution: `import { ChatOpenAI } from "@langchain/openai";

export async function streamStory(
  model: ChatOpenAI,
  topic: string,
  onChunk: (piece: string) => void,
): Promise<string> {
  const stream = await model.stream(\`请讲一个关于\${topic}的故事\`);

  let full = "";
  for await (const chunk of stream) {
    const piece = chunk.content as string;
    onChunk(piece);
    full += piece;
  }
  return full;
}
`,
    hints: [
      "model.stream() 需要 await，它返回一个可以 for await 的异步迭代器。",
      "每个 chunk 是 AIMessageChunk，文本片段在 chunk.content 上。",
      "用一个变量累加所有片段，循环结束后返回。",
    ],
    modelBehavior: ({ lastHuman }) => ({
      content: `收到！${lastHuman} —— 从前有座山，山里有座庙，庙里的 AI 正在讲 LangChain 的故事。`,
    }),
    demo: async ({ exports, log }) => {
      if (typeof exports.streamStory !== "function") {
        log("请先实现并导出 streamStory(model, topic, onChunk)");
        return;
      }
      log("流式输出 topic = 「程序员」：");
      let n = 0;
      const full = await exports.streamStory(new FakeChatModel(), "程序员", (piece: string) => {
        n += 1;
        log(`  chunk#${n}:`, JSON.stringify(piece));
      });
      log(`共 ${n} 个片段，完整文本:`, full);
    },
    tests: [
      {
        name: "onChunk 被多次调用（真正的流式，而不是一次性返回）",
        run: async ({ exports, expect }) => {
          const pieces: string[] = [];
          await exports.streamStory(new FakeChatModel(), "程序员", (p: string) => pieces.push(p));
          expect(pieces.length, "onChunk 调用次数").toBeGreaterThan(5);
        },
      },
      {
        name: "返回值等于所有片段按顺序拼接",
        run: async ({ exports, expect }) => {
          const pieces: string[] = [];
          const full = await exports.streamStory(new FakeChatModel(), "程序员", (p: string) =>
            pieces.push(p),
          );
          expect(full, "完整文本").toBe(pieces.join(""));
          expect(full, "完整文本").toContain("从前有座山");
        },
      },
      {
        name: "提示词中包含了传入的话题",
        run: async ({ exports, expect }) => {
          const full = await exports.streamStory(new FakeChatModel(), "程序员", () => {});
          expect(full, "回复内容").toContain("程序员");
        },
      },
    ],
  },
];
