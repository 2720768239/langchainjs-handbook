# 01. 初识 LangChain.js

> 🎯 理解 LangChain.js 是什么、解决什么问题，并亲手完成第一次 LLM 调用。

::: tip 本章速览
- LangChain.js 是 AI 开发的「五金店」：提供预制组件与统一抽象
- 五大核心概念：模型（Model）、提示词（Prompt）、工具（Tool）、Agent、记忆（Memory）
- 用 `ChatOpenAI` + `invoke()` 完成第一次 LLM 调用
- 三种消息类型：`SystemMessage` / `HumanMessage` / `AIMessage`
- 同一份代码对比不同模型的能力与速度
:::

## 五金店类比：为什么需要框架

想象你要盖一栋房子。你当然可以自己烧砖、自己配水泥、自己打铁锻造工具——但更聪明的做法是走进一家五金店，那里有现成的优质材料和经过验证的工具。

**LangChain.js 就是 AI 开发领域的五金店：**

| 五金店提供 | LangChain.js 提供 |
|-----------|-------------------|
| 🔨 现成的工具（锤子、锯子） | 预制组件（Chat 模型、提示词、工具） |
| 🧱 优质材料（木料、钉子） | 高质量抽象（适配任意 LLM 提供商） |
| 📋 施工图纸 | 常见 AI 应用的设计模式 |
| 🔄 标准化零件 | 可自由组合的组件（Composability） |

![五金店类比：LangChain.js 为 AI 开发提供预制组件和统一抽象](/images/01-introduction/hardware-store-analogy.webp)

没有框架时你需要自己做的事：给每个 LLM 提供商（OpenAI、Anthropic、Azure……）写不同的对接代码、自建提示词管理、手写函数调用逻辑、从零实现对话记忆和 Agent 结构。LangChain.js 把这些全部标准化了，你只需专注业务逻辑。

## 五大核心概念

整个课程围绕 5 个概念展开，本章先混个脸熟：

- **模型（Model）**：AI 的「大脑」，接收输入、生成输出 —— 本章
- **提示词（Prompt）**：与模型沟通的方式，可复用的模板 —— 第 03 章
- **工具（Tool）**：用外部函数和 API 扩展 AI 能力 —— 第 04 章
- **Agent**：能自主推理、决定调用哪个工具的 AI 系统 —— 第 05 章
- **记忆（Memory）**：跨轮次保持上下文 —— 第 02 章

它们的协作方式可以先记这条流水线：

```
用户输入 →（可选：附上对话历史 / 记忆）→ 提示词 → 模型
                ↘ 需要外部能力时：Agent 选工具并执行 ↗
                                              → 响应
```

现在不必全部理解，后面每章都会动手实践。第 02 章会讲「记忆其实是你维护的消息数组」，第 05 章再用 `checkpointer` 把它自动化。

## 第一次 LLM 调用

三步完成：导入、创建模型实例、调用 `invoke()`。

```ts
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

async function main() {
  // 创建 Chat 模型实例，配置全部来自 .env
  const model = new ChatOpenAI({
    model: process.env.AI_MODEL,
    configuration: { baseURL: process.env.AI_ENDPOINT },
    apiKey: process.env.AI_API_KEY
  });

  // 第一次 AI 调用！
  const response = await model.invoke("What is LangChain in one sentence?");
  console.log("🤖 AI 回复:", response.content);
}

main().catch(console.error);
```

运行 `tsx 01-introduction/code/01-hello-world.ts`，你会得到类似：

```
🤖 AI 回复: LangChain is a framework for building applications
powered by large language models (LLMs).
```

![第一次 LLM 调用的完整流程：从创建模型实例到收到响应](/images/01-introduction/first-llm-call-flow.webp)

### ChatOpenAI 的三个关键配置

| 配置项 | 对应环境变量 | 作用 |
|--------|-------------|------|
| `model` | `AI_MODEL` | 用哪个模型（如 `gpt-5-mini`） |
| `configuration.baseURL` | `AI_ENDPOINT` | AI 服务的 API 地址 |
| `apiKey` | `AI_API_KEY` | 身份凭证 |

::: tip 提供商抽象（Provider Abstraction）的威力
凭证和地址全放在 `.env` 里，意味着从 GitHub Models 切到 Microsoft Foundry 或 OpenAI 官方时，**代码零改动**——就像换联系人的电话号码，拨号动作完全一样。
:::

## 三种消息类型

