import assert from "node:assert/strict";
import { once } from "node:events";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { startCalculatorServer } from "../examples/basic-mcp-server";
import { startRagServer } from "../examples/mcp-rag-server/index";

async function withClient(
  url: string,
  verify: (tools: Awaited<ReturnType<MultiServerMCPClient["getTools"]>>) => Promise<void>,
) {
  const client = new MultiServerMCPClient({ handbook: { transport: "http", url } });
  try {
    await verify(await client.getTools());
  } finally {
    await client.close();
  }
}

const calculatorServer = startCalculatorServer(3310);
await once(calculatorServer.httpServer, "listening");
try {
  await withClient("http://127.0.0.1:3310/mcp", async (tools) => {
    const calculator = tools.find((tool) => tool.name === "calculate");
    assert.ok(calculator);
    assert.equal(await calculator.invoke({ expression: "6 * 7" }), "6 * 7 = 42");
  });
} finally {
  await calculatorServer.close();
}

const ragServer = startRagServer(3311);
await once(ragServer.httpServer, "listening");
try {
  await withClient("http://127.0.0.1:3311/mcp", async (tools) => {
    const search = tools.find((tool) => tool.name === "search_documents");
    assert.ok(search);
    const result = await search.invoke({ query: "Agentic RAG retrieval", limit: 1 });
    assert.match(String(result), /handbook-rag-notes/);
  });
} finally {
  await ragServer.close();
}

console.log("MCP HTTP client/server checks passed.");
