/**
 * 确定性模拟 Embedding：基于词袋哈希生成向量。
 * 共享词汇越多的文本，余弦相似度越高——足以在离线环境演示语义检索的完整流程。
 */

const DIM = 128;

function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % DIM;
}

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];
  // 拉丁词与数字
  for (const m of lower.matchAll(/[a-z0-9]+/g)) tokens.push(m[0]);
  // 中日韩字符：单字 + 二元组，提升中文文本的区分度
  const cjk = lower.match(/[\u4e00-\u9fff]/g) ?? [];
  tokens.push(...cjk);
  for (let i = 0; i < cjk.length - 1; i++) tokens.push(cjk[i] + cjk[i + 1]);
  return tokens;
}

export function embedText(text: string): number[] {
  const vec = new Array(DIM).fill(0);
  for (const token of tokenize(text)) {
    vec[hashToken(token)] += 1;
  }
  // L2 归一化
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("两个向量维度不一致");
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export class FakeEmbeddings {
  constructor(_fields?: Record<string, unknown>) {}

  async embedQuery(text: string): Promise<number[]> {
    await new Promise((r) => setTimeout(r, 5));
    return embedText(text);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    await new Promise((r) => setTimeout(r, 5));
    return texts.map(embedText);
  }
}

export const OpenAIEmbeddings = FakeEmbeddings;
export const AzureOpenAIEmbeddings = FakeEmbeddings;