直接传字符串给 `invoke()` 很方便，但真实应用需要更精细的控制。LangChain.js 用**消息类型**把「系统指令」和「用户输入」分开：

| 类型 | 用途 | 谁来创建 |
|------|------|----------|
| `SystemMessage` | 设定 AI 的行为与人格 | 开发者 |
| `HumanMessage` | 用户的输入和提问 | 用户 |
| `AIMessage` | AI 的回复（带元数据） | 模型返回 |

```ts
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "langchain";
import "dotenv/config";

const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY
});

// 用结构化消息精确控制 AI 行为
const messages = [
  new SystemMessage("You are a helpful AI assistant who explains things simply."),
  new HumanMessage("Explain quantum computing to a 10-year-old."),
];

const response = await model.invoke(messages);
console.log(response.content);
```

`SystemMessage` 让 AI「用简单的方式解释」，于是回复会自动变成适合 10 岁小孩的语言——比如把量子计算机比喻成「能同时尝试很多种拼图解法的魔法盒子」。

![SystemMessage、HumanMessage 与 AIMessage 在对话中的协作方式](/images/01-introduction/message-types-flow.webp)

**为什么用消息而不是纯字符串？**

- 精确控制 AI 的人格和行为（系统指令与用户输入互不干扰）
- 天然支持多轮对话上下文（第 02 章展开）
- 更强大、更灵活，是后续 Agent 开发的基础

## 模型对比：能力 vs 速度

选模型就像选计算器：科学计算器功能强但更慢更贵，基础计算器算简单题又快又省。**最好的选型方法是拿你的真实提示词测一遍。**

```ts
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

async function compareModels() {
  const prompt = "Explain recursion in programming in one sentence.";
  const models = ["gpt-5", "gpt-5-mini"];

  for (const modelName of models) {
    // 每个模型创建一个独立实例
    const model = new ChatOpenAI({
      model: modelName,
      configuration: { baseURL: process.env.AI_ENDPOINT },
      apiKey: process.env.AI_API_KEY,
    });

    const startTime = Date.now();
    const response = await model.invoke(prompt);
    const duration = Date.now() - startTime;

    console.log(`📊 ${modelName}: ${response.content}`);
    console.log(`⏱️ 耗时: ${duration}ms`);
  }
}

compareModels().catch(console.error);
```

典型观察结果：

- `gpt-5` 更细致、更擅长复杂任务，但更慢更贵
- `gpt-5-mini` 简洁但依然准确，快且省资源
- 两者答案都正确，只是表达深度不同——**按需选择：速度 vs 能力**

::: warning 使用 Microsoft Foundry 的注意点
运行模型对比示例需要在 Foundry 中同时部署 `gpt-5` 和 `gpt-5-mini` 两个模型（见 [00 章环境搭建](/guide/00-setup)）。
:::

## ⚠️ 常见坑

- **忘记 `import "dotenv/config"`**：环境变量读不到，模型创建时报缺少 apiKey
- **`response` 不是字符串**：`invoke()` 返回的是 `AIMessage` 对象，要取 `response.content` 才是文本
- **把系统指令塞进用户消息**：能跑，但行为控制不稳定；系统指令请放 `SystemMessage`
- **LLM 输出不是确定的**：同一问题每次回答可能不同，这是正常现象，不是 bug
- **消息类从 `langchain` 导入**：`SystemMessage`/`HumanMessage` 在 `langchain` 主包，不在 `@langchain/openai`

## ✅ 核心要点

- LangChain.js 是**抽象层**：一套接口对接所有 LLM 提供商
- 一切从 `new ChatOpenAI({...})` + `await model.invoke(...)` 开始
- 三种消息类型各司其职：System 定人格、Human 提问题、AI 存回复
- 换提供商 = 改 `.env`，代码不动
- 模型选型没有标准答案：拿真实提示词实测速度与质量

## 🏋️ 动手练习

去训练场亲手跑一遍本章代码：

- [第一次 LLM 调用](/playground/?id=ch01-hello-llm) —— 创建模型、调用 `invoke()`、从 `AIMessage` 里取出回复文本

也可以在本地修改 `01-hello-world.ts` 的问题，或给 `invoke()` 传入 `SystemMessage` + `HumanMessage`，观察人格设定如何改变回答风格。

## 📚 延伸阅读

- [LangChain.js 核心概念](https://docs.langchain.com/oss/javascript/langchain/overview)
- [Chat 模型文档](https://docs.langchain.com/oss/javascript/integrations/chat)
- [GitHub Models 市场](https://github.com/marketplace/models)
