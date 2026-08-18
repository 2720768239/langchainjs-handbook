# 05. Agent 入门

> 🎯 理解 Agent 的 ReAct 工作模式，学会用 `createAgent()` 一行代码构建能自主推理、选工具、迭代解决问题的智能体（Agent）。

::: tip 本章速览
- **LLM vs Agent**：LLM 只能生成文本，Agent 能推理 + 用工具行动 + 迭代直到解决问题
- **ReAct 模式**：思考（Thought）→ 行动（Action）→ 观察（Observation）循环，直到给出最终答案
- **createAgent()**：官方推荐的生产级 API，自动接管上一章手写的整个工具循环
- **调用方式**：`agent.invoke({ messages })` 传入消息数组，从 `response.messages` 末尾取答案
- **多工具 Agent**：把工具数组交给 Agent，它按语义自动路由
- **中间件（Middleware）**：不改工具和核心逻辑，即插即用地加日志、错误处理、对话总结等能力
:::

## 📖 经理与专家类比

想象你是带着专家团队的项目经理：数据分析师能查库、研究员能搜网、会计能算数。有人问"本季度收入同比增长多少？"，你不会亲自干活，而是：

1. **推理**："我需要数据库里的数据，还需要计算"
2. **行动**：请数据分析师取收入数据
3. **观察**：看拿到的数据
4. **推理**："现在该算百分比了" → **行动**：请会计计算 → **观察**：拿到结果
5. **回复**：给出最终答案

![项目经理与专家团队 vs AI Agent 与工具：两者遵循相同的委派迭代模式](/images/05-agents/manager-specialists-analogy.png)

AI Agent 的工作方式完全一样：**思考**需要什么 → **选择**工具 → **执行** → **评估**结果 → **重复**直到有答案。

## LLM vs Agent

同一个问题，两种截然不同的表现：

```text
标准 LLM（没有工具，没有自主性）：
User: "What's the current weather in Paris?"
LLM:  "I cannot access real-time weather data..."

带工具的 Agent：
User:  "What's the current weather in Paris?"
Agent: [思考] 我需要用天气工具
Agent: [行动] getWeather({ city: "Paris" })
Agent: [观察] "18°C, partly cloudy"
Agent: [回复] "It's currently 18°C and partly cloudy in Paris"
```

![标准 LLM 局限于训练数据，带工具的 Agent 可以访问实时数据并采取行动](/images/05-agents/llm-vs-agent.png)

## ReAct 模式：推理 + 行动

ReAct = **Rea**soning（推理）+ **Act**ing（行动），是 Agent 的核心运行模式：

```text
1. Thought（思考）：下一步该做什么？
2. Action（行动）：调用某个具体工具
3. Observation（观察）：工具返回了什么？
4. 按需重复 1-3
5. Final Answer（最终答案）：回复用户
```

多步任务的完整走向长这样：

```text
User: "Calculate 25 * 17, then tell me if it's a prime number"

Thought 1: 我需要先算 25 * 17
Action 1:  calculator({ expression: "25 * 17" })
Observation 1: 425

Thought 2: 我需要检查 425 是不是质数
Action 2:  isPrime({ number: 425 })
Observation 2: false（能被 5 整除）

Final Answer: "25 * 17 = 425，它不是质数，因为能被 5 整除。"
```

![ReAct 模式流程：Agent 迭代地推理、行动、观察，直到得出答案](/images/05-agents/react-pattern-flow.png)

每一步用哪个工具、循环几轮，都由 Agent 自主决定——这正是它和"手动编排工具调用"的本质区别。

## 从手动循环到 createAgent()

上一章你手写过工具循环。把它包上 while 循环，其实就是一个最简 Agent（课程 `samples/` 里的手动实现）：

```ts
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, ToolMessage, tool } from "langchain";

const modelWithTools = model.bindTools([calculatorTool]);
let messages: any[] = [new HumanMessage("What is 125 * 8?")];
const maxIterations = 3; // 防止无限循环

for (let i = 1; i <= maxIterations; i++) {
  const response = await modelWithTools.invoke(messages);

  // 没有工具调用 = Agent 认为可以作答了，退出循环
  if (!response.tool_calls || response.tool_calls.length === 0) {
    console.log(`Final Answer: ${response.content}`);
    break;
  }

  // 执行工具，把 AIMessage + ToolMessage 追加进历史，进入下一轮
  const toolCall = response.tool_calls[0];
  const toolResult = await calculatorTool.invoke(calculatorTool.schema.parse(toolCall.args));
  messages.push(
    new AIMessage({ content: response.content, tool_calls: response.tool_calls }),
    new ToolMessage({ content: String(toolResult), tool_call_id: toolCall.id || "" })
  );
}
```

