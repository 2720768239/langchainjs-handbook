# 06. 模型上下文协议 MCP

> 🎯 学会用 MCP（Model Context Protocol）这一开放标准，把 Agent 一键接入外部工具生态——不再为每个服务手写集成代码。

::: tip 本章速览
- MCP 是 AI 应用的「USB-C」：一个标准协议接入所有外部服务
- 两种传输方式：**Streamable HTTP**（网络服务）与 **stdio**(子进程)
- `MultiServerMCPClient.getTools()` 拿到工具后，照旧喂给 `createAgent()`——模式完全不变
- 一个客户端可同时连接多个 MCP 服务器，Agent 自动路由到正确工具
- 生产环境必备：`withRetry()` 重试、超时控制、`finally` 中关闭连接
- 用 `@modelcontextprotocol/sdk` 几十行代码就能写出自己的 MCP 服务器
:::

## 为什么需要 MCP：USB-C 类比

在第 05 章里，我们亲手写了计算器、天气这些工具的**实现**。但真实项目往往需要连接现成服务：GitHub、日历、公司数据库、文档系统……为每个服务写一套自定义集成，意味着要分别处理不同的 API、认证方式和数据格式。

这就像 USB-C 出现之前的笔记本电脑：HDMI、DisplayPort、USB-A、网口、电源口各占一个位置，每种设备还要装专属驱动。而 USB-C 用**一个通用接口 + 一套标准协议**解决了所有问题。

![MCP 就像 AI 应用的 USB-C 接口](/images/06-mcp/usb-c-analogy.png)

**MCP（Model Context Protocol，模型上下文协议）** 就是 AI 应用的 USB-C：一个开放标准，让服务通过统一协议暴露自己的能力。你的 Agent 连接一次，就能使用对方的全部工具。

| 没有 MCP | 有了 MCP |
|---------|---------|
| 每个服务写一套自定义集成 | 一个标准协议通吃 |
| 每个服务单独处理认证 | 统一的接入方式 |
| 新增服务耗时费力 | 加一段配置即可 |

**关键洞察**：第 05 章你构建的是工具的*实现*；本章你连接的是工具的*提供商*。`createAgent()` 的用法一模一样，变的只是工具来源。

![MCP 架构：Agent 通过 MCP 客户端连接多个服务器](/images/06-mcp/mcp-architecture.png)

## 两种传输方式：HTTP vs stdio

MCP 规范定义了两种标准的客户端-服务器通信机制：

| 传输方式 | 通信形式 | 适用场景 | 配置示例 |
|---------|---------|---------|---------|
| **Streamable HTTP** | 走网络（客户端 → 服务器） | 服务器有 URL 可访问（本地或远程 Web 服务） | `{ transport: "http", url: "https://.../mcp" }` |
| **stdio** | 走进程（父子进程通过 stdin/stdout 流） | 服务器作为应用的子进程运行 | `{ transport: "stdio", command: "npx", args: [...] }` |

![HTTP 传输走网络，stdio 传输走进程流](/images/06-mcp/http-stdio-comparison.png)

一句话区分：**HTTP = 调用一个 Web API；stdio = 启动一个程序并和它对话**。HTTP 服务器独立运行、生命周期与客户端无关；stdio 服务器由客户端启动和管理，客户端退出它也随之结束。

::: details 传输协议的演进
当前 MCP 规范使用 **Streamable HTTP** 作为标准网络传输，取代了早期版本的 HTTP+SSE（Server-Sent Events）。在 LangChain.js 代码里你只需写 `transport: "http"`，库会自动处理底层协议。
:::

## 连接第一个 MCP 服务器（HTTP + Context7）

