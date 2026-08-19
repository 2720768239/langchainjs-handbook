<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import MarkdownIt from "markdown-it";
import CodeEditor from "./CodeEditor.vue";
import { exercises, getExercise, groupByChapter } from "../playground/exercises";
import { PlaygroundRunner } from "../playground/client";
import type { ConsoleEvent, TestResultItem } from "../playground/types";

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

/* ---------------- 练习选择与代码持久化 ---------------- */
const groups = groupByChapter();
const currentId = ref(exercises[0].id);
const exercise = computed(() => getExercise(currentId.value) ?? exercises[0]);
const code = ref("");

const doneSet = ref<Set<string>>(new Set());
const DONE_KEY = "lcnote-pg-done";
const codeKey = (id: string) => `lcnote-pg-code-${id}`;

function loadCode(id: string) {
  const saved = localStorage.getItem(codeKey(id));
  code.value = saved ?? getExercise(id)?.starterCode ?? "";
}

function persistDone() {
  localStorage.setItem(DONE_KEY, JSON.stringify([...doneSet.value]));
}

const flatList = exercises.map((e) => e.id);
const currentIndex = computed(() => flatList.indexOf(currentId.value));

function goPrev() {
  if (currentIndex.value > 0) currentId.value = flatList[currentIndex.value - 1];
}
function goNext() {
  if (currentIndex.value < flatList.length - 1) currentId.value = flatList[currentIndex.value + 1];
}

/* ---------------- 左侧面板 ---------------- */
type LeftTab = "desc" | "example" | "solution";
const leftTab = ref<LeftTab>("desc");
const solutionRevealed = ref(false);
const revealedHints = ref(0);

const descriptionHtml = computed(() => md.render(exercise.value.description));

function loadSolutionIntoEditor() {
  if (
    code.value !== exercise.value.solution &&
    !confirm("载入参考答案会替换当前编辑器内容，是否继续？")
  ) {
    return;
  }
  code.value = exercise.value.solution;
  leftTab.value = "desc";
}

/* ---------------- 运行与测试 ---------------- */
type BottomTab = "tests" | "console";
const bottomTab = ref<BottomTab>("tests");
const running = ref(false);
const runMode = ref<"run" | "test" | null>(null);
const consoleLines = ref<{ level: string; text: string }[]>([]);
const testResults = ref<TestResultItem[] | null>(null);
const runError = ref<string | null>(null);
const durationMs = ref<number | null>(null);
const consoleEl = ref<HTMLElement | null>(null);

let runner: PlaygroundRunner | null = null;

function onConsole(e: ConsoleEvent) {
  consoleLines.value.push({ level: e.level, text: e.text });
  nextTick(() => {
    consoleEl.value?.scrollTo({ top: consoleEl.value.scrollHeight });
  });
}

async function execute(mode: "run" | "test") {
  if (!runner || running.value) return;
  running.value = true;
  runMode.value = mode;
  runError.value = null;
  durationMs.value = null;
  consoleLines.value = [];
  if (mode === "test") testResults.value = null;
  bottomTab.value = mode === "run" ? "console" : "tests";

  const result = await runner.run(mode, currentId.value, code.value);

  running.value = false;
  durationMs.value = result.durationMs;
  if (result.error) {
    runError.value = result.error;
    if (mode === "run") bottomTab.value = "console";
  }
  if (result.tests) {
    testResults.value = result.tests;
    if (result.ok) {
      doneSet.value.add(currentId.value);
      doneSet.value = new Set(doneSet.value);
      persistDone();
    }
  }
}

function stopRun() {
  runner?.stop();
}

function resetCode() {
  if (!confirm("确定重置为初始代码吗？当前编辑内容将丢失。")) return;
  code.value = exercise.value.starterCode;
  localStorage.removeItem(codeKey(currentId.value));
}

const passCount = computed(() => testResults.value?.filter((t) => t.pass).length ?? 0);
const allPassed = computed(
  () =>
    testResults.value !== null &&
    testResults.value.length > 0 &&
    passCount.value === testResults.value.length,
);

/* ---------------- 拖拽分栏 ---------------- */
const leftWidth = ref(42); // %
const bottomHeight = ref(38); // %
const bodyEl = ref<HTMLElement | null>(null);
const rightEl = ref<HTMLElement | null>(null);

