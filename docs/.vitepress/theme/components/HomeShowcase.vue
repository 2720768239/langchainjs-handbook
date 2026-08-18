<script setup lang="ts">
import { withBase } from "vitepress";



const steps = [
  { n: "01", title: "读笔记", desc: "每章 10–20 分钟：速览、关键代码、常见坑。" },
  { n: "02", title: "对照示例", desc: "看训练场左侧的课程精简示例，确认 API 怎么写。" },
  { n: "03", title: "提交测试", desc: "自己实现，浏览器里即时判题。进度存在本地。" },
];

const pathItems = [
  { id: "00–02", title: "模型与对话", hint: "invoke · 消息 · 流式" },
  { id: "03", title: "提示词", hint: "模板 · Few-shot · Zod" },
  { id: "04–06", title: "工具与 Agent", hint: "意图 → 执行 → ReAct · MCP" },
  { id: "07–08", title: "检索与 RAG", hint: "分块 · 向量 · Agentic RAG" },
];
</script>

<template>
  <section class="hs">


    <div class="hs-split">
      <div class="hs-copy">
        <p class="hs-kicker">为什么是这份笔记</p>
        <h2>把「看过」变成「写过」</h2>
        <p>
          微软原课程质量高，但英文长、必须先配密钥。这里做成知识点导向的中文手册，并配上
          LeetCode 式训练场：确定性模拟模型 + 真实 <code>@langchain/core</code> API，打开浏览器就能练。
        </p>
        <ul>
          <li>模型只生成调用意图，执行永远在你的代码里</li>
          <li>Agent 优先：工具 → Agent → 检索工具化 → Agentic RAG</li>
          <li>参考答案默认折叠，做完再对照</li>
        </ul>
      </div>
      <a class="hs-shot" :href="withBase('/playground/')">
        <img
          :src="withBase('/screenshots/playground.png')"
          width="1440"
          height="840"
          alt="训练场：左侧题目与示例，右侧编辑器，下方测试结果"
        />
        <span>打开训练场 →</span>
      </a>
    </div>

    <div class="hs-path">
      <p class="hs-kicker">学习路径</p>
      <h2>Agent 优先，九章走完</h2>
      <ol>
        <li v-for="item in pathItems" :key="item.id">
          <span class="hs-id">{{ item.id }}</span>
          <strong>{{ item.title }}</strong>
          <em>{{ item.hint }}</em>
        </li>
      </ol>
    </div>

    <div class="hs-steps">
      <article v-for="step in steps" :key="step.n">
        <span>{{ step.n }}</span>
        <h3>{{ step.title }}</h3>
        <p>{{ step.desc }}</p>
      </article>
    </div>

    <div class="hs-cta">
      <a class="hs-btn primary" :href="withBase('/guide/')">从学习路线图开始</a>
      <a class="hs-btn" :href="withBase('/playground/?id=ch01-hello-llm')">先做第一题</a>
    </div>
  </section>
</template>

<style scoped>
.hs {
  max-width: 1080px;
  margin: 0 auto;
  padding: 8px 24px 88px;
}
.hs-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}
.hs h2 {
  margin: 0 0 12px;
  font-size: 28px;
  line-height: 1.25;
  letter-spacing: -0.03em;
}

.hs-stat {
  padding: 22px 12px;
  text-align: center;
}
.hs-stat + .hs-stat {
  border-left: 1px solid var(--vp-c-divider);
}
.hs-stat-value {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--vp-c-brand-1);
  line-height: 1.1;
}
.hs-stat-label {
  margin-top: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.hs-split {
  display: grid;
  grid-template-columns: 0.9fr 1.2fr;
  gap: 40px;
  align-items: center;
  margin-bottom: 64px;
}
.hs-copy p {
  color: var(--vp-c-text-2);
  line-height: 1.75;
}
.hs-copy code {
  font-size: 0.92em;
}
.hs-copy ul {
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--vp-c-text-1);
  line-height: 1.9;
}
.hs-shot {
  display: block;
  text-decoration: none;
  color: var(--vp-c-text-2);
}
.hs-shot img {
  width: 100%;
  height: auto;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}
.hs-shot span {
  display: inline-block;
  margin-top: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
.hs-path ol {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  padding: 0;
  margin: 18px 0 48px;
  border-top: 1px solid var(--vp-c-divider);
}
.hs-path li {
  padding: 20px 16px 8px 0;
}
.hs-path li + li {
  padding-left: 16px;
  border-left: 1px solid var(--vp-c-divider);
}
.hs-id {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin-bottom: 8px;
}
.hs-path strong {
  display: block;
  font-size: 16px;
}
.hs-path em {
  display: block;
  margin-top: 6px;
  font-style: normal;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.hs-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  margin-bottom: 52px;
}
.hs-steps article {
  padding: 0;
}
.hs-steps span {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.hs-steps h3 {
  margin: 8px 0 6px;
  font-size: 18px;
}
.hs-steps p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.7;
}
.hs-cta {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.hs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 168px;
  padding: 11px 18px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  font-weight: 600;
  text-decoration: none;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}
.hs-btn.primary {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}
@media (max-width: 900px) {
  .hs-split,
  .hs-path ol,
  .hs-steps {
    grid-template-columns: 1fr;
  }
  .hs-stat + .hs-stat,
  .hs-path li + li {
    border-left: none;
    border-top: 1px solid var(--vp-c-divider);
    padding-left: 0;
  }
}
</style>
