<script setup lang="ts">
import { withBase } from "vitepress";

const pathItems = [
  { id: "00—02", title: "模型与对话", hint: "invoke · 消息 · 流式" },
  { id: "03", title: "提示词", hint: "模板 · Few-shot · Zod" },
  { id: "04—06", title: "工具与 Agent", hint: "工具调用 · ReAct · MCP" },
  { id: "07—08", title: "检索与 RAG", hint: "分块 · 向量 · Agentic RAG" },
];

const learningSteps = [
  {
    id: "01",
    title: "先读学习笔记",
    details: "用 10～20 分钟理解本章目标、关键 API 和常见误区。",
  },
  {
    id: "02",
    title: "再到训练场练习",
    details: "补全 TypeScript TODO，先观察运行输出，再用测试定位问题。",
  },
  {
    id: "03",
    title: "最后校准真实环境",
    details: "需要真实模型或 MCP 时，再运行仓库中的 SDK 示例。",
  },
];
</script>

<template>
  <div class="home-studio">
    <section class="hs-hero" aria-labelledby="home-title">
      <div class="hs-copy">
        <p class="hs-badge"><span aria-hidden="true"></span>零配置浏览器训练</p>
        <h1 id="home-title">从第一次调用，走到<span>会使用工具的 Agent</span>。</h1>
        <p class="hs-lead">
          面向中文开发者的 LangChain.js 学习路径：9 章学习笔记、15 道浏览器练习，以及可运行的真实
          SDK 示例。
        </p>
        <div class="hs-actions">
          <a class="hs-button primary" :href="withBase('/guide/01-introduction')"
            >阅读第一章 <span>→</span></a
          >
          <a class="hs-button" :href="withBase('/playground/?id=ch01-hello-llm')">开始第一道练习</a>
        </div>
        <ul class="hs-proof-list" aria-label="项目特点">
          <li>浏览器无需 API Key</li>
          <li>15 道练习即时判题</li>
          <li>真实 SDK 示例可运行</li>
        </ul>
      </div>

      <a class="hs-workspace" :href="withBase('/playground/')" aria-label="打开浏览器训练场">
        <div class="hs-window">
          <div class="hs-window-bar">
            <span class="hs-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <code>playground / ch01-hello-llm</code>
            <strong>OFFLINE · DETERMINISTIC</strong>
          </div>
          <img
            :src="withBase('/screenshots/playground.webp')"
            width="1440"
            height="840"
            alt="训练场真实界面：左侧题目、右侧代码编辑器、下方测试结果"
            fetchpriority="high"
          />
        </div>
        <span class="hs-open">打开训练场 <b>↗</b></span>
      </a>
    </section>

    <section class="hs-route" aria-labelledby="route-title">
      <div class="hs-route-title">
        <p>LEARNING PATH</p>
        <h2 id="route-title">9 章，从模型调用到 Agentic RAG</h2>
      </div>
      <ol>
        <li v-for="item in pathItems" :key="item.id">
          <code>{{ item.id }}</code>
          <strong>{{ item.title }}</strong>
          <span>{{ item.hint }}</span>
        </li>
      </ol>
    </section>

    <section class="hs-loop" aria-labelledby="loop-title">
      <header>
        <p class="hs-kicker">一套内容，两种运行环境</p>
        <h2 id="loop-title">笔记负责讲清，训练场负责练会。</h2>
        <p>每章先理解概念，再写代码验证；需要接入时，再切换到真实 SDK 示例。</p>
      </header>

      <div class="hs-loop-layout">
        <ol class="hs-steps">
          <li v-for="step in learningSteps" :key="step.id">
            <code>{{ step.id }}</code>
            <div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.details }}</p>
            </div>
          </li>
        </ol>

        <aside class="hs-boundary">
          <p class="hs-boundary-label">运行边界</p>
          <h3>浏览器练 API，仓库验行为。</h3>
          <p>
            训练场用本地替身模拟模型、Embedding、MCP
            与向量存储，便于稳定判题；真实网络与提供商行为请用仓库示例验证。
          </p>
          <a :href="withBase('/compatibility')">查看兼容性与运行说明 →</a>
        </aside>
      </div>
    </section>

    <section class="hs-final" aria-labelledby="final-title">
      <div>
        <p>READY TO BUILD</p>
        <h2 id="final-title">先读懂 <code>invoke()</code>，再亲手跑通它。</h2>
      </div>
      <div class="hs-final-actions">
        <a class="hs-button primary" :href="withBase('/guide/01-introduction')">阅读第一章</a>
        <a class="hs-text-link" :href="withBase('/guide/00-setup')">需要真实环境？先看第 00 章</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-studio {
  --hs-blue: var(--vp-c-brand-1);
  --hs-cyan: #17aeb8;
  --hs-ink: var(--vp-c-text-1);
  --hs-muted: var(--vp-c-text-2);
  --hs-line: var(--vp-c-divider);
  --hs-wash: var(--vp-c-bg-soft);
  --hs-panel: var(--vp-c-bg);
  --hs-shadow: color-mix(in srgb, var(--vp-c-text-1) 16%, transparent);
  color: var(--hs-ink);
  background: var(--vp-c-bg);
}