function startDrag(axis: "x" | "y", event: PointerEvent) {
  event.preventDefault();
  const move = (e: PointerEvent) => {
    if (axis === "x" && bodyEl.value) {
      const rect = bodyEl.value.getBoundingClientRect();
      leftWidth.value = Math.min(65, Math.max(24, ((e.clientX - rect.left) / rect.width) * 100));
    } else if (axis === "y" && rightEl.value) {
      const rect = rightEl.value.getBoundingClientRect();
      bottomHeight.value = Math.min(
        75,
        Math.max(15, ((rect.bottom - e.clientY) / rect.height) * 100),
      );
    }
  };
  const up = () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
}

/* ---------------- 生命周期 ---------------- */
onMounted(() => {
  runner = new PlaygroundRunner(onConsole);
  try {
    const saved = JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]");
    doneSet.value = new Set(saved);
  } catch {
    /* 忽略损坏的存档 */
  }
  const urlId = new URLSearchParams(location.search).get("id");
  if (urlId && getExercise(urlId)) currentId.value = urlId;
  loadCode(currentId.value);
});

watch(currentId, (id) => {
  loadCode(id);
  leftTab.value = "desc";
  solutionRevealed.value = false;
  revealedHints.value = 0;
  testResults.value = null;
  consoleLines.value = [];
  runError.value = null;
  durationMs.value = null;
  const url = new URL(location.href);
  url.searchParams.set("id", id);
  history.replaceState(null, "", url.toString());
});

watch(code, (value) => {
  if (value && value !== exercise.value.starterCode) {
    localStorage.setItem(codeKey(currentId.value), value);
  }
});

onBeforeUnmount(() => {
  runner?.dispose();
  runner = null;
});

const difficultyClass = computed(() => {
  return { 入门: "easy", 基础: "medium", 进阶: "hard" }[exercise.value.difficulty];
});
</script>

