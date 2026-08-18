# 04. 函数调用与工具

> 🎯 理解函数调用（Function Calling）的核心心智模型——**模型只生成调用意图，执行永远在你的代码里**，并亲手走完"生成 → 执行 → 回传"的完整工具循环。

::: tip 本章速览
- **心智模型**：LLM 从不执行函数，它只输出"该调哪个函数、传什么参数"的结构化描述
- **定义工具**：`tool()` 函数 + Zod Schema = 类型安全的工具
- **绑定工具**：`bindTools()` 让模型知道有哪些工具可用
- **工具调用结构**：`response.tool_calls` 里的 `name` / `args` / `id`
- **完整循环**：执行工具后要把 `ToolMessage` 回传给模型，才能得到自然语言答案
- **多工具选择**：模型靠工具的名称和描述做语义匹配，描述写得好选得就准
:::

## 📖 餐厅点菜类比

想象你是餐厅经理。顾客点了"今日特价、不加洋葱、一份沙拉和气泡水"，你不会自己钻进厨房——你**理解需求**，然后**委派专人**：

- 👨‍🍳 主厨：`prepareMeal("今日特价", { noOnion: true })`
- 🥗 沙拉台：`makeSalad("配菜沙拉")`
- 🍷 吧台：`serveBeverage("气泡水")`

最后你**汇总各方结果**回复顾客。

![餐厅员工类比：LLM 像经理一样生成函数调用，你的代码像专业员工一样执行](/images/04-function-calling-tools/restaurant-staff-analogy.png)

AI 的函数调用一模一样：LLM **理解**请求、**生成**带参数的结构化函数调用、**返回**调用详情（但不执行），最后**整合**结果给出回复。执行环节始终在你的代码里。

## 核心心智模型：三步执行

这是全章最重要的一句话：**LLM 从不直接执行函数。** 完整流程分三步：

1. **LLM 规划**：分析请求，决定调用哪个函数，生成带参数的 JSON——仅此而已
2. **你的代码执行**：接收调用描述，真正跑函数（API 调用、计算、查库），拿到真实结果
3. **LLM 沟通**：收到结果后，整合成自然语言回复用户

![三步执行模型：LLM 规划生成调用，你的代码执行，LLM 用自然语言回复](/images/04-function-calling-tools/execution-flow.png)

```ts
// 用户问："东京和巴黎的天气怎么样？"

// 1. LLM 生成（不执行）：
// { tool_calls: [
//   { name: "getWeather", args: { city: "Tokyo" } },
//   { name: "getWeather", args: { city: "Paris" } }
// ]}

// 2. 你的代码执行：
const tokyo = await getWeather("Tokyo"); // → "24°C, sunny"
const paris = await getWeather("Paris"); // → "18°C, rainy"

// 3. LLM 收到结果后回复：
// "Tokyo is 24°C and sunny. Paris is 18°C and rainy."
```

::: tip 为什么这种分离很重要
安全与控制。由你的代码决定存在哪些函数、如何执行、要不要拒绝危险操作——LLM 只能"点菜"，不能"进厨房"。
:::

## 用 tool() + Zod 定义工具

LangChain.js 用 `tool()` 函数创建工具：第一个参数是**实现函数**（工具实际做的事），第二个参数是**元信息**（名称、描述、参数 Schema）。

```ts
import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";

const calculatorTool = tool(
  // 实现函数：工具被调用时执行的逻辑
  async (input) => {
    try {
      // mathjs 的 evaluate() 只做数学运算，比 eval() 安全得多
      const result = evaluate(input.expression);
      return `The result is: ${result}`;
    } catch (error) {
      return `Error evaluating expression: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "calculator", // LLM 引用工具时用的名字
    description: "Useful for performing mathematical calculations. Use this when you need to compute numbers.",
    schema: z.object({
      // describe() 里的示例能帮 LLM 生成正确格式的参数
      expression: z.string().describe("The mathematical expression to evaluate, e.g., '25 * 4'"),
    }),
  }
);
```

四个组件各司其职：

| 组件 | 作用 | 面向谁 |
|------|------|-------|
| 实现函数 | 工具实际干的活 | 你的运行时 |
| `name` | 工具的唯一标识 | LLM 生成调用时引用 |
| `description` | 什么时候该用这个工具 | LLM 做选择的主要依据 |
| `schema` | 参数的类型与说明（Zod） | LLM 生成参数 + 运行时验证 |

注意：此刻工具只是**被创建**了，还没和任何模型产生联系。

## bindTools()：把工具交给模型

工具躺在代码里，模型并不知道它存在。`bindTools()` 负责牵线——把工具的名称、描述、Schema 告诉模型，让它在需要时生成调用。

![bindTools 把工具连接到模型，使它们可供 LLM 使用](/images/04-function-calling-tools/tool-binding.png)

```ts
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

