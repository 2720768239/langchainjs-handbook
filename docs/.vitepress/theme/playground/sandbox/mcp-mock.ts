/**
 * "@langchain/mcp-adapters" 的沙箱替身。
 * MultiServerMCPClient 不做真实网络连接，getTools() 返回练习题预置的模拟 MCP 工具，
 * 让「连接 MCP 服务器 → 获取工具 → 交给 Agent」的完整流程可以离线练习。
 */
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { getMcpTools } from "./state";

const defaultTools = [
  tool(
    async (input: { libraryName: string }) => {
      return `/libs/${input.libraryName.toLowerCase().replace(/\s+/g, "-")}`;
    },
    {
      name: "resolve-library-id",
      description: "把库名解析为文档系统可识别的 ID",
      schema: z.object({ libraryName: z.string().describe("库的名称，如 react") }),
    },
  ),
  tool(
    async (input: { libraryId: string; topic?: string }) => {
      return `【模拟文档】${input.libraryId} 关于 ${input.topic ?? "概览"} 的最新文档内容……`;
    },
    {
      name: "get-library-docs",
      description: "获取指定库的最新文档，可选按主题过滤",
      schema: z.object({
        libraryId: z.string().describe("resolve-library-id 返回的 ID"),
        topic: z.string().optional().describe("要查询的主题"),
      }),
    },
  ),
];

export class MultiServerMCPClient {
  public config: Record<string, unknown>;
  public closed = false;

  constructor(config: Record<string, unknown>) {
    this.config = config;
  }

  async getTools(): Promise<any[]> {
    await new Promise((r) => setTimeout(r, 10));
    const exerciseTools = getMcpTools();
    return exerciseTools.length > 0 ? exerciseTools : defaultTools;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}
