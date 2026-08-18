# 02. Chat 模型与基本交互

> 🎯 掌握与 AI 自然对话的全部基本功：多轮上下文、流式输出、参数调优、错误重试与 token 追踪。

::: tip 本章速览
- Chat 模型没有记忆：每次调用都要发送**完整对话历史**
- 多轮对话的关键动作：AI 的回复也要 `push` 回历史数组
- `stream()` 逐块输出，大幅提升用户体验
- `temperature` 控制随机性，`maxTokens` 控制长度与成本
- `withRetry()` 内置指数退避重试，优雅应对 429 限流
- `usage_metadata` 追踪 token 用量，成本尽在掌握
:::

## 知识渊博的朋友类比

想象你和一位知识渊博的朋友喝咖啡聊天：你们**有来有回地对话**（不是一问一答就散场）、他**记得你之前说过什么**（上下文）、他**边想边说**（流式输出）、他会**根据你的偏好调整语气**（模型参数），偶尔也**需要你再说一遍**（错误处理）。

Chat 模型的工作方式一模一样——本章逐一拆解这五种能力。

![知识渊博的朋友类比：Chat 模型像朋友一样进行有上下文、可调节的对话](/images/02-chat-models/knowledgeable-friend-analogy.png)

## 多轮对话：历史管理

### 关键认知：模型其实没有记忆

Chat 模型**不会真的「记住」**之前的消息。所谓上下文，是你在每次请求时把**整个对话历史**重新发一遍——相当于每次都把完整的聊天记录摊在 AI 面前。

![消息数组随对话轮次不断增长，每次 invoke() 都发送完整历史](/images/02-chat-models/conversation-history-flow.png)

### 三种消息类型回顾

| 类型 | 用途 | 示例 |
|------|------|------|
| `SystemMessage` | 设定 AI 行为与人格 | `new SystemMessage("You are a coding tutor")` |
| `HumanMessage` | 用户输入 | `new HumanMessage("What is TypeScript?")` |
| `AIMessage` | AI 的回复（含元数据） | `invoke()` 返回值，含 `content`、`usage_metadata` |

用消息类（Message Class）构建对话的好处：语义明确、TypeScript 类型安全、编辑器自动补全。（字典格式 `{ role, content }` 等替代写法见第 03 章。）

### 实战：三轮对话

场景：编程辅导机器人。学生先问「什么是 TypeScript」，再追问「能给个例子吗」——没有历史，AI 根本不知道「例子」指什么。

```ts
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from "langchain";
import "dotenv/config";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

// 历史数组：从系统指令 + 第一个问题开始
const messages: BaseMessage[] = [
  new SystemMessage("You are a helpful coding tutor who gives clear, concise explanations."),
  new HumanMessage("What is TypeScript?"),
];

// 第一轮
const response1 = await model.invoke(messages);
messages.push(new AIMessage(String(response1.content))); // ⭐ AI 回复也要进历史！

// 第二轮：AI 知道「example」指的是 TypeScript 的例子
messages.push(new HumanMessage("Can you show me a simple example?"));
const response2 = await model.invoke(messages);
messages.push(new AIMessage(String(response2.content)));

// 第三轮：上下文依然完整
messages.push(new HumanMessage("What are the benefits compared to JavaScript?"));
const response3 = await model.invoke(messages);

console.log(`📊 历史中共 ${messages.length} 条消息`); // 6 条
```

四个要点：

1. **一个数组装下整场对话**（system + human + ai）
2. **每次拿到回复都 push 回数组**——漏了这步，下一轮 AI 就「失忆」
3. **AI 能引用任何早前消息**，代词「它」「这个」都能正确解析
4. **每次 `invoke()` 发送的是完整历史**，这就是「记忆」的真相

## 流式输出 stream()

问复杂问题时，等 5~10 秒才看到完整回复的体验很糟。**流式输出（Streaming）**让文字像 ChatGPT 那样逐词出现——就像朋友边想边说，而不是憋完一整段才开口。

![流式与非流式对比：非流式等待后一次性显示，流式渐进呈现体验更好](/images/02-chat-models/streaming-comparison.png)

把 `invoke()` 换成 `stream()` 即可：