// 让工具对模型可见
const modelWithTools = model.bindTools([calculatorTool]);

const response = await modelWithTools.invoke("What is 25 * 17?");

console.log(response.content);    // 通常为空 —— 模型选择了调工具而不是直接回答
console.log(response.tool_calls); // 结构化的调用意图在这里
```

### response.tool_calls 的结构

模型的回复里，`tool_calls` 数组的每一项长这样：

```ts
{
  name: "calculator",              // 要调用的工具名
  args: { expression: "25 * 17" }, // 模型生成的参数（符合你的 Zod Schema）
  type: "tool_call",
  id: "call_6lyhZzefMJnbOXvplEFsuSsY" // 调用 ID，回传结果时用来配对
}
```

再强调一次：模型此刻**什么都没算**。它只是说"请帮我调 calculator，参数是 25 * 17"。

::: details 点击展开：模型不支持工具调用怎么办？
并非所有模型都支持工具调用。可以用 `.profile` 获取器（测试版功能）在绑定前检查能力：

```ts
if (model.profile.toolCalling) {
  const modelWithTools = model.bindTools([calculatorTool]);
} else {
  console.log("This model doesn't support tool calling");
}
```

profile 还包含 `structuredOutput`、`imageInputs` 等能力标志，需要兼容多种模型时很有用。
:::

## 完整的工具执行循环

拿到 `tool_calls` 只是半场。要让用户得到自然语言答案，必须**执行工具并把结果回传给模型**——这就是完整的三步循环：

![完整循环：用户请求 → LLM 生成调用 → 代码执行 → 结果回传 → LLM 回复](/images/04-function-calling-tools/tool-call-loop.png)

```ts
import { tool, HumanMessage, AIMessage, ToolMessage } from "langchain";
import * as z from "zod";

const weatherTool = tool(
  async (input) => {
    // 模拟 API 调用
    const temps: Record<string, number> = { Seattle: 62, Paris: 18, Tokyo: 24 };
    const temp = temps[input.city] || 72;
    return `Current temperature in ${input.city}: ${temp}°F`;
  },
  {
    name: "getWeather",
    description: "Get current weather for a city",
    schema: z.object({ city: z.string().describe("City name") }),
  }
);

const modelWithTools = model.bindTools([weatherTool]);
const query = "What's the weather in Seattle?";

// 步骤 1：LLM 生成工具调用（规划）
const response1 = await modelWithTools.invoke([new HumanMessage(query)]);
const toolCall = response1.tool_calls![0];
// → { name: "getWeather", args: { city: "Seattle" }, id: "call_..." }

// 步骤 2：你的代码执行工具（执行）
const toolResult = await weatherTool.invoke(weatherTool.schema.parse(toolCall.args));
// → "Current temperature in Seattle: 62°F"

// 步骤 3：把结果连同历史一起发回给 LLM（沟通）
const messages = [
  new HumanMessage(query),
  new AIMessage({ content: response1.content, tool_calls: response1.tool_calls }),
  new ToolMessage({ content: String(toolResult), tool_call_id: toolCall.id! }),
];
const finalResponse = await model.invoke(messages);

console.log(finalResponse.content);
// → "The current temperature in Seattle is 62°F."
```

第 3 步的消息数组值得细看——它复原了一段完整对话：

1. `HumanMessage`：用户最初的问题
2. `AIMessage`：模型上一轮"我要调 getWeather"的决定（必须带上 `tool_calls`）
3. `ToolMessage`：工具的执行结果，`tool_call_id` 与调用 ID 配对

::: warning 为什么必须回传 ToolMessage？
模型是无状态的。它不知道你执行了什么——如果不把工具结果作为 `ToolMessage` 发回去，模型就永远等不到"观察结果"，也就无法生成最终答案。`tool_call_id` 缺失或配错会直接报错。
:::

## 多工具：让模型自己挑

给模型绑定多个工具后，它会根据**工具名称 + 描述 + 参数 Schema + 用户问题**做语义匹配，自动挑选合适的工具：

```ts
const calculatorTool = tool(
  async (input) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "Perform mathematical calculations",
    schema: z.object({ expression: z.string() }),
  }
);

const searchTool = tool(
  async (input) => {
    const results: Record<string, string> = {
      "capital of france": "Paris",
      "population of tokyo": "14 million",
    };
    return results[input.query.toLowerCase()] || "No results found";
  },
  {
    name: "search",
    description: "Search for factual information",
    schema: z.object({ query: z.string() }),
  }
);

const weatherTool = tool(
  async (input) => `Weather in ${input.city}: 72°F, sunny`,
  {
    name: "getWeather",
    description: "Get current weather for a city",
    schema: z.object({ city: z.string() }),
  }
);

