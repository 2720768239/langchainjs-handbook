import type { BaseMessage } from "@langchain/core/messages";
import type { ExpectFn } from "./expect";

/** 模拟模型单轮回复 */
export interface ModelTurn {
  /** 文本回复内容 */
  content?: string;
  /** 工具调用意图（模拟 function calling） */
  toolCalls?: { name: string; args: Record<string, unknown>; id?: string }[];
  /** withStructuredOutput 场景下返回的结构化数据 */
  structured?: unknown;
}

/** 每次模型被调用时的上下文，练习题据此编写确定性的模型行为 */
export interface ModelCallContext {
  messages: BaseMessage[];
  /** 最后一条 Human 消息的文本 */
  lastHuman: string;
  lastMessage: BaseMessage;
  /** 通过 bindTools 绑定的工具名 */
  boundToolNames: string[];
  /** 本次执行中这是第几次模型调用（从 0 开始） */
  callIndex: number;
  /** 最近一批 ToolMessage 的文本内容（如果上一步是工具执行） */
  lastToolResults: { name?: string; content: string }[];
}

export type ModelBehavior = (ctx: ModelCallContext) => ModelTurn | undefined;

/** 记录一次真实发生的模型调用，供测试断言 */
export interface ModelCallRecord {
  messageCount: number;
  lastHuman: string;
  hadToolResult: boolean;
  returnedToolCalls: string[];
}

export interface TestContext {
  /** 用户代码模块的导出 */
  exports: Record<string, any>;
  /** 本条测试执行期间用户代码打印的所有 console 文本 */
  logs: string[];
  expect: ExpectFn;
  /** 本条测试执行期间发生的所有模型调用记录 */
  modelCalls: ModelCallRecord[];
}

export interface ExerciseTest {
  name: string;
  run: (ctx: TestContext) => Promise<void> | void;
}

/** 「▶ 运行」时的演示上下文：在没有用户自定义 main() 时调用 */
export interface DemoContext {
  /** 用户代码模块的导出 */
  exports: Record<string, any>;
  /** 写入训练场控制台（等同 console.log） */
  log: (...args: unknown[]) => void;
}

export type Difficulty = "入门" | "基础" | "进阶";

export interface Exercise {
  id: string;
  chapter: number;
  chapterName: string;
  title: string;
  difficulty: Difficulty;
  /** 关联的笔记页面路径，如 /guide/03-prompts */
  guideLink: string;
  /** 题目描述（markdown） */
  description: string;
  /** 编辑器初始代码 */
  starterCode: string;
  /** 左侧「示例代码」标签页展示的可运行参考示例 */
  exampleCode?: string;
  /** 参考答案 */
  solution: string;
  hints: string[];
  /** 确定性模拟模型的行为脚本（不设置则使用默认回声行为） */
  modelBehavior?: ModelBehavior;
  /** MCP 模拟客户端 getTools() 返回的工具（仅 MCP 相关练习需要） */
  mcpTools?: any[];
  /**
   * 「▶ 运行」演示脚本：用户未导出 main() 时自动调用，
   * 用本题典型输入调用导出函数并打印结果，让效果显而易见。
   */
  demo?: (ctx: DemoContext) => Promise<void> | void;
  tests: ExerciseTest[];
}

/* ------------ Worker 通信协议 ------------ */

export type RunMode = "run" | "test";

export interface RunRequest {
  type: RunMode;
  runId: number;
  exerciseId: string;
  code: string;
}

export interface ConsoleEvent {
  type: "console";
  runId: number;
  level: "log" | "info" | "warn" | "error" | "debug";
  text: string;
}

export interface TestResultItem {
  name: string;
  pass: boolean;
  message?: string;
  expected?: string;
  actual?: string;
}

export interface RunDoneEvent {
  type: "done";
  runId: number;
  mode: RunMode;
  ok: boolean;
  /** 编译或运行期错误 */
  error?: string;
  tests?: TestResultItem[];
  durationMs: number;
}

export type WorkerEvent = ConsoleEvent | RunDoneEvent;
