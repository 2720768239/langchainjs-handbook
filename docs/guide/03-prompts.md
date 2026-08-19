# 03. 提示词、消息与结构化输出

> 🎯 掌握与 LLM 沟通的三件套：消息（Messages）、提示词模板（Prompt Templates）、结构化输出（Structured Output），并知道各自该在什么场景用。

::: tip 本章速览
- **决策框架**：Agent 与动态工作流用消息数组，RAG 与可复用提示词用模板
- **消息构造**：`SystemMessage` / `HumanMessage` / `AIMessage` 三种角色，可编程动态拼装
- **模板**：`ChatPromptTemplate` 用 `{变量}` 占位，一次编写、到处复用
- **Few-shot 提示**：给几个输入输出示例，比长篇指令更管用
- **结构化输出**：`withStructuredOutput()` + Zod Schema，直接拿到类型安全的 JSON 而不是自由文本
:::

## 决策框架：消息 vs 模板

现代 LangChain.js 应用有两条并行的提示词路线，先搞清楚"什么时候用哪个"再往下学：

| 方式 | 适用场景 | 典型下游 |
|------|---------|---------|
| **消息（Messages）** | Agent、动态工作流、多步推理、工具集成 | 第 05 章 Agent |
| **模板（Templates）** | 可复用提示词、变量替换、格式一致性、Few-shot | 第 07 章 RAG 系统 |

![消息与模板的选择：消息用于 Agent 和动态工作流，模板用于 RAG 和可复用提示词](/images/03-prompts-messages-outputs/messages-vs-templates.webp)

两种方式并排对比一下，就能看到差别在哪：

```ts
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "langchain";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

// 方式 1：消息数组 —— 直接构造，直接发送
const messages = [
  new SystemMessage("You are a helpful translator."),
  new HumanMessage("Translate 'Hello, world!' to French"),
];
const r1 = await model.invoke(messages);

// 方式 2：模板 —— 先定义占位符，调用时再填值
const template = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful translator."],
  ["human", "Translate '{text}' to {language}"],
]);
const chain = template.pipe(model); // 模板 → 模型 串成一条链
const r2 = await chain.invoke({ text: "Hello, world!", language: "French" });
```

两者输出相同的翻译结果，区别在于：消息是**一次性的、手工拼的**；模板是**可复用的、带变量的**。

## 消息：对话的基本单元

把消息数组理解成一场真实对话的逐字记录：System 设定行为，Human 提问，AI 回答——每一行都是一条带角色的消息。Agent 之所以能做多步推理和工具调用，靠的正是这种结构。

| 消息类型 | 用途 | 何时使用 |
|---------|------|---------|
| `SystemMessage` | 设定 AI 的行为、性格、角色 | 通常放在对话开头，出现一次 |
| `HumanMessage` | 用户的输入或问题 | 每次用户说话 |
| `AIMessage` | AI 之前的回复 | 构建历史记录或 Few-shot 示例 |

### 动态构建消息数组

Agent 需要根据运行时数据（对话历史、工具结果）拼装消息，所以"用函数编程式地构建消息数组"是必备技能：

```ts
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "langchain";

function createConversation(
  role: string,
  examples: Array<{ question: string; answer: string }>,
  newQuestion: string,
): BaseMessage[] {
  // 系统消息开头
  const messages: BaseMessage[] = [new SystemMessage(`You are a ${role}.`)];

  // 每个示例变成一对 Human → AI 消息（基于消息的 Few-shot）
  examples.forEach(({ question, answer }) => {
    messages.push(new HumanMessage(question));
    messages.push(new AIMessage(answer));
  });

  messages.push(new HumanMessage(newQuestion));
  return messages;
}

const emojiMessages = createConversation(
  "emoji translator",
  [
    { question: "happy", answer: "😊" },
    { question: "sad", answer: "😢" },
    { question: "excited", answer: "🎉" },
  ],
  "surprised",
);

const response = await model.invoke(emojiMessages); // → 😮
```

这里共构建了 8 条消息：1 条系统消息 + 3 组示例（6 条）+ 1 个新问题。AI 从示例对中学到"情绪 → emoji"的模式，再套用到新输入上。

::: details 点击展开：消息的三种等价写法
课程用消息类是因为最直观，但 LangChain 还支持两种更简洁的语法，效果完全一样：

