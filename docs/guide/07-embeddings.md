# 07. 文档、Embedding 与语义搜索

> 🎯 打通「加载文档 → 分块 → 向量化 → 语义搜索」完整流水线，为下一章的 Agentic RAG 打好地基。

::: tip 本章速览
- `Document` 是 LangChain 处理文本的基本单元：`pageContent` + `metadata`
- 加载器把 PDF / 网页 / 文本统一成 `Document`；测试用 `MemoryVectorStore`，生产换持久化库
- 长文档必须分块：`RecursiveCharacterTextSplitter` 配 `chunkSize` / `chunkOverlap`
- **Embedding** 把文本变成语义向量——相似含义产生相似向量
- **余弦相似度**衡量向量间的语义接近程度（文本场景首选指标）
- `MemoryVectorStore` + `similaritySearch()`：几行代码实现按含义搜索
- 批量 `embedDocuments()` 比逐条 `embedQuery()` 快 5~10 倍
:::

## 智能图书馆类比

想象你在运营一座现代化图书馆。有人捐来一部 2000 页的百科全书，你不能把整本书直接塞给读者，也不能撕几张随机页面应付——正确做法是：

1. **加载**：把书收进馆里（文档加载）
2. **分章**：拆成可管理的章节，且章节间保留一点重叠以免上下文断裂（分块）
3. **贴标签**：给每部分标注来源、类别（元数据）
4. **智能索引**：给每个章节打上代表**含义**的「数字标签」，读者问「植物如何产生能量？」时，系统按含义匹配到光合作用章节——哪怕问句里一个原词都没出现（Embedding + 语义搜索）

![智能图书馆类比：左边整理文档分块，右边按含义做语义搜索](/images/07-documents-embeddings-semantic-search/library-system-analogy.webp)

为什么必须这么做？因为 LLM 有上下文窗口限制，一次只能处理有限的文本。文档处理负责把内容准备好，语义搜索负责按*含义*（而不是关键词）找到需要的那部分。

## 文档加载：Document 结构

数据格式五花八门（文本、PDF、网页、JSON/CSV），**文档加载器（Document Loader）** 负责屏蔽这些差异，统一输出 `Document` 对象：

```ts
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

const loader = new TextLoader("./data/sample.txt");
const docs = await loader.load();   // 永远返回 Document 数组（即使只有一个文件）

console.log(docs[0].pageContent);   // 实际文本内容
console.log(docs[0].metadata);      // { source: './data/sample.txt' }
```

每个 `Document` 只有两个核心属性：

- **`pageContent`**：文本内容本身
- **`metadata`**：关于文档的信息（来源路径、类别、日期、作者……），加载器会自动填入 `source`

::: tip 导入路径说明
课程使用 `@langchain/classic` 系列导入（如 `@langchain/classic/document_loaders/fs/text`）。如果你看到旧教程用别的路径，以 `@langchain/classic` 为准。
:::

真实项目很少只有一份 `.txt`。加载器实现同一个接口（`load()` 返回 `Document[]`），换格式通常只换导入：

| 来源 | 常用加载器 | 说明 |
|------|-----------|------|
| 纯文本 | `TextLoader` | 本章示例 |
| PDF | `PDFLoader`（`@langchain/community`） | 说明书、论文、合同 |
| 网页 | `CheerioWebBaseLoader` | 抓公开文档站 |
| 目录 | `DirectoryLoader` | 一次灌入整个文件夹 |