LangChain.js 通过 `@langchain/mcp-adapters` 包提供 MCP 集成。下面连接 [Context7](https://github.com/upstash/context7)——一个提供最新库文档的公共 MCP 服务器，它暴露两个工具：

- `resolve-library-id`：把库名（如 "React"）转换为 Context7 ID
- `get-library-docs`：按主题检索文档

```ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, HumanMessage } from "langchain";
import "dotenv/config";

const mcpClient = new MultiServerMCPClient({
  context7: {
    transport: "http",                    // Streamable HTTP 协议
    url: "https://mcp.context7.com/mcp",  // 公共 Context7 端点
    // 可选：加 API key 提升速率限制
    // headers: { Authorization: `Bearer ${process.env.CONTEXT7_API_KEY}` }
  },
});

try {
  // 1. 从 MCP 服务器发现所有可用工具
  const tools = await mcpClient.getTools();

  // 2. 老朋友 createAgent()——工具来源变了，模式没变
  const model = new ChatOpenAI({
    model: process.env.AI_MODEL,
    configuration: { baseURL: process.env.AI_ENDPOINT },
    apiKey: process.env.AI_API_KEY,
  });
  const agent = createAgent({ model, tools });

  // 3. Agent 自动调用 MCP 工具获取最新文档
  const response = await agent.invoke({
    messages: [new HumanMessage("How do I use React useState hook? Get the latest documentation.")],
  });
  console.log(response.messages[response.messages.length - 1].content);
} finally {
  await mcpClient.close(); // 一定要关闭连接，否则脚本无法退出
}
```

三步走：`getTools()` 发现工具 → `createAgent()` 组装 → `invoke()` 调用。MCP 客户端负责与远程服务器的所有通信，Agent 完全感知不到工具是本地的还是远程的。

::: tip 与第 05 章的区别
1. **工具来源**：不再手写实现，而是从 MCP 服务器获取
2. **工具发现**：`mcpClient.getTools()` 动态拉取——服务器增删工具无需改客户端代码
3. **Agent 部分零改动**：同样的 ReAct 循环，同样的 `createAgent()`
:::

## stdio 传输：把服务器当子进程跑

当 MCP 服务器就是一个本地脚本时，用 stdio 传输更直接——客户端负责启动子进程，双方通过标准输入/输出流通信（stdin 读入、stdout 写出，就像两个程序用管道相连）。

```ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 客户端会启动这个子进程并管理其生命周期
const mcpClient = new MultiServerMCPClient({
  localCalculator: {
    transport: "stdio",   // 本地子进程，不走网络
    command: "npx",
    args: ["tsx", join(__dirname, "servers/stdio-calculator-server.ts")],
  },
});

// 之后的用法与 HTTP 完全相同
const tools = await mcpClient.getTools();
const agent = createAgent({ model, tools });
```

| 特性 | Streamable HTTP | stdio |
|------|----------------|-------|
| 通信 | 网络（HTTP 请求） | 进程（stdin/stdout 流） |
| 服务器部署 | 独立运行 | 作为客户端的子进程 |
| 生命周期 | 与客户端无关 | 与客户端绑定 |
| 最适合 | 网络可达的共享服务 | 紧耦合的本地工具 |

两种传输都能做认证、都能访问网络、都可用于生产——选择取决于你的架构：需要跨进程/跨机器共享就用 HTTP，与客户端紧密集成就用 stdio。

## 多服务器模式：MCP 的真正威力

`MultiServerMCPClient` 名副其实——可以**同时连接多个服务器**，甚至混用不同传输类型。Agent 拿到所有服务器的工具后，会根据问题自动选择用哪个。

```ts
const mcpClient = new MultiServerMCPClient({
  context7: {
    transport: "http",
    url: "https://mcp.context7.com/mcp",     // 远程文档服务器
  },
  calculator: {
    transport: "stdio",
    command: "npx",
    args: ["tsx", join(__dirname, "servers/stdio-calculator-server.ts")], // 本地数学服务器
  },
});

// getTools() 合并所有服务器的工具
const tools = await mcpClient.getTools();
const agent = createAgent({ model, tools });

// 问 "What is 25 * 4 + 100?"     → Agent 自动用 calculator
// 问 "What is React? Get docs."  → Agent 自动用 Context7
```

![一个 Agent 同时连接文档、计算、GitHub、文件系统等多个 MCP 服务器](/images/06-mcp/multi-server-pattern.png)

这个模式的价值在于：**扩展到数十个服务器都无需改动 Agent 代码**。真实场景比如 GitHub（代码）+ 日历（日程）+ 数据库（数据查询）+ 内部工具，统统挂在一个 Agent 上。

## 错误处理与生产模式

MCP 服务器是外部依赖，网络抖动、服务宕机都是常态。课程推荐的生产模式：

```ts
// 1. 用 LangChain 内置的 withRetry()——自带指数退避，无需手写重试循环
const modelWithRetry = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
}).withRetry({ stopAfterAttempt: 3 });  // 最多重试 3 次

const agent = createAgent({ model: modelWithRetry, tools });

// 2. 用 Promise.race 给查询加超时，防止无限挂起
const response = await Promise.race([
  agent.invoke({ messages: [new HumanMessage(query)] }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Query timeout")), 30_000)
  ),
]);
```

生产清单：

- ✅ `model.withRetry()` 自动重试（指数退避）
- ✅ 请求超时控制
- ✅ 回退策略（备用服务器 / 缓存数据）
- ✅ 健康检查监控服务器可用性
- ✅ **`finally` 块中 `await mcpClient.close()`**——优雅清理连接

## 写一个自己的 MCP 服务器

用官方 `@modelcontextprotocol/sdk` 就能把公司内部工具、现有 API 包装成任何 MCP 客户端都能连的标准服务器。核心只有三件事：**声明能力、列出工具、处理调用**。

以下是课程中 stdio 计算器服务器的完整骨架（`stdio-calculator-server.ts`）：

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { evaluate } from "mathjs";

// 1. 创建服务器，声明具备 tools 能力
const mcpServer = new Server(
  { name: "stdio-calculator", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 2. 响应「列出工具」请求——客户端 getTools() 时拿到的就是这些
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "calculate",
      description: "Perform mathematical calculations using mathjs",
      inputSchema: {
        type: "object",
        properties: {
          expression: { type: "string", description: "如 '2 + 2'、'sqrt(16)'" },
        },
        required: ["expression"],
      },
    },
  ],
}));