这段代码能跑，但每个 Agent 都要重复写：循环控制、消息簿记、迭代上限、错误处理…… LangChain.js 的 `createAgent()` 把这些全部接管：

- ✅ 自动管理 ReAct 循环（思考 → 行动 → 观察 → 重复）
- ✅ 自动维护消息历史
- ✅ 内置迭代限制，防止无限循环
- ✅ 生产级错误处理

### createAgent() 基础用法

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
  }
);

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

// 一行创建 Agent —— 上面那段手动循环全部消失
const agent = createAgent({
  model,
  tools: [calculatorTool],
});

// 输入：消息数组
const response = await agent.invoke({
  messages: [new HumanMessage("What is 125 * 8?")],
});

// 输出：完整的消息历史，最后一条是最终答案
const lastMessage = response.messages[response.messages.length - 1];
console.log(lastMessage.content); // "125 × 8 = 1000"
```

注意输入输出的形状（第 03 章"Agent 用消息"在这里落地了）：

- **输入**是 `{ messages: [...] }`——消息数组，而不是裸字符串
- **输出**的 `response.messages` 包含整个过程的所有消息（用户提问、工具调用、工具结果、最终回复），**取最后一条**即最终答案；中间消息可用于调试和展示推理过程

## 多工具 Agent

真实助手需要多种能力。把工具数组交给 `createAgent()`，路由逻辑一行都不用写：

```ts
const agent = createAgent({
  model,
  tools: [calculatorTool, weatherTool, searchTool], // 多个工具
});

const queries = [
  "What is 50 * 25?",              // → Agent 自己选 calculator
  "What's the weather in Tokyo?",  // → Agent 自己选 getWeather
  "Tell me about LangChain.js",    // → Agent 自己选 search
];

for (const query of queries) {
  const response = await agent.invoke({ messages: [new HumanMessage(query)] });
  const lastMessage = response.messages[response.messages.length - 1];
  console.log(`User: ${query}\nAgent: ${lastMessage.content}\n`);
}
```

Agent 的选择依据是工具的**名称和描述**与查询的语义匹配度——所以第 04 章"把描述写具体"的最佳实践，在 Agent 场景下更加重要。

![Agent 根据查询与工具描述的语义匹配智能选择工具](/images/05-agents/tool-selection-logic.png)

## 中间件：Agent 的插件系统

生产环境的 Agent 需要日志、错误兜底、成本控制……这些横切需求如果写进工具或业务逻辑里会很脏。**中间件（middleware）** 让你在不改动工具和 Agent 核心逻辑的前提下拦截并修改行为——把它想象成 Agent 的"插件"。

### 自定义中间件：createMiddleware()

两个最常用的拦截点：

- **`wrapModelCall`**：拦截对模型的调用——动态换模型、记日志、注入上下文
- **`wrapToolCall`**：拦截工具执行——错误兜底、重试、权限检查

```ts
import { createAgent, createMiddleware } from "langchain";

// 中间件 1：动态模型选择 —— 长对话切换到能力更强的模型
const dynamicModelSelection = createMiddleware({
  name: "DynamicModelSelection",
  wrapModelCall: (request, handler) => {
    if (request.messages.length > 10) {
      // 替换请求里的模型后继续执行
      return handler({ ...request, model: capableModel });
    }
    return handler(request); // 不满足条件则原样放行
  },
});

// 中间件 2：工具错误兜底 —— 工具挂了返回友好提示而不是让 Agent 崩溃
const toolErrorHandler = createMiddleware({
  name: "ToolErrorHandler",
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request);
    } catch (error) {
      return {
        content: `I encountered an error: ${(error as Error).message}. Let me try a different approach.`,
      };
    }
  },
});

// 挂载中间件
const agent = createAgent({
  model: basicModel,
  tools: [calculatorTool, searchTool],
  middleware: [dynamicModelSelection, toolErrorHandler],
});
```

典型生产用途：简单任务用便宜模型（成本优化）、失败自动重试（弹性）、全量请求日志（可观测性）、按用户注入权限上下文（多租户）。

### 内置中间件：summarizationMiddleware

常见需求官方已经造好了轮子。最实用的是 `summarizationMiddleware`：长对话会撑爆上下文窗口、推高 token 成本，它能自动把旧消息压缩成摘要，同时保留最近的消息不动。

```ts
import { createAgent, summarizationMiddleware } from "langchain";