```ts
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY
});

// stream() 返回一个异步可迭代对象（async iterable）
const stream = await model.stream("Explain how the internet works in 3 paragraphs.");

for await (const chunk of stream) {
  process.stdout.write(String(chunk.content)); // 不换行，逐块打印
}
```

工作原理：`stream()` 返回异步可迭代对象，用 `for await...of` 消费；每个 chunk 是几个词的片段；`process.stdout.write()` 不加换行，形成打字机效果。

**何时用流式：**

- ✅ 长回复（文章、解释、代码）
- ✅ 面向用户的聊天界面——即刻反馈，感知性能大幅提升（哪怕总耗时一样）
- ❌ 需要先拿到完整结果再处理的场景（解析、校验、后处理）

::: details 流式模式下如何拿 token 用量？
部分提供商支持 `streamOptions: { includeUsage: true }`，会在最后一个 chunk 附带用量元数据。这是提供商相关特性，用前查文档。
:::

## 参数调优

### temperature：随机性旋钮（0.0 ~ 2.0）

| 值 | 行为 | 适用场景 |
|----|------|----------|
| 0.0 | 确定性：同问同答 | 代码生成、事实问答 |
| 1.0（默认） | 一致性与多样性平衡 | 通用对话 |
| 2.0 | 天马行空、难以预测 | 创意写作、头脑风暴 |

用同一个提示词跑不同温度感受差异：

```ts
const prompt = "Write a creative opening line for a sci-fi story about time travel.";

for (const temp of [0, 1, 2]) {
  const model = new ChatOpenAI({
    model: process.env.AI_MODEL,
    configuration: { baseURL: process.env.AI_ENDPOINT },
    apiKey: process.env.AI_API_KEY,
    temperature: temp, // 控制随机性 / 创造力
  });

  try {
    const response = await model.invoke(prompt);
    console.log(`温度 ${temp}: ${response.content}`);
  } catch (error: any) {
    // 有些模型只支持默认温度，优雅跳过
    if (error.code === "unsupported_value" && error.param === "temperature") {
      console.log(`⚠️ 该模型不支持 temperature=${temp}，跳过`);
    } else {
      throw error;
    }
  }
}
```

::: warning 温度支持因模型而异
- GitHub Models（OpenAI 系）：多数支持 0.0~2.0
- Microsoft Foundry：一般限制在 0.0~1.0
- 部分模型（如 `gpt-5-mini`）**只接受默认值 1**，传其他值直接报 400

所以真实应用要像上面那样用 try-catch 兜住不支持的参数值。
:::

### maxTokens：长度与成本的闸门

先理解 **token**：它是模型处理文本的基本单位，可以理解为「词的碎片」——大约 1 token ≈ 4 个字符 ≈ ¾ 个英文单词，"Hello world!" 约 3 个 token。

![文本被切分为 token 的可视化：拼图的每一块代表一个 token](/images/02-chat-models/tokenization-puzzle.png)

```ts
const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
  maxTokens: 100, // 回复上限约 75 个英文单词
});
```

实验结论：`maxTokens: 50` 时回复常被拦腰截断；150 能给出部分解释；500 才够完整详细。**它是防止成本失控的保险丝，但设太低会切断有用内容。**

## 统一初始化：initChatModel()

除了直接 `new ChatOpenAI()`，LangChain.js 还提供 `initChatModel()` 做**提供商无关（Provider-Agnostic）**的初始化——好比万能电源适配器，一个接口适配 OpenAI、Anthropic、Google 等所有标准提供商：

```ts
import { initChatModel } from "langchain/chat_models/universal";

// 同一套代码结构，切换任意提供商
const openaiModel = await initChatModel("gpt-5-mini", {
  modelProvider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropicModel = await initChatModel("claude-3-5-sonnet-20241022", {
  modelProvider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

| 对比项 | `ChatOpenAI`（课程推荐） | `initChatModel()` |
|--------|--------------------------|-------------------|
| 自定义 endpoint | ✅ 优秀 | ⚠️ 受限 |
| 学习曲线 | ✅ 更直观 | 🔄 中等 |
| 适用场景 | 单一提供商 / 自定义端点（GitHub Models、Azure） | 在多个标准提供商之间切换 |

**本课程坚持用 `ChatOpenAI`**：它对 GitHub Models 和 Azure OpenAI 这类自定义 `baseURL` 支持最好，写法也更显式易懂。

## 错误处理与重试

API 调用随时可能失败，常见错误：

- **429 Too Many Requests**：速率限制（免费额度最常见）
- **401 Unauthorized**：API Key 无效
- **500 Server Error**：提供商临时故障
- **Network timeout**：网络问题

不必手写重试循环，LangChain 内置了带**指数退避（Exponential Backoff）**的 `withRetry()`：

```ts
const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

