# 00. 环境搭建

> 🎯 用约 15 分钟准备好开发环境：Node.js、免费的 AI 模型访问凭证、`.env` 配置，跑通第一个连通性测试。

::: tip 本章速览
- 安装 Node.js 22+（LTS）与 `tsx`，直接运行 TypeScript 文件
- 用 GitHub Personal Access Token 免费调用 GitHub Models（无需信用卡）
- 三个核心环境变量：`AI_API_KEY` / `AI_ENDPOINT` / `AI_MODEL`
- 可选：Microsoft Foundry、OpenAI、Anthropic、Ollama 等其他提供商
- 换提供商只改 `.env`，代码零改动
:::

就像做木工前要先布置好工作台，写 AI 应用前也要先准备好「工作坊」。整个过程只需要一次，之后所有章节共用这套环境。

## 前置要求

- 一个 GitHub 账号（免费）
- 基本的命令行操作能力
- 任意代码编辑器（推荐 [VS Code](https://code.visualstudio.com/)）

## Step 1：安装 Node.js 与 tsx

课程代码需要 **Node.js 22+（LTS）**。先检查是否已安装：

```bash
node --version   # 应显示 v22.x 或更高
npm --version
```

没装的话去 [nodejs.org](https://nodejs.org/) 下载 LTS 版本即可（稳定、有安全更新、生产可用）。

然后克隆课程仓库并安装依赖：

```bash
git clone https://github.com/microsoft/langchainjs-for-beginners
cd langchainjs-for-beginners
npm install

# 全局安装 tsx，直接运行 .ts 文件
npm install -g tsx
```

依赖里的核心包：

| 包名 | 作用 |
|------|------|
| `langchain` | 主包，消息类型、通用工具等 |
| `@langchain/core` | 核心抽象层 |
| `@langchain/openai` | OpenAI 兼容模型集成（全课程通用） |
| `dotenv` | 从 `.env` 加载环境变量 |

::: details 为什么用 tsx？
`tsx` 让你跳过编译步骤直接运行 TypeScript：

```bash
# 不用 tsx：先编译再运行
tsc myfile.ts && node myfile.js

# 用 tsx：一步到位
tsx myfile.ts
```

整个课程的示例都用 `tsx 文件名.ts` 来运行。
:::

::: tip 不想折腾本地环境？
可以用 **GitHub Codespaces**：打开 [课程仓库](https://github.com/microsoft/langchainjs-for-beginners)，点绿色 "Code" 按钮 → "Open with Codespaces" → "New codespace"，浏览器里就有一套现成的云端开发环境。
:::

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
AI_MODEL=openai/gpt-5-mini
```

这三个变量贯穿全课程：

- `AI_API_KEY`：身份凭证（GitHub Token 以 `ghp_` 或 `github_pat_` 开头）
- `AI_ENDPOINT`：AI 服务的 API 地址
- `AI_MODEL`：使用哪个模型

::: warning 免费模型偶尔繁忙
免费的 `gpt-5-mini` / `gpt-5` 有时会拥挤报错，可以把 `AI_MODEL` 换成 `openai/gpt-4.1-mini` 或 `openai/gpt-4.1` 再试。
:::

把凭证放进 `.env` 而不是写死在代码里，好处是：**换提供商只需改配置文件，一行代码都不用动**——就像换联系人电话号码，拨号方式不变，只是目的地变了。

## Step 4：验证环境

在项目根目录运行测试脚本：

```bash
tsx scripts/test-setup.ts
```

看到类似输出就说明一切就绪：

```
🚀 Testing AI provider connection...

✅ SUCCESS! Your AI provider is working!
Model response: Setup successful!

🎉 You're ready to start the course!
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

## ⚠️ 常见坑

| 问题 | 解决方法 |
|------|----------|
| `Cannot find module '@langchain/openai'` | 在项目根目录运行 `npm install` |
| `AI_API_KEY not found` | 确认 `.env` 在项目根目录；值不加引号、`=` 两边不留空格 |
| `401 Unauthorized` | Token 复制不完整或已过期，重新生成一个；检查是否混入空格 |
| 429 速率限制 | GitHub Models 免费额度有限，等几分钟即可恢复；或切换到 Foundry |
| 模型繁忙报错 | 把 `AI_MODEL` 换成 `openai/gpt-4.1-mini` 试试 |

## ✅ 核心要点

- Node.js 22+（LTS）+ 全局 `tsx`，所有示例用 `tsx 文件.ts` 运行
- GitHub Models 免费、无需信用卡，创建 Token 时不用勾任何权限
- `.env` 三件套：`AI_API_KEY` / `AI_ENDPOINT` / `AI_MODEL`
- 提供商抽象是 LangChain.js 的核心卖点：换供应商 = 改 `.env`
- 动手前先跑 `tsx scripts/test-setup.ts` 验证连通性

## 📚 延伸阅读

- [GitHub Models 市场](https://github.com/marketplace/models)
- [Microsoft Foundry 快速入门](https://learn.microsoft.com/azure/ai-foundry/quickstarts/get-started-code)
- [dotenv 环境变量最佳实践](https://www.npmjs.com/package/dotenv)
- [Node.js 官方文档](https://nodejs.org/docs/latest/api/)
