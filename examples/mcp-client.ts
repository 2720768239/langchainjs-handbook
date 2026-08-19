import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const url = process.env.MCP_URL ?? "http://127.0.0.1:3000/mcp";
const client = new MultiServerMCPClient({
  handbook: { transport: "http", url },
});

try {
  const tools = await client.getTools();
  console.log("Tools:", tools.map((tool) => tool.name).join(", "));

  const calculator = tools.find((tool) => tool.name === "calculate");
  if (calculator) console.log(await calculator.invoke({ expression: "(12 + 8) * 3" }));

  const search = tools.find((tool) => tool.name === "search_documents");
  if (search) console.log(await search.invoke({ query: "Agentic RAG retrieval", limit: 2 }));
} finally {
  await client.close();
}
