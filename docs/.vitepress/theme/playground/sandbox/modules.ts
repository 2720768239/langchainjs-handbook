/**
 * 沙箱模块注册表：用户代码里的 import 会被编译为 require()，
 * 由这里解析。@langchain/core、zod、@langchain/textsplitters 是【真实】的库，
 * 模型 / Embedding / MCP / 向量库等需要网络或 Node 环境的部分则由确定性替身实现。
 */
import * as coreMessages from "@langchain/core/messages";
import * as corePrompts from "@langchain/core/prompts";
import * as coreTools from "@langchain/core/tools";
import * as coreDocuments from "@langchain/core/documents";
import * as coreOutputParsers from "@langchain/core/output_parsers";
import * as coreRunnables from "@langchain/core/runnables";
import * as textsplitters from "@langchain/textsplitters";
import * as zod from "zod";

import { ChatOpenAI, AzureChatOpenAI, FakeChatModel } from "./fake-chat-model";
import {
  OpenAIEmbeddings,
  AzureOpenAIEmbeddings,
  FakeEmbeddings,
  cosineSimilarity,
  embedText,
} from "./fake-embeddings";
import { MemoryVectorStore } from "./memory-vector-store";
import * as langchainMock from "./langchain-mock";
import { MultiServerMCPClient } from "./mcp-mock";
import { evaluate } from "./mathjs-mock";

const openaiMock = {
  ChatOpenAI,
  AzureChatOpenAI,
  OpenAIEmbeddings,
  AzureOpenAIEmbeddings,
};

const vectorStoreMock = { MemoryVectorStore };

export const moduleRegistry: Record<string, unknown> = {
  // ---- 真实库 ----
  zod,
  "zod/v4": zod,
  "@langchain/core/messages": coreMessages,
  "@langchain/core/prompts": corePrompts,
  "@langchain/core/tools": coreTools,
  "@langchain/core/documents": coreDocuments,
  "@langchain/core/output_parsers": coreOutputParsers,
  "@langchain/core/runnables": coreRunnables,
  "@langchain/textsplitters": textsplitters,

  // ---- 确定性替身 ----
  "@langchain/openai": openaiMock,
  langchain: langchainMock,
  "@langchain/langgraph": { MemorySaver: langchainMock.MemorySaver },
  "@langchain/mcp-adapters": { MultiServerMCPClient },
  "@langchain/classic/vectorstores/memory": vectorStoreMock,
  "langchain/vectorstores/memory": vectorStoreMock,
  mathjs: { evaluate },

  // ---- 空实现，兼容课程代码习惯 ----
  "dotenv/config": {},
  dotenv: { config: () => ({ parsed: {} }) },

  // ---- 训练场自带的工具函数（练习题可用） ----
  "playground/utils": { cosineSimilarity, embedText, FakeChatModel, FakeEmbeddings },
};

export function resolveModule(name: string): unknown {
  if (name in moduleRegistry) return moduleRegistry[name];
  const known = Object.keys(moduleRegistry)
    .filter((k) => !k.startsWith("playground/"))
    .join("、");
  throw new Error(
    `训练场沙箱暂不支持导入 "${name}"。\n可用的模块有：${known}。\n` +
      `如需运行完整依赖，请克隆课程仓库在本地执行。`,
  );
}