```ts
// 字典格式
const messages = [
  { role: "system", content: "You are helpful" },
  { role: "user", content: "Hello!" },
  { role: "assistant", content: "Hi there!" },
];

// 字符串快捷方式（单条简单消息）
await model.invoke("Hello!"); // 等价于 invoke(new HumanMessage("Hello!"))
```
:::

## 模板：可复用的提示词

### 📖 邮件合并类比

提示词模板就像邮件合并（mail merge）：不必给每位客户手写一封信，而是写一份带 `{name}`、`{orderId}` 占位符的模板，发送时逐个填值。一次创建、随处复用，改一处即可影响所有调用。

![邮件合并类比：模板使用占位符，运行时替换为实际值](/images/03-prompts-messages-outputs/mail-merge-analogy.webp)

### ChatPromptTemplate 基础

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 一个模板，三个变量
const template = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant that translates {input_language} to {output_language}."],
  ["human", "{text}"],
]);

const chain = template.pipe(model);

// 同一模板，换不同的值反复调用
const french = await chain.invoke({
  input_language: "English",
  output_language: "French",
  text: "Hello, how are you?",
}); // → Bonjour, comment allez-vous ?

const spanish = await chain.invoke({
  input_language: "English",
  output_language: "Spanish",
  text: "Hello, how are you?",
}); // → Hola, ¿cómo estás?
```

要点拆解：

1. `{variable_name}` 在模板中创建占位符
2. `ChatPromptTemplate.fromMessages()` 定义 system / human 消息结构
3. `template.pipe(model)` 把模板和模型串成链
4. `invoke()` 填入变量、发送完整提示词

好处很实际：想给所有翻译加"请用正式语气"，只需改系统消息一处。

### 两种模板格式

| | `ChatPromptTemplate` | `PromptTemplate` |
|--|---------------------|------------------|
| 结构 | 消息数组（system / human） | 纯字符串 |
| 系统消息 | 支持 | 无角色概念 |
| 用法 | `.pipe(model).invoke({...})` | 先 `.format({...})` 得到字符串，再传给模型 |
| 适用 | Chat 模型、多轮对话、RAG | 简单的单次提示词 |

```ts
import { PromptTemplate } from "@langchain/core/prompts";

const stringTemplate = PromptTemplate.fromTemplate(
  "Write a {adjective} {item} about {topic}."
);

// PromptTemplate 需要手动 format 出字符串
const prompt = await stringTemplate.format({
  adjective: "funny",
  item: "poem",
  topic: "JavaScript",
}); // → "Write a funny poem about JavaScript."

const result = await model.invoke(prompt);
```

## Few-shot 提示：用示例教学

Few-shot 提示（few-shot prompting）就是培训新员工：与其写一大段规章制度，不如直接给几个"优秀作业范例"。对于输出格式类需求，几个示例往往比复杂指令更可靠。

![Few-shot 学习：提供示例教会 AI 模式，AI 再应用到新输入](/images/03-prompts-messages-outputs/few-shot-prompting.webp)

```ts
import { ChatPromptTemplate, FewShotChatMessagePromptTemplate } from "@langchain/core/prompts";

// 1. 教学示例
const examples = [
  { input: "happy", output: "😊" },
  { input: "sad", output: "😢" },
  { input: "excited", output: "🎉" },
];

// 2. 每个示例如何格式化（一问一答）
const exampleTemplate = ChatPromptTemplate.fromMessages([
  ["human", "{input}"],
  ["ai", "{output}"],
]);

// 3. Few-shot 模板：把示例批量注入对话
const fewShotTemplate = new FewShotChatMessagePromptTemplate({
  examplePrompt: exampleTemplate,
  examples,
  inputVariables: [],
});

// 4. 组装最终模板：系统消息 + 示例 + 用户输入
const finalTemplate = ChatPromptTemplate.fromMessages([
  ["system", "Convert emotions to emojis based on these examples:"],
  fewShotTemplate,
  ["human", "{input}"],
]);

