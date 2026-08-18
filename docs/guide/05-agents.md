# 05. Agent 入门

> 🎯 理解 Agent 如何「思考 → 调工具 → 再思考」，并用 `createAgent()` 把第 04 章手写的循环交给框架。

::: tip 本章速览
- Agent = 模型 + 工具 + 循环：自己决定调什么、调几次，直到能回答
- `createAgent({ model, tools, systemPrompt })` 一行接管循环；答案在 `response.messages` 末尾
- 多工具靠 **名称 + 描述** 路由，描述写清楚才会选得准
- 跨请求记忆用 `checkpointer` + `thread_id`，不要自己记账
- 看过程用 `agent.stream({ streamMode: "updates" })`，不要用第 02 章的 `model.stream()`
:::

## 经理与专家：Agent 在做什么

想象你带着一组专家：有人能查库、有人能搜网、有人能算数。有人问「本季度收入同比增长多少？」，你不会亲自干活，而是：

1. **想**：先要数据，再算百分比
2. **做**：请数据分析师取数 → 看结果 → 再请会计计算
3. **答**：把结果告诉提问的人

![项目经理与专家团队 vs AI Agent 与工具：两者遵循相同的委派迭代模式](/images/05-agents/manager-specialists-analogy.png)

Agent 一模一样。同一句「巴黎现在天气如何？」：

```text
裸 LLM：  我无法访问实时天气……
Agent：   思考 → getWeather({ city: "Paris" }) → 观察 "18°C"
          → "巴黎现在 18°C，少云。"
```

![标准 LLM 局限于训练数据，带工具的 Agent 可以访问实时数据并采取行动](/images/05-agents/llm-vs-agent.png)

这个「思考 → 行动 → 观察 → 重复 → 作答」的循环叫 **ReAct**（Reasoning + Acting）。多步任务长这样：

```text
User: 先算 25 * 17，再判断是不是质数

Thought 1 → calculator("25 * 17") → 425
Thought 2 → isPrime(425)          → 不是（能被 5 整除）
Final Answer: 425，不是质数。
```

![ReAct 模式流程：Agent 迭代地推理、行动、观察，直到得出答案](/images/05-agents/react-pattern-flow.png)

和第 04 章「手动调一次工具」的差别：用哪个工具、循环几轮，由 Agent 自己决定。

## 从手动循环到 createAgent()

把第 04 章的三步循环包进 `for`，其实就是一个最简 Agent：

```ts
const modelWithTools = model.bindTools([calculatorTool]);
let messages = [new HumanMessage("What is 125 * 8?")];

for (let i = 1; i <= 3; i++) {
  const response = await modelWithTools.invoke(messages);
  if (!response.tool_calls?.length) {
    console.log(`Final Answer: ${response.content}`);
    break;
  }
  const call = response.tool_calls[0];
  const result = await calculatorTool.invoke(calculatorTool.schema.parse(call.args));
  messages.push(
    new AIMessage({ content: response.content, tool_calls: response.tool_calls }),
    new ToolMessage({ content: String(result), tool_call_id: call.id || "" }),
  );
}
```

能跑，但循环控制、消息簿记、迭代上限、错误处理每个 Agent 都要重写。`createAgent()` 把这些收走：

```ts
import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { evaluate } from "mathjs";
import * as z from "zod";

const calculatorTool = tool(
  async (input) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "A calculator that can perform basic arithmetic operations.",
    schema: z.object({
      expression: z.string().describe("The mathematical expression to evaluate"),
    }),
  },
);

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

const agent = createAgent({
  model,
  tools: [calculatorTool],
});

const response = await agent.invoke({
  messages: [new HumanMessage("What is 125 * 8?")],
});

const lastMessage = response.messages[response.messages.length - 1];
console.log(lastMessage.content); // "125 × 8 = 1000"
```

输入输出都是消息（第 03 章那条在这里落地）：

- **进**：`{ messages: [...] }`，不是裸字符串
- **出**：`response.messages` 是全过程（提问、工具调用、工具结果、最终回复）。**最后一条**才是答案；中间消息用来调试

### 三要素：model / tools / systemPrompt

`createAgent()` 最常用的三个参数：

