# 00. 环境搭建

> 🎯 可选进阶：用约 15 分钟准备真实模型环境。只使用浏览器训练场时，可以跳过本章。

::: tip 本章速览
- 浏览器训练场无需安装、无需 API Key；本章只服务于真实 SDK 示例
- 本仓库统一使用 Node.js **22+（LTS）** 作为验证基线
- 用 GitHub Personal Access Token 免费调用 GitHub Models（无需信用卡）
- 三个核心环境变量：`AI_API_KEY` / `AI_ENDPOINT` / `AI_MODEL`；第 07、08 章再加 `AI_EMBEDDING_MODEL`
- 可选：Microsoft Foundry、OpenAI、Anthropic、Ollama 等其他提供商
- 换提供商只改 `.env`，代码零改动
:::

::: tip 先确认你是否需要本章
只想阅读手册和完成练习？直接进入[训练场](/playground/)。只有要运行 `examples/real-model/`、观察真实网络和提供商行为时，才需要继续配置。
:::

就像做木工前要先布置好工作台，运行真实 AI 应用前也要准备好「工作坊」。整个过程只需要一次。

## 前置要求

- 一个 GitHub 账号（免费）
- 基本的命令行操作能力
- 任意代码编辑器（推荐 [VS Code](https://code.visualstudio.com/)）

## Step 1：安装 Node.js 并克隆本仓库

本仓库以 **Node.js 22+（LTS）** 为统一验证环境。先检查是否已安装：

```bash
node --version   # 应显示 v22.x 或更高
npm --version
```

没装的话去 [nodejs.org](https://nodejs.org/) 下载 LTS 版本即可（稳定、有安全更新、生产可用）。

然后克隆本仓库并安装依赖：

```bash
git clone https://github.com/2720768239/langchainjs-handbook.git
cd langchainjs-handbook
npm ci
npm run test:samples
```

依赖里的核心包：

| 包名 | 作用 |
|------|------|
| `langchain` | 主包，消息类型、通用工具等 |
| `@langchain/core` | 核心抽象层 |
| `@langchain/openai` | OpenAI 兼容模型集成（全课程通用） |
| `dotenv` | 从 `.env` 加载环境变量 |
| `@modelcontextprotocol/server` | MCP v2 服务器 API |

`tsx` 已作为项目依赖安装，由 `npm run example:*` 脚本调用，不需要全局安装。

## Step 2：免费获取 GitHub Models Token

GitHub Models 提供**免费**的主流模型访问（GPT 系列等），只需要一个 Personal Access Token：

1. 访问 <https://github.com/settings/tokens/new>
2. Token 名称随意填（如 `langchain-course`），有效期建议 90 天
3. **权限一个都不用勾**——GitHub Models 不需要任何 scope
4. 点击 "Generate token"，**立刻复制保存**（页面关闭后无法再查看）

为什么推荐 GitHub Models 入门？

- ✅ 免费，不需要信用卡
- ✅ 能用 GPT-4o、GPT-5-mini 等主流模型
- ✅ 复用已有 GitHub 账号，零门槛

## Step 3：配置 .env 环境变量

在项目根目录复制模板：

```bash
# Mac / Linux / WSL
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

编辑 `.env`，填入 GitHub Models 配置：

```bash
AI_API_KEY=ghp_你的GitHub Token
AI_ENDPOINT=https://models.github.ai/inference
AI_MODEL=openai/gpt-4.1-mini
AI_EMBEDDING_MODEL=openai/text-embedding-3-small
```

这几个变量贯穿全课程：

- `AI_API_KEY`：身份凭证（GitHub Token 以 `ghp_` 或 `github_pat_` 开头）
- `AI_ENDPOINT`：AI 服务的 API 地址
- `AI_MODEL`：对话 / Agent 用哪个 Chat 模型
- `AI_EMBEDDING_MODEL`：第 07、08 章语义搜索用的 Embedding 模型（和 Chat 模型不是一回事）

::: warning 免费模型偶尔繁忙
免费的 `gpt-5-mini` / `gpt-5` 有时会拥挤报错，可以把 `AI_MODEL` 换成 `openai/gpt-4.1-mini` 或 `openai/gpt-4.1` 再试。
:::

把凭证放进 `.env` 而不是写死在代码里，好处是：**换提供商只需改配置文件，一行代码都不用动**——就像换联系人电话号码，拨号方式不变，只是目的地变了。

## Step 4：验证环境

在项目根目录运行真实模型示例：

```bash
npm run example:first-call
```

看到类似输出就说明一切就绪：

```
LangChain.js 是一个帮助开发者组合模型、工具与 Agent 工作流的 TypeScript 框架。
```

## 可选：其他 AI 提供商

课程代码统一用 `ChatOpenAI` + `baseURL`，因此任何 **OpenAI 兼容接口**都可以无缝接入，只改 `.env`：

### Microsoft Foundry（Azure 订阅，生产级）

1. 在 [Microsoft Foundry 门户](https://ai.azure.com/) 新建项目
2. 在「Models + endpoints」中部署 `gpt-5-mini`（大部分章节）、`gpt-5`（第 1 章模型对比）和 `text-embedding-3-small`（第 7、8 章）
3. 在项目 Overview 找到 API Key 和 Azure OpenAI endpoint

```bash
# 注意 endpoint 末尾要加 /openai/v1
AI_API_KEY=你的Azure API Key
AI_ENDPOINT=https://your-resource.openai.azure.com/openai/v1
AI_MODEL=gpt-5-mini
AI_EMBEDDING_MODEL=text-embedding-3-small
```

相比免费额度，Foundry 提供更高的速率限制、内容过滤、监控等企业级能力。

### OpenAI 官方 / Anthropic / Ollama

```bash
# OpenAI 官方
AI_API_KEY=sk-你的OpenAI Key
AI_ENDPOINT=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# Ollama 本地模型（完全离线免费）
AI_API_KEY=ollama            # 任意非空值即可
AI_ENDPOINT=http://localhost:11434/v1
AI_MODEL=llama3.2
```

Anthropic 等非 OpenAI 兼容的提供商则需要安装对应集成包（如 `@langchain/anthropic`），第 02 章的 `initChatModel()` 小节会介绍这种多提供商切换模式。

## 可选：LangSmith 追踪

本地脚本用 `console.log` 就够。一旦 Agent 开始调工具，你会想看到「它为什么调了这个、参数是什么、哪一步慢」。官方推荐 [LangSmith](https://docs.langchain.com/langsmith/observability)：

```bash
# 在 .env 里打开追踪（需要 LangSmith 账号和 API Key）
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=你的_LangSmith_Key
```

这不是跑通课程的前置条件。排错 Agent 时再配即可，第 05 章会再提一次。

## ⚠️ 常见坑

| 问题 | 解决方法 |
|------|----------|
| `Cannot find module '@langchain/openai'` | 在项目根目录运行 `npm install` |
| `AI_API_KEY not found` | 确认 `.env` 在项目根目录；值不加引号、`=` 两边不留空格 |
| `401 Unauthorized` | Token 复制不完整或已过期，重新生成一个；检查是否混入空格 |
| 429 速率限制 | GitHub Models 免费额度有限，等几分钟即可恢复；或切换到 Foundry |
| 模型繁忙报错 | 把 `AI_MODEL` 换成 `openai/gpt-4.1-mini` 试试 |
| 第 07 章 Embedding 报错 | 确认 `.env` 里有 `AI_EMBEDDING_MODEL`，且和 Chat 模型不是同一个名字 |

## ✅ 核心要点

- Node.js **22+（LTS）** + 全局 `tsx`，所有示例用 `tsx 文件.ts` 运行
- GitHub Models 免费、无需信用卡，创建 Token 时不用勾任何权限
- `.env` 三件套：`AI_API_KEY` / `AI_ENDPOINT` / `AI_MODEL`（语义搜索再加 `AI_EMBEDDING_MODEL`）
- 提供商抽象是 LangChain.js 的核心卖点：换供应商 = 改 `.env`
- 动手前先跑 `npm run test:samples` 验证本地示例，再用 `npm run example:first-call` 验证真实模型连通性

## 📚 延伸阅读

- [GitHub Models 市场](https://github.com/marketplace/models)
- [Microsoft Foundry 快速入门](https://learn.microsoft.com/azure/ai-foundry/quickstarts/get-started-code)
- [dotenv 环境变量最佳实践](https://www.npmjs.com/package/dotenv)
- [LangSmith 追踪入门](https://docs.langchain.com/langsmith/trace-with-langchain)
- [Node.js 官方文档](https://nodejs.org/docs/latest/api/)
