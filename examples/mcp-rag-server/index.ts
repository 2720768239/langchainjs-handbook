import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const DIMENSIONS = 256;

function tokens(text: string): string[] {
  const normalized = text.toLowerCase();
  const latin = normalized.match(/[a-z0-9]+/g) ?? [];
  const cjk = normalized.match(/[\u4e00-\u9fff]/g) ?? [];
  const pairs = cjk.slice(0, -1).map((char, index) => char + cjk[index + 1]);
  return [...latin, ...cjk, ...pairs];
}

function hash(token: string): number {
  let value = 2166136261;
  for (const char of token) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value) % DIMENSIONS;
}

function embed(text: string): number[] {
  const vector = Array.from<number>({ length: DIMENSIONS }).fill(0);
  for (const token of tokens(text)) vector[hash(token)] += 1;
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  return vector.map((item) => item / norm);
}

class HashEmbeddings implements EmbeddingsInterface {
  async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map(embed);
  }

  async embedQuery(document: string): Promise<number[]> {
    return embed(document);
  }
}

const initialDocuments = [
  new Document({
    pageContent: "LangChain.js v1 uses createAgent as the standard agent API.",
    metadata: { source: "handbook-agent-notes" },
  }),
  new Document({
    pageContent: "MCP exposes tools and context through a standard protocol.",
    metadata: { source: "handbook-mcp-notes" },
  }),
  new Document({
    pageContent: "Agentic RAG lets an agent decide whether retrieval is needed.",
    metadata: { source: "handbook-rag-notes" },
  }),
];

const storePromise = MemoryVectorStore.fromDocuments(initialDocuments, new HashEmbeddings());

export async function addKnowledgeDocument(content: string, source: string) {
  const store = await storePromise;
  await store.addDocuments([new Document({ pageContent: content, metadata: { source } })]);
}

export async function searchDocuments(query: string, limit = 3) {
  const store = await storePromise;
  const results = await store.similaritySearchWithScore(query, limit);
  return results.map(([document, score]) => ({
    content: document.pageContent,
    source: String(document.metadata.source ?? "unknown"),
    score,
  }));
}

export function createRagHandler() {
  return createMcpHandler(() => {
    const server = new McpServer({ name: "handbook-rag", version: "1.0.0" });

    server.registerTool(
      "search_documents",
      {
        description: "Search the handbook knowledge base and return sources.",
        inputSchema: z.object({
          query: z.string().min(1),
          limit: z.number().int().min(1).max(5).default(3),
        }),
      },
      async ({ query, limit }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(await searchDocuments(query, limit), null, 2),
          },
        ],
      }),
    );

    server.registerTool(
      "add_document",
      {
        description: "Add one text document to the in-memory knowledge base.",
        inputSchema: z.object({
          content: z.string().min(1),
          source: z.string().min(1),
        }),
      },
      async ({ content, source }) => {
        await addKnowledgeDocument(content, source);
        return { content: [{ type: "text", text: `Added document from ${source}.` }] };
      },
    );

    return server;
  });
}

export function startRagServer(port = Number(process.env.PORT ?? 3001)) {
  const handler = createRagHandler();
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
    console.log(`RAG MCP server: http://127.0.0.1:${port}/mcp`);
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
  startRagServer(Number(process.argv[2] ?? process.env.PORT ?? 3001));
}