.hs-hero,
.hs-route,
.hs-loop,
.hs-final {
  width: min(1320px, 100%);
  margin: 0 auto;
  padding-right: 32px;
  padding-left: 32px;
}

.hs-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(520px, 1.18fr);
  gap: clamp(42px, 5vw, 76px);
  align-items: center;
  padding-top: 72px;
  padding-bottom: 62px;
}

.hs-copy {
  min-width: 0;
}

.hs-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--hs-blue) 34%, var(--hs-line));
  border-radius: 999px;
  color: var(--hs-blue);
  background: color-mix(in srgb, var(--hs-blue) 7%, var(--hs-panel));
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.hs-badge span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hs-cyan);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--hs-cyan) 17%, transparent);
}

.hs-copy h1 {
  max-width: 650px;
  margin: 24px 0 20px;
  font-size: clamp(50px, 4.7vw, 72px);
  font-weight: 800;
  line-height: 1.03;
  letter-spacing: -0.055em;
  text-wrap: balance;
}

.hs-copy h1 span {
  color: var(--hs-blue);
}

.hs-lead {
  max-width: 610px;
  margin: 0;
  color: var(--hs-muted);
  font-size: 17px;
  line-height: 1.82;
  text-wrap: pretty;
}

.hs-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.hs-button {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid var(--hs-line);
  border-radius: 8px;
  color: var(--hs-ink);
  background: var(--hs-panel);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.hs-button:hover {
  border-color: color-mix(in srgb, var(--hs-blue) 50%, var(--hs-line));
  transform: translateY(-1px);
}

.hs-button.primary {
  border-color: var(--hs-blue);
  color: #ffffff;
  background: var(--hs-blue);
  box-shadow: 0 9px 25px color-mix(in srgb, var(--hs-blue) 22%, transparent);
}

.hs-proof-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  margin: 25px 0 0;
  padding: 0;
  list-style: none;
  color: var(--hs-muted);
  font-size: 12px;
}

.hs-proof-list li::before {
  content: "✓";
  margin-right: 7px;
  color: var(--hs-cyan);
  font-weight: 900;
}

.hs-workspace {
  position: relative;
  display: block;
  min-width: 0;
  padding: 13px;
  border: 1px solid color-mix(in srgb, var(--hs-blue) 20%, var(--hs-line));
  border-radius: 16px;
  color: var(--hs-ink);
  background: color-mix(in srgb, var(--hs-blue) 7%, var(--hs-panel));
  box-shadow: 0 24px 70px var(--hs-shadow);
  text-decoration: none;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.hs-workspace::before {
  position: absolute;
  z-index: -1;
  bottom: -44px;
  left: -50px;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--hs-cyan) 16%, transparent);
  content: "";
}