// 包一层自动重试：失败后等 1s、2s、4s… 再试，最多 3 次
const modelWithRetry = model.withRetry({ stopAfterAttempt: 3 });

try {
  const response = await modelWithRetry.invoke("What is LangChain.js?");
  console.log(response.content);
} catch (error: any) {
  // 重试次数用尽才会走到这里，按错误类型给出提示
  if (error.message.includes("429")) {
    console.log("💡 触发速率限制，稍后再试");
  } else if (error.message.includes("401")) {
    console.log("💡 检查 .env 中的 API Key");
  }
}
```

`withRetry()` 的优势：自动指数退避、429 优雅重试、与 Agent / RAG / Chain 等所有 LangChain 组件兼容、代码量最少。

::: warning 已知限制
`withRetry()` 目前对 `stream()` 支持不佳——重试逻辑在 `invoke()` 上工作正常，但流式调用时可能不生效。对可靠性要求高的操作请用 `invoke()`。
:::

## Token 用量追踪

Token 直接决定成本和速度。每次 `invoke()` 返回的 `AIMessage` 都自带 `usage_metadata`（v1 API）：

```ts
const response = await model.invoke("Explain what TypeScript is in 2 sentences.");

const usage = response.usage_metadata;
if (usage) {
  console.log(`输入 token:  ${usage.input_tokens}`);   // 你的提问 + 历史
  console.log(`输出 token:  ${usage.output_tokens}`);  // AI 的回复
  console.log(`总计 token:  ${usage.total_tokens}`);   // 计费依据
}
```

为什么要追踪？💰 监控 API 开销、⚡ token 越多响应越慢、📊 找出昂贵的查询、🎯 为上生产做预算。

### 两个降本技巧

```ts
// 1. 用 maxTokens 给回复长度封顶
const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
  maxTokens: 1000,
});

// 2. 裁剪对话历史，减少输入 token
const recentMessages = messages.slice(-10); // 只保留最近 10 条
const response = await model.invoke(recentMessages);
```

这也解释了为什么要关心**上下文窗口（Context Window）**：模型能处理的历史有限（4K~200K+ token），历史越长成本越高、速度越慢——长对话必须做历史管理。

## ⚠️ 常见坑

- **忘记把 AI 回复 push 回历史** → 下一轮 AI「失忆」，多轮对话最高频错误
- **以为模型自己会记住对话** → 不会！记忆完全由你维护的 messages 数组决定
- **对 `gpt-5-mini` 传 `temperature: 0`** → 400 报错，该模型只支持默认值 1
- **`maxTokens` 设太小** → 回复被硬截断，看起来像模型「话说一半」
- **给 `stream()` 套 `withRetry()`** → 重试可能不触发，关键路径用 `invoke()`
- **历史无限增长** → token 成本线性上涨且可能撞上下文窗口上限，记得裁剪

## ✅ 核心要点

- 多轮对话 = 每次发送完整历史；AI 回复必须 push 回数组
- `stream()` + `for await` 实现打字机效果，用户体验质变
- `temperature` 调随机性（0 稳定 → 2 狂野），但支持范围因模型而异
- `maxTokens` 同时控制长度与成本；1 token ≈ 4 字符
- `withRetry()` 一行搞定指数退避重试
- `response.usage_metadata` 是成本监控的第一手数据

## 🏋️ 动手练习

- [多轮对话历史管理](/playground/?id=ch02-multi-turn) —— 亲手维护 messages 数组，体会「忘记 push 回复」的后果
- [流式输出](/playground/?id=ch02-streaming) —— 用 `stream()` 实现打字机效果，对比首字延迟

## 📚 延伸阅读

- [Chat 模型官方文档](https://js.langchain.com/docs/integrations/chat/)
- [流式输出指南](https://js.langchain.com/docs/how_to/streaming/)
- [OpenAI Chat API 参数参考](https://platform.openai.com/docs/api-reference/chat/create)