const chain = finalTemplate.pipe(model);
await chain.invoke({ input: "surprised" }); // → 😮
await chain.invoke({ input: "angry" });     // → 😠
```

::: tip Few-shot 的两条实现路径
本章你已经见过两种 Few-shot：**消息版**（手动 push HumanMessage / AIMessage 对，Agent 场景常用）和**模板版**（`FewShotChatMessagePromptTemplate`，可复用场景常用）。原理相同——都是让模型从输入输出对中归纳模式。
:::

## 模板组合（Composition）

把提示词拆成可复用的片段（角色、上下文、任务），像乐高一样按需拼装，避免为每种组合各写一个大模板：

```ts
// 可复用的提示词片段
const systemTemplate = "You are an expert {domain} educator.";
const contextTemplate = "Teaching level: {level}\nAudience: {audience}";
const taskTemplate = "Explain {topic} in simple terms.";

// 字符串拼接即可组合
const fullTemplate = ChatPromptTemplate.fromMessages([
  ["system", systemTemplate + "\n\n" + contextTemplate],
  ["human", taskTemplate],
]);

const chain = fullTemplate.pipe(model);

// 同一模板服务不同场景
await chain.invoke({
  domain: "programming", level: "beginner",
  audience: "high school students", topic: "variables",
});
await chain.invoke({
  domain: "programming", level: "intermediate",
  audience: "college students", topic: "closures",
});
```

组合的收益：公共片段只写一次、相似提示词结构一致、更新在一处生效——这也是后面 RAG 章节构建文档处理模板的基础。

## 结构化输出：withStructuredOutput + Zod

到目前为止模型返回的都是自由文本。但真实系统经常需要**结构化数据**——比如从客服邮件里提取 `{ name, age, email }` 存数据库。靠正则去解析 "Name is John, email john@example, he's 25" 这种文本既脆弱又痛苦。

解决方案：用 [Zod](https://zod.dev/)（TypeScript 优先的 Schema 验证库）定义你想要的结构，再用 `.withStructuredOutput()` 让模型直接按结构返回。

![结构化输出：用 Zod Schema 将非结构化文本转换为类型安全的 JSON](/images/03-prompts-messages-outputs/structured-output.webp)

```ts
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

// 1. 用 Zod 定义想要的结构
const PersonSchema = z.object({
  name: z.string().describe("The person's full name"),
  age: z.number().describe("The person's age in years"),
  email: z.string().email().describe("The person's email address"),
  occupation: z.string().describe("The person's job or profession"),
});

// 2. 创建结构化模型（strict: true 确保输出严格符合 Schema，推荐）
const structuredModel = model.withStructuredOutput(PersonSchema, {
  strict: true,
});

// 3. 返回的不再是文本，而是有类型的对象！
const result = await structuredModel.invoke(
  "My name is Alice Johnson, I'm 28 years old, work as a software engineer, and you can reach me at alice.j@email.com"
);

console.log(result.name); // "Alice Johnson" —— TypeScript 有完整类型提示
console.log(result.age);  // 28 —— number 类型，无需解析
```

关键点：

- `z.object()` 定义字段名和类型
- `.describe()` 告诉 AI 每个字段的含义，直接影响提取准确率
- `withStructuredOutput()` 保证模型按该格式返回，Zod 自动验证
- 结果在 TypeScript 中完全有类型，自动补全、类型检查全都有

::: tip 和 Agent 级结构化输出的分工
本章是**模型级**：一次 `invoke` 就提取。第 05 章的 `createAgent({ responseFormat })` 是 **Agent 级**——先跑工具循环，再把最终答案收成 Zod 对象（`result.structuredResponse`）。单次抽取用本章；「先查再填表」用 Agent。详见 [Structured output](https://docs.langchain.com/oss/javascript/langchain/structured-output)。
:::

## Zod Schema 设计进阶

真实场景的数据不会只有平铺的字符串。Zod 支持嵌套对象、数组、枚举、可选字段，可以描述任意复杂结构，而且能和模板串成链：

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as z from "zod";

const CompanySchema = z.object({
  name: z.string().describe("Company name"),
  founded: z.number().describe("Year the company was founded"),
  headquarters: z.object({          // 嵌套对象
    city: z.string(),
    country: z.string(),
  }).describe("Company headquarters location"),
  products: z.array(z.string()).describe("List of main products or services"), // 数组
  employeeCount: z.number().describe("Approximate number of employees"),
  isPublic: z.boolean().describe("Whether the company is publicly traded"),
});

const structuredModel = model.withStructuredOutput(CompanySchema, { strict: true });

// 模板 + 结构化输出，串成一条提取链
const template = ChatPromptTemplate.fromMessages([
  ["system", "Extract company information from the text. If information is not available, make reasonable estimates."],
  ["human", "{text}"],
]);
const chain = template.pipe(structuredModel);

const result = await chain.invoke({
  text: `Microsoft was founded in 1975 and is headquartered in Redmond, Washington.
    The company is publicly traded and has over 220,000 employees worldwide.
    Their main products include Windows, Office, Azure, and Xbox.`,
});

console.log(result.headquarters.city);   // "Redmond" —— 嵌套字段类型安全
console.log(result.products.join(", ")); // "Windows, Office, Azure, Xbox"
```