.hs-workspace:hover {
  transform: translateY(-3px);
  box-shadow: 0 30px 78px var(--hs-shadow);
}

.hs-window {
  overflow: hidden;
  border: 1px solid var(--hs-line);
  border-radius: 10px;
  background: var(--hs-panel);
}

.hs-window-bar {
  display: flex;
  height: 39px;
  align-items: center;
  gap: 12px;
  padding: 0 13px;
  border-bottom: 1px solid var(--hs-line);
  background: color-mix(in srgb, var(--hs-wash) 78%, var(--hs-panel));
}

.hs-dots {
  display: flex;
  gap: 5px;
}

.hs-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--hs-muted) 55%, transparent);
}

.hs-window-bar code {
  overflow: hidden;
  color: var(--hs-muted);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hs-window-bar strong {
  margin-left: auto;
  color: var(--hs-cyan);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  white-space: nowrap;
}

.hs-window img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 12 / 6.7;
  object-fit: cover;
  object-position: top;
}

.hs-open {
  position: absolute;
  right: 22px;
  bottom: 22px;
  padding: 8px 10px;
  border: 1px solid var(--hs-line);
  border-radius: 7px;
  color: var(--hs-ink);
  background: color-mix(in srgb, var(--hs-panel) 92%, transparent);
  box-shadow: 0 8px 25px var(--hs-shadow);
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(8px);
}

.hs-open b {
  color: var(--hs-blue);
}

.hs-route {
  padding-bottom: 76px;
}

.hs-route {
  display: grid;
  grid-template-columns: 192px 1fr;
}

.hs-route-title {
  padding: 20px;
  border: 1px solid var(--hs-line);
  border-right: 0;
  border-radius: 12px 0 0 12px;
  background: var(--hs-wash);
}

.hs-route-title p,
.hs-kicker,
.hs-final > div > p {
  margin: 0;
  color: var(--hs-blue);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.hs-route-title h2 {
  margin: 8px 0 0;
  font-size: 16px;
  line-height: 1.4;
}

.hs-route ol {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--hs-line);
  border-radius: 0 12px 12px 0;
  list-style: none;
}

.hs-route li {
  min-width: 0;
  padding: 18px;
}

.hs-route li + li {
  border-left: 1px solid var(--hs-line);
}

.hs-route li code {
  color: var(--hs-cyan);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
}

.hs-route li strong,
.hs-route li span {
  display: block;
}

.hs-route li strong {
  margin: 8px 0 5px;
  font-size: 14px;
}

