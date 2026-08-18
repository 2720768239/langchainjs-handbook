/// <reference lib="webworker" />
/**
 * 训练场执行器（Web Worker）：
 * 编译用户 TypeScript → 在沙箱中执行 → 运行练习测试用例
 * 「运行」优先调用用户导出的 main()；否则调用题目 demo 打印典型输入/输出
 */
import {
  compile,
  executeModule,
  makeCollectingConsole,
  runExerciseTests,
  stringifyArg,
} from "./execute";
import { resetSandbox } from "./sandbox/state";
import { getExercise } from "./exercises";
import type { RunRequest, WorkerEvent } from "./types";

const post = (event: WorkerEvent) => (self as unknown as Worker).postMessage(event);

async function handleRun(req: RunRequest, compiled: string) {
  const logs: string[] = [];
  const sandboxConsole = makeCollectingConsole(logs);
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    sandboxConsole[level] = (...args: unknown[]) => {
      const text = args.map(stringifyArg).join(" ");
      logs.push(text);
      post({ type: "console", runId: req.runId, level, text });
    };
  }
  const log = (...args: unknown[]) => sandboxConsole.log(...args);
  const exports = await executeModule(compiled, sandboxConsole);

  // 优先跑用户自己写的 main()；否则跑题目自带的 demo，保证「运行」必有可见输出
  if (typeof exports.main === "function") {
    await exports.main();
  } else {
    const exercise = getExercise(req.exerciseId);
    if (exercise?.demo) {
      log("── 题目演示（未导出 main()，自动运行）──");
      await exercise.demo({ exports, log });
      log("── 演示结束 ──");
    } else {
      // 兼容顶层 main().catch(...) 这类浮动异步
      await new Promise((r) => setTimeout(r, 400));
      if (logs.length === 0) {
        log(
          "没有可演示的入口。请导出 async function main()，或实现题目要求的导出函数后再次运行。",
        );
      }
    }
  }
}

self.onmessage = async (e: MessageEvent<RunRequest>) => {
  const req = e.data;
  const started = Date.now();
  try {
    const exercise = getExercise(req.exerciseId);
    resetSandbox(exercise?.modelBehavior, exercise?.mcpTools);

    let compiled: string;
    try {
      compiled = compile(req.code);
    } catch (err) {
      post({
        type: "done",
        runId: req.runId,
        mode: req.type,
        ok: false,
        error: `编译失败：${(err as Error).message}`,
        durationMs: Date.now() - started,
      });
      return;
    }

    if (req.type === "run") {
      await handleRun(req, compiled);
      post({
        type: "done",
        runId: req.runId,
        mode: "run",
        ok: true,
        durationMs: Date.now() - started,
      });
    } else {
      const tests = await runExerciseTests(req.exerciseId, req.code);
      post({
        type: "done",
        runId: req.runId,
        mode: "test",
        ok: tests.every((t) => t.pass),
        tests,
        durationMs: Date.now() - started,
      });
    }
  } catch (err) {
    post({
      type: "done",
      runId: req.runId,
      mode: req.type,
      ok: false,
      error: `${(err as Error).name ?? "Error"}: ${(err as Error).message}`,
      durationMs: Date.now() - started,
    });
  }
};