设计 Schema 的常用工具箱：

```ts
const OrderSchema = z.object({
  // describe()：给 AI 的字段说明，越具体提取越准
  productName: z.string().describe("The name of the product ordered"),

  // 枚举：把输出限制在预定义类别里（分类任务神器）
  priority: z.enum(["low", "medium", "high"]).describe("Order priority level"),

  // 可选字段：信息可能缺失时用 optional()，避免模型硬编
  discountCode: z.string().optional().describe("Discount code if mentioned"),

  // 数值约束
  quantity: z.number().min(1).describe("Number of items, at least 1"),
});
```

典型应用场景：从邮件提取联系人入库、把简历解析成标准档案、把自然语言转成 API 请求体、分类任务（配合枚举）、为 RAG 提取文档元数据。

## ⚠️ 常见坑

- **模板变量漏填**：`invoke()` 时少传一个变量会直接抛错，变量名必须与 `{占位符}` 完全一致（区分大小写）。
- **PromptTemplate 忘记 format**：`PromptTemplate` 不能直接 `.pipe(model).invoke(...)` 后传对象了事——若手动使用需先 `.format()` 得到字符串。分不清时优先用 `ChatPromptTemplate`。
- **Few-shot 示例太少或自相矛盾**：示例是模型模仿的范本，3~5 个风格一致的示例通常够用；示例之间格式打架会让输出不稳定。
- **Zod 字段不写 `.describe()`**：没有描述时 AI 只能靠字段名猜含义，提取准确率明显下降。把 `.describe()` 当作"写给 AI 的注释"。
- **该 optional 的字段没 optional**：原文里可能没有的信息（如折扣码）若定义为必填，模型可能编造数据来凑数。
- **忘开 `strict: true`**：非严格模式下模型输出偶尔会偏离 Schema；生产环境建议始终开启。
- **场景选错工具**：给 Agent 硬套模板、给静态 RAG 提示词手拼消息，都会把代码写得别扭——回到本章开头的决策框架。

## ✅ 核心要点

- 消息数组是 Agent 的地基：`SystemMessage` 设定行为，`HumanMessage` / `AIMessage` 交替构成对话
- 模板 = 提示词的邮件合并：`{变量}` 占位、`.pipe(model)` 成链、一处更新全局生效
- Few-shot 用示例代替说教，格式类需求首选
- 模板组合把提示词拆成乐高积木，可复用、可维护
- `withStructuredOutput()` + Zod = 类型安全的数据提取，告别正则解析
- Schema 设计四件套：`describe()` 描述、`optional()` 可选、嵌套对象/数组、`enum` 枚举

## 🏋️ 动手练习

- [提示词模板](/playground/?id=ch03-prompt-template) —— 创建带变量的 ChatPromptTemplate 并串链调用
- [Few-shot 提示](/playground/?id=ch03-few-shot) —— 用示例教会模型一种自定义输出格式
- [结构化输出](/playground/?id=ch03-structured-output) —— 定义 Zod Schema，从文本中提取结构化数据

## 📚 延伸阅读

- [Messages 概念文档](https://docs.langchain.com/oss/javascript/langchain/messages)
- [模型级 Structured output](https://docs.langchain.com/oss/javascript/langchain/models#structured-output)
- [Agent 级 Structured output](https://docs.langchain.com/oss/javascript/langchain/structured-output)
- [Zod 官方文档](https://zod.dev/)
