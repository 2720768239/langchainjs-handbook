import assert from "node:assert/strict";
import { calculateExpression } from "../examples/basic-mcp-server";
import { addKnowledgeDocument, searchDocuments } from "../examples/mcp-rag-server/index";

assert.equal(calculateExpression("(12 + 8) * 3"), "(12 + 8) * 3 = 60");

const initial = await searchDocuments("agent decides retrieval", 1);
assert.equal(initial.length, 1);
assert.match(initial[0].content, /Agentic RAG/i);
assert.ok(initial[0].source);

await addKnowledgeDocument("TypeScript uses structural typing.", "test-document");
const added = await searchDocuments("TypeScript structural typing", 1);
assert.equal(added[0].source, "test-document");

console.log("Runnable example checks passed.");