<template>
  <div class="pg">
    <!-- 工具栏 -->
    <header class="pg-toolbar">
      <div class="pg-toolbar-group">
        <button class="pg-nav-btn" :disabled="currentIndex === 0" title="上一题" @click="goPrev">
          ‹
        </button>
        <select v-model="currentId" class="pg-select" aria-label="选择练习">
          <optgroup
            v-for="group in groups"
            :key="group.chapter"
            :label="`第 ${group.chapter} 章 · ${group.chapterName}`"
          >
            <option v-for="item in group.items" :key="item.id" :value="item.id">
              {{ doneSet.has(item.id) ? "✓" : "○" }} {{ item.title }}（{{ item.difficulty }}）
            </option>
          </optgroup>
        </select>
        <button
          class="pg-nav-btn"
          :disabled="currentIndex === flatList.length - 1"
          title="下一题"
          @click="goNext"
        >
          ›
        </button>
        <span class="pg-badge" :class="difficultyClass">{{ exercise.difficulty }}</span>
        <a class="pg-guide-link" :href="exercise.guideLink" title="阅读对应章节的学习笔记">
          阅读对应笔记
        </a>
      </div>
      <div class="pg-toolbar-group">
        <span class="pg-progress">已完成 {{ doneSet.size }}/{{ exercises.length }}</span>
        <span
          class="pg-sim-hint"
          title="模型、Embedding、MCP 与向量存储使用本地替身；真实网络和提供商行为请用仓库示例验证"
          >本地模拟 · 无需 API Key</span
        >
        <button class="pg-btn" :disabled="running" @click="execute('run')">运行代码</button>
        <button class="pg-btn primary" :disabled="running" @click="execute('test')">
          运行测试
        </button>
        <button v-if="running" class="pg-btn danger" @click="stopRun">■ 停止</button>
        <button class="pg-btn ghost" :disabled="running" title="重置为初始代码" @click="resetCode">
          ↺
        </button>
      </div>
    </header>

    <!-- 主体 -->
    <div ref="bodyEl" class="pg-body">
      <!-- 左侧：题目 / 示例 / 答案 -->
      <aside class="pg-left" :style="{ width: leftWidth + '%' }">
        <nav class="pg-tabs">
          <button :class="{ active: leftTab === 'desc' }" @click="leftTab = 'desc'">题目</button>
          <button :class="{ active: leftTab === 'example' }" @click="leftTab = 'example'">
            示例代码
          </button>
          <button :class="{ active: leftTab === 'solution' }" @click="leftTab = 'solution'">
            参考答案
          </button>
        </nav>

        <div v-show="leftTab === 'desc'" class="pg-panel pg-desc vp-doc">
          <h2 class="pg-title">{{ exercise.title }}</h2>
          <p class="pg-task-flow">
            <strong>完成顺序</strong><span>读题</span><i>→</i><span>补全 TODO</span><i>→</i
            ><span>运行代码</span><i>→</i><span>运行测试</span>
          </p>
          <div v-html="descriptionHtml" />
          <div v-if="exercise.hints.length" class="pg-hints">
            <h4>💡 提示（卡住了再看）</h4>
            <div
              v-for="(hint, i) in exercise.hints.slice(0, revealedHints)"
              :key="i"
              class="pg-hint"
            >
              {{ i + 1 }}. {{ hint }}
            </div>
            <button
              v-if="revealedHints < exercise.hints.length"
              class="pg-btn ghost small"
              @click="revealedHints++"
            >
              查看提示 {{ revealedHints + 1 }}/{{ exercise.hints.length }}
            </button>
          </div>
        </div>

        <div v-show="leftTab === 'example'" class="pg-panel pg-code-panel">
          <div v-if="exercise.exampleCode" class="pg-example-note">
            这是相关 API
            的<strong>用法示例</strong>，不一定直接解答本题。请按「题目」要求实现导出函数，再用「运行代码」观察输出或用「运行测试」检查结果。
          </div>
          <div v-if="exercise.exampleCode" class="pg-code-view">
            <CodeEditor :model-value="exercise.exampleCode" readonly />
          </div>
          <p v-else class="pg-empty">本题没有配套示例代码，直接看题目描述动手吧！</p>
        </div>

        <div v-show="leftTab === 'solution'" class="pg-panel pg-code-panel">
          <div v-if="!solutionRevealed" class="pg-solution-gate">
            <p>建议先补全 TODO；卡住时逐条查看提示，最后再对照参考答案。</p>
            <button class="pg-btn" @click="solutionRevealed = true">查看参考答案</button>
          </div>
          <template v-else>
            <div class="pg-solution-actions">
              <button class="pg-btn ghost small" @click="loadSolutionIntoEditor">载入编辑器</button>
            </div>
            <div class="pg-code-view">
              <CodeEditor :model-value="exercise.solution" readonly />
            </div>
          </template>
        </div>
      </aside>

      <div class="pg-splitter-x" @pointerdown="startDrag('x', $event)" />

      <!-- 右侧：编辑器 + 结果 -->
      <main ref="rightEl" class="pg-right">
        <div class="pg-editor-wrap" :style="{ height: `calc(${100 - bottomHeight}% - 3px)` }">
          <div class="pg-editor-head">
            <span class="pg-filename">solution.ts</span>
            <span class="pg-editor-tip">⌘/Ctrl+Z 撤销 · Tab 缩进 · 代码自动保存</span>
          </div>
          <div class="pg-editor-body">
            <CodeEditor v-model="code" />
          </div>
        </div>

        <div class="pg-splitter-y" @pointerdown="startDrag('y', $event)" />

        <section class="pg-bottom" :style="{ height: bottomHeight + '%' }">
          <nav class="pg-tabs">
            <button :class="{ active: bottomTab === 'tests' }" @click="bottomTab = 'tests'">
              测试结果
              <span v-if="testResults" class="pg-count" :class="{ ok: allPassed }">
                {{ passCount }}/{{ testResults.length }}
              </span>
            </button>
            <button :class="{ active: bottomTab === 'console' }" @click="bottomTab = 'console'">
              控制台
              <span v-if="consoleLines.length" class="pg-count">{{ consoleLines.length }}</span>
            </button>
            <span class="pg-status">
              <template v-if="running">⏳ {{ runMode === "test" ? "测试" : "运行" }}中…</template>
              <template v-else-if="durationMs !== null">耗时 {{ durationMs }}ms</template>
            </span>
          </nav>

          <!-- 测试结果 -->
          <div v-show="bottomTab === 'tests'" class="pg-panel">
            <div v-if="runError" class="pg-run-error">
              <strong>执行出错</strong>
              <pre>{{ runError }}</pre>
            </div>
            <div v-else-if="!testResults" class="pg-empty">
              点击右上角「运行测试」检查实现是否满足题目要求。<br />
              「运行代码」会执行本题演示（或你导出的 main），输出显示在「控制台」。
            </div>
            <template v-else>
              <div v-if="allPassed" class="pg-all-pass">
                全部测试通过。你可以到「参考答案」中比较不同的实现方式。
              </div>
              <div
                v-for="(test, i) in testResults"
                :key="i"
                class="pg-test"
                :class="test.pass ? 'pass' : 'fail'"
              >
                <div class="pg-test-head">
                  <span>{{ test.pass ? "✅" : "❌" }}</span>
                  <span class="pg-test-name">{{ test.name }}</span>
                </div>
                <div v-if="!test.pass && test.message" class="pg-test-detail">
                  <pre class="pg-test-msg">{{ test.message }}</pre>
                  <div v-if="test.expected !== undefined" class="pg-diff">
                    <div class="pg-diff-col expected">
                      <span>期望</span>
                      <pre>{{ test.expected }}</pre>
                    </div>
                    <div class="pg-diff-col actual">
                      <span>实际</span>
                      <pre>{{ test.actual }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 控制台 -->
          <div v-show="bottomTab === 'console'" ref="consoleEl" class="pg-panel pg-console">
            <div v-if="runError" class="pg-run-error">
              <strong>执行出错</strong>
              <pre>{{ runError }}</pre>
            </div>
            <div v-if="!consoleLines.length && !runError" class="pg-empty">
              暂无输出。点击「运行代码」会执行本题的典型输入；也可以导出
              <code>main()</code>，并用 <code>console.log</code> 打印结果。
            </div>
            <div
              v-for="(line, i) in consoleLines"
              :key="i"
              class="pg-console-line"
              :class="line.level"
            >
              <pre>{{ line.text }}</pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.pg {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--vp-nav-height));
  background: var(--vp-c-bg);
  font-size: 14px;
}