| 参数 | 作用 | 和前面章节的关系 |
|------|------|------------------|
| `model` | 用哪个大脑 | `ChatOpenAI` 实例，或 `"openai:gpt-4.1-mini"` 这种字符串 |
| `tools` | 能调哪些工具 | 第 04 章的 `tool()` |
| `systemPrompt` | 常驻人设和规则 | 等价于始终生效的 `SystemMessage`，不必每次塞进 `messages` |

```ts
const agent = createAgent({
  model,
  tools: [calculatorTool],
  systemPrompt:
    "You are a careful math assistant. Always use the calculator for arithmetic. Be concise.",
});
```

常驻规则放 `systemPrompt`；要按用户/租户动态改，再用后面的中间件，不要把人设写进每一条 `HumanMessage`。

::: tip 本课程为什么仍传 ChatOpenAI 实例？
字符串写法适合标准提供商。GitHub Models / Azure 这类自定义 `baseURL`，继续用第 00 章配好的实例最稳。
:::

## 多工具 Agent

把工具数组交给 `createAgent()`，路由不用自己写：

```ts
const agent = createAgent({
  model,
  tools: [calculatorTool, weatherTool, searchTool],
  systemPrompt: "Use tools when they help; otherwise answer directly.",
});

const queries = [
  "What is 50 * 25?",              // → calculator
  "What's the weather in Tokyo?",  // → getWeather
  "Tell me about LangChain.js",    // → search
];

for (const query of queries) {
  const response = await agent.invoke({ messages: [new HumanMessage(query)] });
  console.log(response.messages.at(-1)?.content);
}
```

选择依据是工具的 **名称 + 描述** 和问题的语义匹配——第 04 章「把描述写具体」在这里更重要。

![Agent 根据查询与工具描述的语义匹配智能选择工具](/images/05-agents/tool-selection-logic.png)

## 短时记忆：checkpointer + thread_id

第 02 章的真相没变：模型没有记忆，记忆就是每次送出去的 messages。手写聊天机器人自己 `push` 就行；Agent 循环里还会插入工具调用和 `ToolMessage`，自己记账很快失控。

给 Agent 挂一个 **checkpointer**，再用 **`thread_id` 标识一场会话**：

```ts
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model,
  tools: [calculatorTool],
  systemPrompt: "You are a helpful assistant.",
  checkpointer: new MemorySaver(), // 进程内；生产换 Postgres 等
});

const thread = { configurable: { thread_id: "user-42" } };

await agent.invoke(
  { messages: [new HumanMessage("Hi! My name is Bob.")] },
  thread,
);

const followUp = await agent.invoke(
  { messages: [new HumanMessage("What's my name?")] },
  thread, // 同一个 id → 还记得 Bob
);
```

- 没挂 checkpointer：每次 `invoke` 都是新会话
- 同一 `thread_id`：自动带上已保存状态（含工具调用链）
- 换一个 `thread_id`：另一场对话，互不干扰
- `MemorySaver` 在内存里，进程重启即丢；`MemorySaver` 和 Agent 要放在模块顶层，不要每次 `new`