const agent = createAgent({
  model,
  tools: [researchTool],
  middleware: [
    summarizationMiddleware({
      model,                                 // 用哪个模型来做总结
      trigger: { tokens: 200, messages: 4 }, // 何时总结（AND：两个条件都满足）
      keep: { messages: 2 },                 // 总结后保留最近 2 条消息
    }),
  ],
});
```

配置规则：

| 参数 | 写法 | 语义 |
|------|------|------|
| `trigger` | `{ tokens: 1000, messages: 8 }` | AND：token 数**且**消息数都超标才总结 |
| `trigger` | `[{ tokens: 2000 }, { messages: 10 }]` | OR：任一超标就总结 |
| `keep` | `{ messages: N }` / `{ tokens: N }` / `{ fraction: 0.3 }` | 三选一：保留最近 N 条 / N token / 30% 上下文（默认 `{ messages: 20 }`） |

触发后，旧消息被替换成一条"Here is a summary of the conversation to date: ..."的摘要消息，后面跟着保留的最近消息——token 大幅下降，上下文连贯性仍在。适用场景：长时聊天会话、多轮研究 Agent、客服机器人等一切"对话历史会持续增长"的系统。

::: tip 其他内置中间件
除了总结，LangChain.js 还内置了如 human-in-the-loop（人工介入：敏感工具执行前暂停等待人工批准）等中间件，且内置与自定义中间件可以在 `middleware: [...]` 数组里自由组合。完整列表见[内置中间件文档](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)。
:::

## ⚠️ 常见坑

- **`Cannot read property 'tool_calls' of undefined`**：手写循环时忘了 `bindTools()`。必须用绑定后的模型实例调用。
- **Agent 无限循环 / 顶到 maxIterations**：停止条件应是"没有 tool_calls 就 break"；开发期把迭代上限设小（如 3）快速暴露问题；工具返回值太含糊也会让 Agent 转圈——返回描述性结果（`"The calculation result is 42..."` 而不是 `"42"`）。
- **`Tool 'xxx' not found`**：模型生成的工具名和你定义的 `name` 对不上。工具名必须精确一致，别在运行中改名。
- **Agent 选错工具**：描述太含糊（`"Does calculations"`）。写清用途和时机：`"Perform mathematical calculations like addition, multiplication, percentages. Use this when you need to compute numbers."`
- **取答案的姿势不对**：`agent.invoke()` 返回的是**全部消息历史**，答案在 `response.messages[response.messages.length - 1].content`，不要直接读 `response.content`。
- **summarization 的 `keep` 切断工具调用链**：保留的消息里如果 `AIMessage(tool_calls)` 和对应 `ToolMessage` 被拆散，会导致请求非法——保留数量要覆盖完整的调用对。
- **该用 createAgent 时还在手写循环**：手动循环适合学习原理和特殊定制；生产环境直接用 `createAgent()`，少写代码还白拿错误处理和迭代保护。

## ✅ 核心要点

- Agent = LLM + 工具 + 自主循环：自己决定用什么工具、何时用、循环几轮
- ReAct 是核心模式：推理 → 行动 → 观察，重复直到解决
- `createAgent({ model, tools })` 一行接管手动循环的全部样板代码，是生产推荐方式
- 输入输出都是消息：`agent.invoke({ messages })` 进，`response.messages` 末尾取答案
- 工具描述质量直接决定 Agent 的工具选择质量
- 中间件是 Agent 的插件层：`wrapModelCall` / `wrapToolCall` 自定义拦截，`summarizationMiddleware` 等内置件开箱即用

## 🏋️ 动手练习

- [用 createAgent 构建智能体](/playground/?id=ch05-create-agent) —— 定义工具、创建 Agent、观察它自主选择工具解决问题

## 📚 延伸阅读

- [LangChain Agents 文档](https://docs.langchain.com/oss/javascript/langchain/agents)
- [createAgent() API 参考](https://docs.langchain.com/oss/javascript/langchain/agents#createagent)
- [内置中间件文档](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)
- [ReAct 论文（arXiv）](https://arxiv.org/abs/2210.03629)