// 3. 响应「调用工具」请求——真正执行逻辑的地方
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === "calculate") {
    const { expression } = args as { expression: string };
    const result = evaluate(expression);
    return { content: [{ type: "text", text: `${expression} = ${result}` }] };
  }
  throw new Error(`Unknown tool: ${name}`);
});

// 4. 挂上 stdio 传输，开始监听
const transport = new StdioServerTransport();
await mcpServer.connect(transport);

// 注意：stdout 被 MCP 协议占用，日志必须写到 stderr！
console.error("📟 stdio MCP Calculator Server running...");
```

::: details 想暴露成 HTTP 服务？
把 `StdioServerTransport` 换成 `StreamableHTTPServerTransport`，再配一个 Express 服务器处理 HTTP 端点即可。课程的 `samples/basic-mcp-server.ts` 提供了包含会话管理、优雅关闭的生产级实现，客户端用 `{ transport: "http", url: "http://localhost:3000/mcp" }` 连接。
:::

服务器端最佳实践：工具名称和描述要具体清晰（Agent 靠描述决定何时调用）、用 JSON Schema 校验输入、错误信息要有用、支持优雅关闭。

## ⚠️ 常见坑

| 坑 | 原因与解法 |
|----|-----------|
| 脚本跑完不退出 | 忘了关闭 MCP 连接——把 `await mcpClient.close()` 放进 `finally` 块 |
| stdio 服务器日志把协议搞坏 | stdout 被 MCP 通信占用，**日志必须用 `console.error` 写到 stderr** |
| stdio 报 "Module not found" | 子进程的相对路径不可靠，用 `fileURLToPath(import.meta.url)` + `join(__dirname, ...)` 构造绝对路径 |
| `getTools()` 返回空数组 | 服务器没注册工具或认证失败——检查服务器日志，确认 `headers` 里带了 API key |
| Agent 拿到工具却不用 | 工具描述太含糊，Agent 无从判断；确认 `tools` 数组真的传给了 `createAgent()` |
| 多服务器工具重名 | MCP 会自动按服务器做命名空间隔离；仍冲突时靠清晰的描述区分，或在服务器端改名 |
| 连接超时 / "Transport closed" | 外部服务不可控，务必配 `withRetry()` + 超时 + 回退策略（见上文生产模式） |

## ✅ 核心要点

- **MCP = AI 应用的 USB-C**：一个开放协议，接入所有兼容服务，告别逐个手写集成
- **HTTP 连网络服务，stdio 连本地子进程**，同一套客户端代码通吃
- **`getTools()` + `createAgent()`**：MCP 工具与手写工具在 Agent 眼里没有区别
- **多服务器是常态**：一个 `MultiServerMCPClient` 挂 N 个服务器，Agent 自动选工具
- **生产三件套**：`withRetry()` 重试、超时控制、`finally` 中关连接
- **写服务器很简单**：声明能力 → `ListTools` 列工具 → `CallTool` 执行，SDK 处理协议细节

## 🏋️ 动手练习

- [把 MCP 工具接入 Agent](/playground/?id=ch06-mcp-tools)

## 📚 延伸阅读

- [Model Context Protocol 官方规范](https://modelcontextprotocol.io/)
- [@langchain/mcp-adapters 包文档](https://www.npmjs.com/package/@langchain/mcp-adapters)
- [MCP for Beginners 课程](https://github.com/microsoft/mcp-for-beginners)
- [Context7 MCP 服务器](https://github.com/upstash/context7)
