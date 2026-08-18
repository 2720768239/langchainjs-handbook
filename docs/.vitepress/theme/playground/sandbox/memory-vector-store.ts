import { Document } from "@langchain/core/documents";
import { cosineSimilarity } from "./fake-embeddings";

interface EmbeddingsLike {
  embedQuery(text: string): Promise<number[]>;
  embedDocuments(texts: string[]): Promise<number[][]>;
}

/**
 * MemoryVectorStore 的轻量实现，API 与 @langchain/classic/vectorstores/memory 保持一致：
 * fromDocuments / addDocuments / similaritySearch / similaritySearchWithScore / asRetriever
 */
export class MemoryVectorStore {
  private entries: { doc: Document; vector: number[] }[] = [];

  constructor(public embeddings: EmbeddingsLike) {}

  static async fromDocuments(
    docs: Document[],
    embeddings: EmbeddingsLike,
  ): Promise<MemoryVectorStore> {
    const store = new MemoryVectorStore(embeddings);
    await store.addDocuments(docs);
    return store;
  }

  static async fromTexts(
    texts: string[],
    metadatas: Record<string, unknown>[] | Record<string, unknown>,
    embeddings: EmbeddingsLike,
  ): Promise<MemoryVectorStore> {
    const docs = texts.map(
      (pageContent, i) =>
        new Document({
          pageContent,
          metadata: Array.isArray(metadatas) ? (metadatas[i] ?? {}) : metadatas,
        }),
    );
    return MemoryVectorStore.fromDocuments(docs, embeddings);
  }

  async addDocuments(docs: Document[]): Promise<void> {
    const vectors = await this.embeddings.embedDocuments(docs.map((d) => d.pageContent));
    docs.forEach((doc, i) => this.entries.push({ doc, vector: vectors[i] }));
  }

  async similaritySearchWithScore(query: string, k = 4): Promise<[Document, number][]> {
    const queryVec = await this.embeddings.embedQuery(query);
    return this.entries
      .map((e): [Document, number] => [e.doc, cosineSimilarity(queryVec, e.vector)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
  }

  async similaritySearch(query: string, k = 4): Promise<Document[]> {
    const scored = await this.similaritySearchWithScore(query, k);
    return scored.map(([doc]) => doc);
  }

  asRetriever(options?: { k?: number } | number) {
    const k = typeof options === "number" ? options : (options?.k ?? 4);
    const search = (query: string) => this.similaritySearch(query, k);
    return {
      invoke: search,
      getRelevantDocuments: search,
    };
  }
}