跨用户、跨会话的「长期档案」是另一套 Store API，见[长期记忆](https://docs.langchain.com/oss/javascript/langchain/long-term-memory)。入门把短时记忆做对即可。

## 流式观察循环

第 02 章的 `model.stream()` 流的是**一段回复的 token**。Agent 会先调工具再作答，界面通常要看到「正在查天气」。用 `stream()` + `streamMode: "updates"`，每完成一个步骤吐一次增量——训练场也是这套：

```ts
const stream = await agent.stream(
  { messages: [new HumanMessage("What is 25 * 17?")] },
  { streamMode: "updates" },
);

for await (const chunk of stream) {
  for (const msg of chunk.model?.messages ?? []) {
    for (const call of msg.tool_calls ?? []) {
      console.log("即将调用:", call.name, call.args);
    }
    if (msg.content) console.log("回复:", msg.content);
  }
  for (const msg of chunk.tools?.messages ?? []) {
    console.log("工具结果:", msg.content);
  }
}
```

一次「先调工具再作答」的常见顺序：

1. `chunk.model` —— 带 `tool_calls` 的 `AIMessage`
2. `chunk.tools` —— `ToolMessage`
3. `chunk.model` —— 最终回答

::: details 复杂 UI：streamEvents（v1.3+）
要把「打字机 token」和「工具调用」拆成两条独立的流，用 [`streamEvents`](https://docs.langchain.com/oss/javascript/langchain/event-streaming)（`version: "v3"`），分别消费 `stream.messages` 和 `stream.toolCalls`。入门不必先学它。
:::

## 中间件：不改工具，也能加能力

日志、重试、成本上限如果写进每个工具会很脏。**中间件**挂在循环外面，拦截模型调用或工具执行：

```ts
import { createAgent, createMiddleware, summarizationMiddleware } from "langchain";

const toolErrorHandler = createMiddleware({
  name: "ToolErrorHandler",
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request);
    } catch (error) {
      return {
        content: `工具出错：${(error as Error).message}。换个办法试试。`,
      };
    }
  },
});

const agent = createAgent({
  model,
  tools: [calculatorTool, searchTool],
  middleware: [
    toolErrorHandler,
    summarizationMiddleware({
      model,
      trigger: { tokens: 4000, messages: 20 }, // 两条件都满足才总结
      keep: { messages: 10 },                  // 保留最近 10 条，须覆盖完整工具调用对
    }),
  ],
});
```

两个常用钩子：`wrapModelCall`（换模型、打日志）、`wrapToolCall`（重试、权限、错误兜底）。

| 内置中间件 | 用来干什么 |
|-----------|-----------|
| `summarizationMiddleware` | 长对话压缩旧消息，省 token |
| `humanInTheLoopMiddleware` | 敏感工具执行前等人批准 |
| `toolRetryMiddleware` | 工具偶发失败时退避重试 |
| `modelFallbackMiddleware` | 主模型挂了切备用 |
| `piiMiddleware` | 处理邮箱、卡号等 PII |
| `modelCallLimitMiddleware` | 限制单次运行的模型调用次数 |

按需选用，不必一次全上。完整参数见[内置中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)。排错 Agent 时，[LangSmith](https://docs.langchain.com/langsmith/observability) 能把每步思考和工具参数摊开，比只看最后一条 `content` 清楚得多（配置见[第 00 章](/guide/00-setup)）。

## ⚠️ 常见坑

| 坑 | 解法 |
|----|------|
| `tool_calls` 是 `undefined` | 手写循环时必须用 `bindTools()` 之后的模型 |
| 转圈 / 顶到迭代上限 | 工具返回说明性结果（`"结果是 42"` 而不是 `"42"`）；开发期把上限设小 |
| `Tool 'xxx' not found` | 模型生成的名字必须和 `tool()` 的 `name` 完全一致 |
| `response.content` 是空的 | 答案在 `response.messages.at(-1).content` |
| 下一轮 Agent「失忆」 | 同时传入 `checkpointer` **和**同一个 `thread_id`；二者缺一不可 |
| `model.stream()` 看不到工具步骤 | 改用 `agent.stream(..., { streamMode: "updates" })` |
| summarization 之后请求非法 | `keep` 不能把 `AIMessage(tool_calls)` 和对应 `ToolMessage` 拆开 |

## ✅ 核心要点

- Agent = 模型 + 工具 + 自主循环；ReAct 就是这个循环的名字
- `createAgent({ model, tools, systemPrompt })` 接管样板代码；答案取 `messages` 末尾
- 多工具靠描述路由；短时记忆靠 `checkpointer` + `thread_id`
- 看步骤用 `agent.stream`，看 token 才用第 02 章的 `model.stream`
- 横切能力用中间件，不要改工具实现

## 🏋️ 动手练习

- [用 createAgent 构建智能体](/playground/?id=ch05-create-agent) —— 定义工具、创建 Agent、观察它自主选工具
- [用 checkpointer 记住多轮对话](/playground/?id=ch05-agent-memory) —— 同一 `thread_id` 记得住，换一条互不干扰
- [流式观察 Agent 的工具调用](/playground/?id=ch05-agent-stream) —— 用 `stream({ streamMode: "updates" })` 收集 `tool_calls`

## 📚 延伸阅读

- [LangChain Agents](https://docs.langchain.com/oss/javascript/langchain/agents)
- [短时记忆](https://docs.langchain.com/oss/javascript/langchain/short-term-memory)
- [Streaming](https://docs.langchain.com/oss/javascript/langchain/streaming) · [streamEvents](https://docs.langchain.com/oss/javascript/langchain/event-streaming)
- [内置中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)
- [LangSmith](https://docs.langchain.com/langsmith/observability)
- [ReAct 论文](https://arxiv.org/abs/2210.03629)
