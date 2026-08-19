import { Document } from "@langchain/core/documents";
import type { Exercise } from "../types";

const LONG_TEXT = [
  "LangChain 是一个用于构建大语言模型应用的开源框架，同时支持 Python 和 JavaScript 两种语言。",
  "它提供了统一的模型接口、提示词模板、工具调用、Agent 编排等能力，大幅降低了 AI 应用的开发门槛。",
  "在处理长文档时，我们需要先把文档切分成较小的块，因为模型的上下文窗口是有限的。",
  "切分时保留一定的重叠区域非常重要，这样可以避免关键信息恰好被切断在两个块的边界上。",
  "切分后的文本块会被转换成向量（Embedding），存入向量数据库，供后续的语义检索使用。",
  "检索时，系统会把用户的问题也转换成向量，然后找出与问题向量最相似的文本块作为上下文。",
].join("");

export const ch07Exercises: Exercise[] = [
  {
    id: "ch07-text-splitter",
    chapter: 7,
    chapterName: "文档、Embedding 与语义搜索",
    title: "文本分块：切分长文档",
    difficulty: "入门",
    guideLink: "/guide/07-embeddings",
    description: `
### 📋 题目

模型的上下文窗口有限，长文档必须先**切块（Chunking）**。
用**真实的** \`RecursiveCharacterTextSplitter\` 实现 \`splitArticle\`：

- \`chunkSize: 100\`（每块最多 100 字符）
- \`chunkOverlap: 20\`（相邻块重叠 20 字符，防止关键信息被拦腰切断）
- 用 \`splitter.splitText(text)\` 返回字符串数组

### 函数签名

\`\`\`ts
export async function splitArticle(text: string): Promise<string[]>
\`\`\`

### 期望行为

\`\`\`ts
const chunks = await splitArticle(长文本);
// => ["LangChain 是一个用于构建…", "…（每块 ≤ 100 字符，相邻块有重叠）", …]
\`\`\`

> 💡 \`RecursiveCharacterTextSplitter\` 是「智能切分」：优先按段落切，
> 段落太长再按句子、单词逐级降级，尽量保持语义完整。
`,
    starterCode: `import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function splitArticle(text: string): Promise<string[]> {
  // TODO: 创建 RecursiveCharacterTextSplitter
  //       配置 chunkSize: 100, chunkOverlap: 20
  //       调用 splitter.splitText(text)
  throw new Error("TODO: 请实现 splitArticle");
}
`,
    exampleCode: `// 课程示例：07-documents-embeddings-semantic-search/code/02-splitting.ts（精简版）
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

async function main() {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,   // 每块最大字符数
    chunkOverlap: 40, // 相邻块的重叠字符数
  });

  const text = "很长很长的文档内容……";

  // splitText 返回 string[]；createDocuments 返回 Document[]（带 metadata）
  const chunks = await splitter.splitText(text);

  chunks.forEach((chunk, i) => {
    console.log(\`块 \${i + 1}（\${chunk.length} 字符）: \${chunk.slice(0, 30)}…\`);
  });
}

main().catch(console.error);
`,
    solution: `import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function splitArticle(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 20,
  });
  return splitter.splitText(text);
}
`,
    hints: [
      "new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 20 })。",
      "splitText 是异步方法，返回 Promise<string[]>。",
    ],
    demo: async ({ exports, log }) => {
      if (typeof exports.splitArticle !== "function") {
        log("请先实现并导出 splitArticle(text)");
        return;
      }
      const chunks = await exports.splitArticle(LONG_TEXT);
      log(`原文 ${LONG_TEXT.length} 字符 → 切成 ${chunks.length} 块：`);
      chunks.forEach((chunk: string, i: number) => {
        log(`  块 ${i + 1}（${chunk.length} 字）: ${chunk.slice(0, 40)}…`);
      });
    },
    tests: [
      {
        name: "长文本被切成多个块",
        run: async ({ exports, expect }) => {
          const chunks = await exports.splitArticle(LONG_TEXT);
          expect(Array.isArray(chunks), "返回值是数组").toBe(true);
          expect(chunks.length, "块数量").toBeGreaterThan(2);
        },
      },
      {
        name: "每个块都不超过 100 字符",
        run: async ({ exports, expect }) => {
          const chunks = await exports.splitArticle(LONG_TEXT);
          for (const chunk of chunks) {
            expect(chunk.length, `块「${chunk.slice(0, 12)}…」的长度`).toBeLessThanOrEqual(100);
          }
        },
      },
      {
        name: "块内容来自原文（没有丢失或篡改内容）",
        run: async ({ exports, expect }) => {
          const chunks = await exports.splitArticle(LONG_TEXT);
          for (const chunk of chunks) {
            expect(LONG_TEXT.includes(chunk), `块「${chunk.slice(0, 12)}…」是原文的子串`).toBe(
              true,
            );
          }
        },
      },
    ],
  },
  {
    id: "ch07-semantic-search",
    chapter: 7,
    chapterName: "文档、Embedding 与语义搜索",
    title: "实现语义搜索：余弦相似度 + Top-K 检索",
    difficulty: "进阶",
    guideLink: "/guide/07-embeddings",
    description: `
### 📋 题目

语义搜索的核心只有两步：**把文本变成向量** + **算向量相似度**。这次不用现成的向量库，自己实现：

1. \`cosineSimilarity(a, b)\`：手写余弦相似度
   \`cos = (a·b) / (|a| × |b|)\`（点积除以模长乘积）
2. \`searchDocs(query, docs, k)\`：
   - 用 \`OpenAIEmbeddings\` 的 \`embedDocuments\` / \`embedQuery\` 生成向量
   - 用你的 \`cosineSimilarity\` 给每篇文档打分
   - 返回得分最高的前 k 篇 \`Document\`

### 函数签名

\`\`\`ts
export function cosineSimilarity(a: number[], b: number[]): number;
export async function searchDocs(query: string, docs: Document[], k?: number): Promise<Document[]>;
\`\`\`

### 期望行为

\`\`\`ts
cosineSimilarity([1, 0], [1, 0]); // => 1（方向相同）
cosineSimilarity([1, 0], [0, 1]); // => 0（正交，毫无关系）

await searchDocs("cats and pets", docs, 2);
// => 与查询语义最相关的 2 篇 Document
\`\`\`

> 💡 训练场的模拟 Embedding 基于词汇重叠——共享词越多相似度越高，
> 足以演示完整的检索流程。测试用的文档是英文的，词汇匹配更稳定。
`,
    starterCode: `import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

export function cosineSimilarity(a: number[], b: number[]): number {
  // TODO: 点积 / (模长a × 模长b)
  throw new Error("TODO: 请实现 cosineSimilarity");
}

export async function searchDocs(
  query: string,
  docs: Document[],
  k = 2,
): Promise<Document[]> {
  // TODO: 1. const embeddings = new OpenAIEmbeddings()
  // TODO: 2. embedDocuments(所有 pageContent) + embedQuery(query)
  // TODO: 3. 用 cosineSimilarity 打分，按分数降序取前 k 篇
  throw new Error("TODO: 请实现 searchDocs");
}
`,
    exampleCode: `// 课程示例：07-documents-embeddings-semantic-search/code/07-similarity-scores.ts（精简版）
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: process.env.AI_EMBEDDING_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

// 余弦相似度：两个向量方向越接近，值越接近 1
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const [v1, v2] = await embeddings.embedDocuments([
    "I love programming in TypeScript",
    "TypeScript is my favorite language",
  ]);
  console.log("相似度:", cosineSimilarity(v1, v2)); // 语义相近 → 分数高
}

main().catch(console.error);
`,
    solution: `import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function searchDocs(
  query: string,
  docs: Document[],
  k = 2,
): Promise<Document[]> {
  const embeddings = new OpenAIEmbeddings();

  const docVectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));
  const queryVector = await embeddings.embedQuery(query);

  return docs
    .map((doc, i) => ({ doc, score: cosineSimilarity(queryVector, docVectors[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((item) => item.doc);
}
`,
    hints: [
      "余弦相似度 = 点积 / (√Σa² × √Σb²)，一个 for 循环同时累加三个量即可。",
      "embedDocuments 接收 string[]，所以要先 docs.map(d => d.pageContent)。",
      "打分后 sort((a, b) => b.score - a.score) 降序，slice(0, k) 取前 k。",
    ],
    demo: async ({ exports, log }) => {
      if (
        typeof exports.cosineSimilarity !== "function" ||
        typeof exports.searchDocs !== "function"
      ) {
        log("请先实现并导出 cosineSimilarity 与 searchDocs");
        return;
      }
      log("cosineSimilarity([1,0],[1,0]) =", exports.cosineSimilarity([1, 0], [1, 0]));
      log("cosineSimilarity([1,0],[0,1]) =", exports.cosineSimilarity([1, 0], [0, 1]));
      const docs = [
        new Document({ pageContent: "Cats are independent pets that enjoy napping." }),
        new Document({ pageContent: "JavaScript is used for web development." }),
        new Document({ pageContent: "Machine learning finds patterns in data." }),
      ];
      const results = await exports.searchDocs("cats as pets", docs, 2);
      log("查询「cats as pets」Top-2：");
      results.forEach((doc: Document, i: number) => {
        log(`  #${i + 1}`, doc.pageContent);
      });
    },
    tests: [
      {
        name: "余弦相似度：相同方向 = 1，正交 = 0",
        run: ({ exports, expect }) => {
          expect(exports.cosineSimilarity([1, 0, 1], [1, 0, 1]), "相同向量").toBeCloseTo(1, 5);
          expect(exports.cosineSimilarity([1, 0], [0, 1]), "正交向量").toBeCloseTo(0, 5);
          expect(exports.cosineSimilarity([2, 0], [1, 0]), "同方向不同长度").toBeCloseTo(1, 5);
        },
      },
      {
        name: "语义检索：关于猫的查询应命中关于猫的文档",
        run: async ({ exports, expect }) => {
          const docs = [
            new Document({ pageContent: "Cats are independent pets that enjoy napping." }),
            new Document({ pageContent: "JavaScript is used for web development." }),
            new Document({ pageContent: "Machine learning finds patterns in data." }),
          ];
          const results = await exports.searchDocs("cats as pets", docs, 1);
          expect(results, "结果数量").toHaveLength(1);
          expect(results[0].pageContent, "最相关文档").toContain("Cats");
        },
      },
      {
        name: "返回 Top-K：k=2 时返回按相关度排序的 2 篇文档",
        run: async ({ exports, expect }) => {
          const docs = [
            new Document({ pageContent: "Python is popular for machine learning projects." }),
            new Document({ pageContent: "Machine learning algorithms learn from data." }),
            new Document({ pageContent: "Dogs love playing fetch in the park." }),
          ];
          const results = await exports.searchDocs("machine learning", docs, 2);
          expect(results, "结果数量").toHaveLength(2);
          for (const doc of results) {
            expect(doc.pageContent, "相关文档").toSatisfy(
              (text: string) => text.toLowerCase().includes("machine learning"),
              "内容与 machine learning 相关",
            );
          }
        },
      },
    ],
  },
];