完整列表见[文档加载器集成](https://docs.langchain.com/oss/javascript/integrations/document_loaders)。选型原则：**先统一成 `Document`，再谈分块。**

![文档处理流水线：加载 → 分块 → Embedding → 向量存储 → 语义搜索](/images/07-documents-embeddings-semantic-search/document-processing-pipeline.webp)

## 文本分块：chunkSize 与 chunkOverlap

### 为什么要分块？

- **上下文限制**：模型一次只能处理约 4K~128K token
- **检索精度**：块越小，检索命中越精准
- **成本**：更小的输入 = 更低的 API 费用

### 基本用法

```ts
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 300,     // 每块目标大小（字符数）
  chunkOverlap: 50,   // 相邻块之间的重叠（保持上下文连续）
});

const docs = await splitter.createDocuments([longText]);
// 得到一组 ~300 字符的 Document，相邻块共享 50 个字符
```

`RecursiveCharacterTextSplitter` 是推荐选择：它**先按段落切，切不动再按句子，最后才按单词**，尽量保持语义结构完整。相比之下 `CharacterTextSplitter` 只是机械按字符数切，`TokenTextSplitter` 则按 token 数切（对模型限制更精确）。

### chunkSize 的权衡

| 小块（200~500 字符） | 大块（1000~2000 字符） |
|---------------------|----------------------|
| ✅ 检索更精确 | ✅ 保留更多上下文 |
| ✅ 适合具体问题 | ✅ 适合复杂主题 |
| ❌ 可能丢失上下文 | ❌ 匹配不够精准 |

**实用起点**：`chunkSize: 500` + `chunkOverlap: 100`（20% 重叠）。然后根据效果调整——结果太少就加大块、结果太泛就减小块、边界上下文断裂就加大重叠。

### 为什么需要重叠？

想象在句子中间切断 "The mitochondria is the | powerhouse of the cell"：

- **无重叠**（`chunkOverlap: 0`）：块 1 以 "...is the" 结尾，块 2 以 "powerhouse..." 开头——两个块都失去了完整含义
- **有重叠**：两个块都包含 "is the powerhouse"，语义得以保留

```ts
// 对比实验：同一段文本，两种切法
const noOverlap = new RecursiveCharacterTextSplitter({
  chunkSize: 100,
  chunkOverlap: 0,    // 边界处上下文直接断裂
});
const withOverlap = new RecursiveCharacterTextSplitter({
  chunkSize: 100,
  chunkOverlap: 20,   // 每块携带前一块的最后 20 个字符
});
```

推荐从块大小的 10~20% 开始，生产系统按内容类型在 10~50% 之间调优。

### 元数据在分块时自动保留

```ts
import { Document } from "@langchain/core/documents";

const doc = new Document({
  pageContent: "LangChain.js is a framework for building AI apps...",
  metadata: { source: "langchain-guide.md", category: "tutorial", date: "2024-01-15" },
});

const splitDocs = await splitter.splitDocuments([doc]);
// 每个子块都完整继承父文档的 metadata！
```

这让你之后可以按来源过滤搜索结果、追踪答案出处、甚至实现访问控制。

## Embedding：把含义变成数字

**Embedding（嵌入）是文本的数值表示**：输入一段文本，Embedding 模型输出一个向量（如 `[0.23, -0.41, 0.87, ..., 0.15]`，共 1536 个数字）。核心性质只有一条：

> **相似的含义 → 相似的向量；不同的含义 → 相距遥远的向量。**

"dog" 和 "cat" 的向量很接近（都是动物、宠物），"pizza" 则离它们很远。可以把 1536 维向量想象成语义空间中的坐标——类似（经度, 纬度），只是维度多得多。

![Embedding 可视化：相似含义的词聚在一起，无关概念相距遥远](/images/07-documents-embeddings-semantic-search/embeddings-visualization.webp)

```ts
import { OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";

const embeddings = new OpenAIEmbeddings({
  model: process.env.AI_EMBEDDING_MODEL,   // 如 text-embedding-3-small
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
});

const vector = await embeddings.embedQuery("LangChain makes building AI apps easier");
console.log(vector.length);   // 1536
```

::: details Embedding 的更多神奇性质
- **向量算术保留语义关系**：`Embedding("Puppy") - Embedding("Dog") + Embedding("Cat") ≈ Embedding("Kitten")`
- **跨语言有效**：多语言模型中 `Embedding("hello") ≈ Embedding("hola") ≈ Embedding("bonjour")`
- **理解上下文**："I'm feeling blue"（心情低落）和 "The sky is blue"（颜色）得到不同的向量
- **维度权衡**：`text-embedding-3-small` 1536 维，`text-embedding-3-large` 3072 维。维度越多理解越细腻，但成本和存储也更高——1536 维对多数应用已是最佳平衡点
:::

## 余弦相似度：度量语义距离

**余弦相似度（Cosine Similarity）** 衡量两个向量之间的夹角，是文本 Embedding 比较的首选指标：

```ts
// 1.0 = 完全相同，0.0 = 无关，-1.0 = 相反（文本场景通常落在 0~1）
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
}

const base = await embeddings.embedQuery("LangChain makes building AI apps easier");
const similar = await embeddings.embedQuery("LangChain simplifies AI development");
const different = await embeddings.embedQuery("I love pizza");

cosineSimilarity(base, similar);    // ≈ 0.89 —— 同一主题
cosineSimilarity(base, different);  // ≈ 0.12 —— 风马牛不相及
```

分数速查：**1.0** 完全相同｜**0.8~0.9** 非常相似｜**0.6~0.8** 有些相似｜**< 0.6** 不同主题。欧几里得距离、点积等指标也存在，但文本场景坚持用余弦相似度即可。

## 向量存储与语义搜索

有了几千个向量，如何快速找到最相似的？答案是**向量存储（Vector Store）**——为向量相似性搜索优化的数据库。开发测试用内存版 `MemoryVectorStore` 即可，生产可换 Chroma（本地）、Pinecone（云）、Weaviate、Qdrant 等。

```ts
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";

const docs = [
  new Document({ pageContent: "Cats are independent pets that love to nap." }),
  new Document({ pageContent: "Dogs are loyal companions that enjoy playing fetch." }),
  new Document({ pageContent: "Birds can sing beautiful songs and fly freely." }),
  new Document({ pageContent: "Fish are quiet pets that live in aquariums." }),
];

// fromDocuments 自动完成所有文档的 Embedding 并存储
const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

// 按含义搜索，返回最相似的 2 个文档
const results = await vectorStore.similaritySearch("animals that live indoors", 2);
// → 1. Fish are quiet pets that live in aquariums.
// → 2. Cats are independent pets that love to nap.
```

注意这个结果的精妙之处：**没有任何文档包含 "indoors" 或 "animals" 这两个词**，但语义搜索理解「水族箱里的鱼 → 室内」「打盹的猫 → 通常在室内」，而「自由飞翔的鸟」「玩接飞盘的狗」偏向室外。关键词搜索在这里会一无所获。

![关键词搜索只认字面匹配，语义搜索理解含义](/images/07-documents-embeddings-semantic-search/semantic-search-comparison.webp)

::: tip 从 MemoryVectorStore 迁到生产
`MemoryVectorStore` 进程一关数据就没了。接口是统一的：`fromDocuments` / `similaritySearch` / `asRetriever`，换存储通常只改导入和连接参数。常见选择：[Chroma](https://docs.langchain.com/oss/javascript/integrations/vectorstores)（本地）、Pinecone / Qdrant / Weaviate（云）。同一套知识库不要混用不同 Embedding 模型——向量空间不兼容。
:::

### 带分数的搜索

想知道每个结果到底匹配得多好，用 `similaritySearchWithScore()`：

```ts
const resultsWithScores = await vectorStore.similaritySearchWithScore(
  "pets that need less attention",
  4
);

// 返回 [document, score] 元组，分数越高越相似
resultsWithScores.forEach(([doc, score]) => {
  console.log(`Score: ${score.toFixed(3)} - ${doc.pageContent}`);
});
// Score: 0.812 - Fish are quiet pets that live in aquariums.
// Score: 0.794 - Cats are independent pets that love to nap.
// ...
```

典型用途：设置阈值过滤低质量结果（如只保留 score > 0.7）、按置信度排序展示。

## 批量 Embedding：性能优化

逐条创建 Embedding 每次都要一趟 API 往返，非常慢。**批量处理**一次搞定：

```ts
const texts = [
  "Machine learning is a subset of AI",
  "Deep learning uses neural networks",
  "Natural language processing handles text",
  "Computer vision processes images",
];

// ❌ 慢：逐条调用（每条 ~200ms，4 条共 ~800ms）
for (const text of texts) {
  await embeddings.embedQuery(text);
}

// ✅ 快：批量调用（总共 ~120ms，快 5~10 倍）
const batchEmbeddings = await embeddings.embedDocuments(texts);
```

经验法则：**单条查询用 `embedQuery()`，一批文档用 `embedDocuments()`**。`MemoryVectorStore.fromDocuments()` 内部就是批量处理的。

## ⚠️ 常见坑

| 坑 | 说明 |
|----|------|
| `chunkOverlap: 0` 导致答非所问 | 句子在块边界被拦腰切断，两个块都失去完整语义——始终保留 10~20% 重叠 |
| 块太大检索不准，块太小丢上下文 | 没有万能值，从 500/100 起步，根据实际检索效果迭代调整 |
| 循环里逐条 `embedQuery()` | 大批文本务必用 `embedDocuments()` 批量处理，速度差 5~10 倍 |
| 拿关键词思维评估语义搜索 | 语义搜索按含义匹配，查询词不在文档里出现是正常且正确的 |
| Chat 模型和 Embedding 模型混用 | 两者是不同的模型（如 `gpt-4o-mini` vs `text-embedding-3-small`），Embedding 要配置专门的 `AI_EMBEDDING_MODEL` |
| 比较不同模型产出的向量 | 不同 Embedding 模型的向量空间互不兼容，同一个库必须用同一个模型 |
| `MemoryVectorStore` 用于生产 | 它存在内存里，进程重启即丢失，只适合测试和小数据集；生产换 Pinecone/Chroma 等持久化存储 |

## ✅ 核心要点

- **`Document` = `pageContent` + `metadata`**，是全流程的基本数据单元；分块时元数据自动继承
- 换文档格式先换加载器（PDF / 网页 / 目录），接口都是 `load()` → `Document[]`
- **分块是权衡艺术**：`chunkSize` 平衡精度与上下文，`chunkOverlap`（10~20%）防止边界语义断裂
- **Embedding 把含义映射为向量**，相似含义 → 相似向量，这是语义搜索的全部基础
- **余弦相似度**是文本向量比较的标准指标（0~1，越高越相似）
- **向量存储 + `similaritySearch()`** 让「按含义找文档」只需几行代码；`MemoryVectorStore` 只适合测试
- **批量优先**：`embedDocuments()` 比循环 `embedQuery()` 快 5~10 倍
- 完整流水线：**加载 → 分块 → Embedding → 向量存储 → 语义搜索**——这正是下一章 RAG 系统的检索底座

## 🏋️ 动手练习

- [文本分块实战](/playground/?id=ch07-text-splitter)
- [实现语义搜索](/playground/?id=ch07-semantic-search)

## 📚 延伸阅读

- [文档加载器](https://docs.langchain.com/oss/javascript/integrations/document_loaders)
- [文本拆分器](https://docs.langchain.com/oss/javascript/integrations/splitters)
- [向量存储](https://docs.langchain.com/oss/javascript/integrations/vectorstores)
- [Embedding 模型](https://docs.langchain.com/oss/javascript/integrations/embeddings)
- [OpenAI Embeddings 指南](https://platform.openai.com/docs/guides/embeddings)