/* ---------- 工具栏 ---------- */
.pg-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
}
.pg-toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.pg-select {
  max-width: 320px;
  padding: 6px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
}
.pg-nav-btn {
  width: 28px;
  height: 30px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 16px;
  cursor: pointer;
}
.pg-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pg-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.pg-badge.easy {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
}
.pg-badge.medium {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}
.pg-badge.hard {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}
.pg-guide-link {
  font-size: 13px;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.pg-guide-link:hover {
  text-decoration: underline;
}
.pg-progress {
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  margin-right: 4px;
}
.pg-sim-hint {
  font-size: 11.5px;
  color: var(--vp-c-text-3);
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  margin-right: 4px;
}
.pg-btn {
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.pg-btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.pg-btn.primary {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}
.pg-btn.primary:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
  color: #fff;
}
.pg-btn.danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}
.pg-btn.ghost {
  background: transparent;
}
.pg-btn.small {
  padding: 4px 10px;
  font-size: 12.5px;
}
.pg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- 主体布局 ---------- */
.pg-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.pg-left {
  display: flex;
  flex-direction: column;
  min-width: 240px;
  border-right: none;
}
.pg-splitter-x {
  width: 6px;
  cursor: col-resize;
  background: var(--vp-c-divider);
  opacity: 0.5;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.pg-splitter-x:hover {
  opacity: 1;
  background: var(--vp-c-brand-1);
}
.pg-right {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.pg-splitter-y {
  height: 6px;
  cursor: row-resize;
  background: var(--vp-c-divider);
  opacity: 0.5;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.pg-splitter-y:hover {
  opacity: 1;
  background: var(--vp-c-brand-1);
}

/* ---------- 标签页 ---------- */
.pg-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}
.pg-tabs button {
  padding: 8px 14px;
  border: none;
  background: none;
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pg-tabs button.active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
  font-weight: 600;
}
.pg-count {
  padding: 0 7px;
  border-radius: 8px;
  background: var(--vp-c-default-soft);
  font-size: 11.5px;
}
.pg-count.ok {
  background: rgba(16, 185, 129, 0.18);
  color: #059669;
}
.pg-status {
  margin-left: auto;
  font-size: 12px;
  color: var(--vp-c-text-3);
  padding-right: 8px;
}

/* ---------- 面板 ---------- */
.pg-panel {
  flex: 1;
  overflow: auto;
  padding: 14px 18px;
  min-height: 0;
}
.pg-code-panel {
  padding: 0;
  display: flex;
  flex-direction: column;
}
.pg-example-note {
  flex-shrink: 0;
  margin: 10px 12px 0;
  padding: 8px 12px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border-left: 3px solid var(--vp-c-brand-1);
}
.pg-code-view {
  flex: 1;
  min-height: 0;
}
.pg-title {
  margin: 0 0 10px;
  font-size: 19px;
  font-weight: 700;
  border: none;
  padding: 0;
}
.pg-task-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 14px;
  padding: 8px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  font-size: 12px;
  line-height: 1.4;
}
.pg-task-flow strong {
  margin-right: 2px;
  color: var(--vp-c-text-1);
}
.pg-task-flow i {
  color: var(--vp-c-text-3);
  font-style: normal;
}
.pg-desc :deep(h3) {
  margin: 18px 0 8px;
  font-size: 15px;
}
.pg-desc :deep(p),
.pg-desc :deep(li) {
  font-size: 13.8px;
  line-height: 1.75;
}
.pg-desc :deep(pre) {
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
  font-size: 12.8px;
  line-height: 1.6;
}
.pg-desc :deep(code) {
  font-size: 0.92em;
}
.pg-desc :deep(blockquote) {
  border-left: 3px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  padding: 8px 14px;
  border-radius: 0 8px 8px 0;
  margin: 12px 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
.pg-hints {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px dashed var(--vp-c-divider);
}
.pg-hints h4 {
  margin: 0 0 8px;
  font-size: 13.5px;
}
.pg-hint {
  font-size: 13.5px;
  color: var(--vp-c-text-2);
  padding: 6px 0;
  line-height: 1.6;
}
.pg-solution-gate {
  margin: auto;
  text-align: center;
  color: var(--vp-c-text-2);
  padding: 32px;
}
.pg-solution-gate p {
  margin-bottom: 16px;
}
.pg-solution-actions {
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.pg-empty {
  color: var(--vp-c-text-3);
  font-size: 13.5px;
  line-height: 1.9;
  padding: 18px;
  text-align: center;
}

/* ---------- 编辑器 ---------- */
.pg-editor-wrap {
  display: flex;
  flex-direction: column;
  min-height: 80px;
}
.pg-editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}
.pg-filename {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}
.pg-editor-tip {
  font-size: 11.5px;
  color: var(--vp-c-text-3);
}
.pg-editor-body {
  flex: 1;
  min-height: 0;
}

/* ---------- 底部结果区 ---------- */
.pg-bottom {
  display: flex;
  flex-direction: column;
  min-height: 80px;
}
.pg-all-pass {
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  font-weight: 600;
  font-size: 13.5px;
}
.pg-test {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}
.pg-test.pass {
  border-color: rgba(16, 185, 129, 0.35);
}
.pg-test.fail {
  border-color: rgba(239, 68, 68, 0.4);
}
.pg-test-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13.5px;
}
.pg-test-name {
  font-weight: 500;
}
.pg-test-detail {
  padding: 0 12px 10px;
}
.pg-test-msg {
  background: var(--vp-c-bg-soft);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #dc2626;
  margin: 0 0 8px;
}
.pg-diff {
  display: flex;
  gap: 8px;
}
.pg-diff-col {
  flex: 1;
  min-width: 0;
}
.pg-diff-col > span {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--vp-c-text-3);
}
.pg-diff-col pre {
  margin: 4px 0 0;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--vp-c-bg-soft);
}
.pg-diff-col.expected pre {
  border-left: 3px solid #059669;
}
.pg-diff-col.actual pre {
  border-left: 3px solid #dc2626;
}
.pg-run-error {
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 10px;
  font-size: 13px;
}
.pg-run-error pre {
  margin: 6px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #dc2626;
  font-size: 12.5px;
  line-height: 1.6;
}

/* ---------- 控制台 ---------- */
.pg-console {
  font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg-alt);
}
.pg-console-line {
  border-bottom: 1px dashed var(--vp-c-divider);
  padding: 3px 0;
}
.pg-console-line pre {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.pg-console-line.error pre {
  color: #dc2626;
}
.pg-console-line.warn pre {
  color: #d97706;
}
.pg-console-line.info pre {
  color: var(--vp-c-brand-1);
}

/* ---------- 移动端 ---------- */
@media (max-width: 860px) {
  .pg {
    height: auto;
    min-height: calc(100vh - var(--vp-nav-height));
  }
  .pg-body {
    flex-direction: column;
  }
  .pg-left {
    width: 100% !important;
    max-height: 45vh;
    border-bottom: 1px solid var(--vp-c-divider);
  }
  .pg-splitter-x {
    display: none;
  }
  .pg-right {
    min-height: 70vh;
  }
}
</style>
