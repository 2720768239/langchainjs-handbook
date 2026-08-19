# Runnable Examples

These examples close the gap between the browser playground and real SDK usage.

## Real-model examples

Copy `.env.example` to `.env`, fill in a valid provider key, then run:

```bash
npm run example:first-call
npm run example:agent-memory
```

Both examples use the real `@langchain/openai`, `langchain`, and LangGraph packages. They may consume provider quota.

## MCP examples

The MCP servers use the real MCP TypeScript SDK and bind only to `127.0.0.1` with Host and Origin validation.

```bash
# Terminal 1: calculator server
npm run example:mcp

# Terminal 2: connect through LangChain's MCP adapter
npm run example:mcp:client
```

For the local RAG server:

```powershell
# Terminal 1
npm run example:mcp-rag

# Terminal 2
$env:MCP_URL="http://127.0.0.1:3001/mcp"
npm run example:mcp:client
```

The RAG server uses the real LangChain `MemoryVectorStore` with deterministic local hash embeddings. This keeps the server reproducible and key-free; replace `HashEmbeddings` with a provider embedding class for production.

Run `npm run test:samples` to verify both pure behavior and real HTTP MCP client/server connections without calling a model.