.hs-route li span {
  overflow: hidden;
  color: var(--hs-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hs-loop {
  padding-top: 84px;
  padding-bottom: 92px;
  border-top: 1px solid var(--hs-line);
}

.hs-loop > header {
  display: grid;
  grid-template-columns: 0.65fr 1.15fr 0.8fr;
  gap: 42px;
  align-items: start;
}

.hs-loop > header h2 {
  margin: -6px 0 0;
  font-size: clamp(30px, 3vw, 42px);
  line-height: 1.17;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

.hs-loop > header > p:last-child {
  margin: 0;
  color: var(--hs-muted);
  font-size: 14px;
  line-height: 1.75;
}

.hs-loop-layout {
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 40px;
  margin-top: 48px;
}

.hs-steps {
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--hs-line);
  list-style: none;
}

.hs-steps li {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 16px;
  padding: 23px 4px;
  border-bottom: 1px solid var(--hs-line);
}

.hs-steps code {
  color: var(--hs-cyan);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
}

.hs-steps h3 {
  margin: -3px 0 6px;
  font-size: 17px;
}

.hs-steps p {
  margin: 0;
  color: var(--hs-muted);
  font-size: 13px;
  line-height: 1.65;
}

.hs-boundary {
  align-self: stretch;
  padding: 30px;
  border: 1px solid var(--hs-line);
  border-radius: 12px;
  background: var(--hs-wash);
}

.hs-boundary-label {
  margin: 0;
  color: var(--hs-cyan);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.hs-boundary h3 {
  margin: 17px 0 12px;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.hs-boundary > p:not(.hs-boundary-label) {
  margin: 0;
  color: var(--hs-muted);
  font-size: 14px;
  line-height: 1.8;
}

.hs-boundary a {
  display: inline-block;
  margin-top: 24px;
  color: var(--hs-blue);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.hs-final {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 80px;
  padding-top: 42px;
  padding-bottom: 42px;
  border: 1px solid var(--hs-line);
  border-radius: 14px;
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--hs-blue) 8%, var(--hs-panel)),
    color-mix(in srgb, var(--hs-cyan) 8%, var(--hs-panel))
  );
}

.hs-final h2 {
  margin: 9px 0 0;
  font-size: clamp(25px, 2.5vw, 34px);
  letter-spacing: -0.035em;
}

.hs-final h2 code {
  color: var(--hs-blue);
  font-size: 0.84em;
}

.hs-final-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 20px;
}

.hs-text-link {
  color: var(--hs-blue);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

@media (max-width: 1020px) {
  .hs-hero {
    grid-template-columns: 1fr;
  }

  .hs-copy {
    max-width: 760px;
  }

  .hs-workspace {
    width: min(820px, 100%);
  }

  .hs-route {
    grid-template-columns: 1fr;
  }

  .hs-route-title {
    border-right: 1px solid var(--hs-line);
    border-bottom: 0;
    border-radius: 12px 12px 0 0;
  }

  .hs-route ol {
    border-radius: 0 0 12px 12px;
  }

  .hs-loop > header {
    grid-template-columns: 1fr 1.4fr;
  }

  .hs-loop > header > p:last-child {
    grid-column: 2;
  }
}

@media (max-width: 760px) {
  .hs-hero,
  .hs-route,
  .hs-loop,
  .hs-final {
    padding-right: 20px;
    padding-left: 20px;
  }

  .hs-hero {
    gap: 42px;
    padding-top: 44px;
    padding-bottom: 48px;
  }

  .hs-copy h1 {
    font-size: clamp(42px, 13vw, 58px);
    letter-spacing: -0.06em;
  }

  .hs-lead {
    font-size: 16px;
  }

  .hs-actions {
    align-items: stretch;
  }

  .hs-button {
    flex: 1 1 150px;
  }

  .hs-proof-list {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hs-workspace {
    padding: 9px;
  }

  .hs-window-bar {
    gap: 8px;
    padding: 0 10px;
  }

  .hs-window-bar strong {
    display: none;
  }

  .hs-open {
    display: none;
  }

  .hs-route ol {
    grid-template-columns: 1fr 1fr;
  }

  .hs-route li:nth-child(3) {
    border-left: 0;
  }

  .hs-route li:nth-child(n + 3) {
    border-top: 1px solid var(--hs-line);
  }

  .hs-route li span {
    white-space: normal;
  }

  .hs-loop {
    padding-top: 64px;
    padding-bottom: 68px;
  }

  .hs-loop > header,
  .hs-loop-layout {
    grid-template-columns: 1fr;
  }

  .hs-loop > header {
    gap: 19px;
  }

  .hs-loop > header > p:last-child {
    grid-column: auto;
  }

  .hs-loop-layout {
    gap: 30px;
    margin-top: 38px;
  }

  .hs-boundary {
    padding: 24px;
  }

  .hs-final {
    align-items: flex-start;
    flex-direction: column;
    margin: 0 20px 56px;
    padding-top: 30px;
    padding-bottom: 30px;
  }

  .hs-final-actions {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }

  .hs-text-link {
    text-align: center;
  }
}
</style>
