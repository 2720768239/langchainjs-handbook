import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { evaluate } from "mathjs";
import * as z from "zod/v4";

export function calculateExpression(expression: string): string {
  const value = evaluate(expression);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Expression must produce one finite number.");
  }
  return `${expression} = ${value}`;
}

export function createCalculatorHandler() {
  return createMcpHandler(() => {
    const server = new McpServer({ name: "handbook-calculator", version: "1.0.0" });

    server.registerTool(
      "calculate",
      {
        description: "Evaluate a basic mathematical expression.",
        inputSchema: z.object({
          expression: z.string().min(1).describe("For example: (12 + 8) * 3"),
        }),
      },
      async ({ expression }) => ({
        content: [{ type: "text", text: calculateExpression(expression) }],
      }),
    );

    return server;
  });
}

export function startCalculatorServer(port = Number(process.env.PORT ?? 3000)) {
  const handler = createCalculatorHandler();
  const nodeHandler = toNodeHandler(handler);
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();

  const httpServer = createServer((req, res) => {
    if (req.url !== "/mcp") {
      res.writeHead(404).end("Not found");
      return;
    }
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    void nodeHandler(req, res);
  });

  httpServer.listen(port, "127.0.0.1", () => {
    console.log(`Calculator MCP server: http://127.0.0.1:${port}/mcp`);
  });

  const close = async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
    await handler.close();
  };
  const shutdown = () => void close().finally(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return { httpServer, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startCalculatorServer(Number(process.argv[2] ?? process.env.PORT ?? 3000));
}