// 一次绑定三个工具
const modelWithTools = model.bindTools([calculatorTool, searchTool, weatherTool]);

const queries = [
  "What is 125 * 8?",              // → 模型选 calculator
  "What's the capital of France?", // → 模型选 search
  "What's the weather in Tokyo?",  // → 模型选 getWeather
];

for (const query of queries) {
  const response = await modelWithTools.invoke(query);
  console.log(query, "→", response.tool_calls?.[0]?.name);
}
```

::: warning 工具调用是概率性的
不同模型行为不同：有些模型会对简单数学题直接口算而不调工具。想提高稳定性，可以在提示词里明说"Use the calculator tool to compute..."，或使用 `tool_choice` 参数强制调用。
:::

## 工具设计最佳实践

模型选工具、填参数全靠你写的元信息，这几条直接决定成功率：

```ts
// ❌ 差：描述含糊，参数名无意义
description: "Does weather stuff"
schema: z.object({ x: z.string(), y: z.number() })

// ✅ 好：描述具体说明"做什么、何时用"，参数带说明和示例
description: "Get current weather for a specific city. Returns temperature, conditions, and humidity."
schema: z.object({
  city: z.string().describe("The city name, e.g., 'Paris' or 'Tokyo'"),
  units: z.enum(["celsius", "fahrenheit"]).describe("Temperature unit to return"),
})
```

另外两条工程习惯：

- **工具内部做错误处理**：捕获异常后返回一段描述性错误文本（而不是抛出），让模型有机会换个思路重试
- **用 Zod 约束收紧输入**：`z.string().email()`、`z.string().min(1)` 等约束在执行前就拦下坏参数

::: details 点击展开：提供商内置工具
除了自定义工具，OpenAI、Anthropic 等提供商还有**内置工具**（网页搜索、代码解释器、文件搜索等），由提供商托管执行，无需你写实现：

```ts
import { ChatOpenAI, tools } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-5-mini" });
const response = await model.invoke(
  "What are the latest TypeScript 5.9 features?",
  { tools: [tools.webSearch()] } // OpenAI 托管的网页搜索
);
```

选择原则：业务专属逻辑（查自家数据库、调内部 API）用自定义工具；通用能力（联网搜索）用内置工具，省去自建基础设施。
:::

## ⚠️ 常见坑

| 坑 | 症状 | 解法 |
|----|------|------|
| 忘记 `bindTools()` | `response.tool_calls` 为 `undefined` | 用 `model.bindTools([...])` 返回的新模型实例调用，别用原 `model` |
| 只拿 tool_calls 不回传结果 | 永远得不到自然语言答案 | 走完第 3 步：`AIMessage`（带 tool_calls）+ `ToolMessage` 一起发回模型 |
| `tool_call_id` 没配对 | 回传时报错或模型混乱 | `ToolMessage` 的 `tool_call_id` 必须等于对应 `toolCall.id` |
| 工具描述含糊 | 模型选错工具或不调工具 | 描述写清"做什么 + 何时用"，参数 `describe()` 给出示例 |
| 直接 `eval()` 用户输入 | 任意代码执行风险 | 用 mathjs 这类领域受限的库，工具内做输入验证 |
| 假设模型一定调工具 | 简单问题模型直接口答，代码取 `tool_calls[0]` 崩溃 | 先判断 `response.tool_calls?.length`，两条路径都要处理 |

## ✅ 核心要点

- 函数调用 = LLM 规划 + 你的代码执行 + LLM 沟通，执行权永远在你手里
- `tool()` 四要素：实现函数、`name`、`description`、Zod `schema`
- `bindTools()` 让模型"看见"工具；`response.tool_calls` 是调用意图（`name` / `args` / `id`）
- 完整循环必须把 `ToolMessage`（带 `tool_call_id`）回传模型才能收尾
- 多工具场景下，模型靠描述做语义匹配——描述质量 = 选择质量
- 本章手写的循环，下一章会被 `createAgent()` 一行接管——但心智模型不变

## 🏋️ 动手练习

- [定义你的第一个工具](/playground/?id=ch04-define-tool) —— 用 tool() + Zod 创建并检视一个工具
- [手写工具调用循环](/playground/?id=ch04-tool-loop) —— 完整实现"生成 → 执行 → 回传"三步

## 📚 延伸阅读

- [Tool Calling 文档](https://js.langchain.com/docs/how_to/tool_calling/)
- [自定义工具指南](https://js.langchain.com/docs/how_to/custom_tools/)
- [提供商内置工具（OpenAI）](https://docs.langchain.com/oss/javascript/integrations/tools/openai)
- [Zod 官方文档](https://zod.dev/)
