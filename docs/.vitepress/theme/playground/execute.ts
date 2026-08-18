/**
 * 沙箱执行内核：Worker 与 Node 校验脚本共用。
 * 把 TypeScript 编译成 CJS，在自定义 require / process / console 中运行。
 */
import { transform } from "sucrase";
import { resolveModule } from "./sandbox/modules";
import { resetSandbox, getCalls } from "./sandbox/state";
import { createExpect, AssertionError } from "./expect";
import { getExercise } from "./exercises";
import type { TestResultItem } from "./types";

export function compile(code: string): string {
  return transform(code, {
    transforms: ["typescript", "imports"],
    disableESTransforms: false,
  }).code;
}

export const fakeProcess = {
  env: {
    AI_MODEL: "playground-sim-model",
    AI_ENDPOINT: "https://playground.local/v1",
    AI_API_KEY: "sk-playground-no-key-needed",
    AI_EMBEDDING_MODEL: "playground-sim-embedding",
    MCP_SERVER_URL: "https://playground.local/mcp",
  },
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export interface SandboxConsole {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

export function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg, null, 2) ?? String(arg);
  } catch {
    return String(arg);
  }
}

export async function executeModule(
  compiled: string,
  sandboxConsole: SandboxConsole,
): Promise<Record<string, any>> {
  const module = { exports: {} as Record<string, any> };
  const fn = new AsyncFunction(
    "require",
    "module",
    "exports",
    "process",
    "console",
    `${compiled}\n;return module.exports;`,
  );
  await fn(resolveModule, module, module.exports, fakeProcess, sandboxConsole);
  return module.exports;
}

export function makeCollectingConsole(logs: string[]): SandboxConsole {
  const sink = (...args: unknown[]) => logs.push(args.map(stringifyArg).join(" "));
  return { log: sink, info: sink, warn: sink, error: sink, debug: sink };
}

export async function runExerciseTests(
  exerciseId: string,
  code: string,
): Promise<TestResultItem[]> {
  const exercise = getExercise(exerciseId);
  if (!exercise) throw new Error(`未找到练习：${exerciseId}`);

  let compiled: string;
  try {
    compiled = compile(code);
  } catch (err) {
    return [
      {
        name: "编译",
        pass: false,
        message: `编译失败：${(err as Error).message}`,
      },
    ];
  }

  const results: TestResultItem[] = [];
  for (const test of exercise.tests) {
    resetSandbox(exercise.modelBehavior, exercise.mcpTools);
    const logs: string[] = [];
    try {
      const exports = await executeModule(compiled, makeCollectingConsole(logs));
      await test.run({
        exports,
        logs,
        expect: createExpect(),
        modelCalls: getCalls(),
      });
      results.push({ name: test.name, pass: true });
    } catch (err) {
      if (err instanceof AssertionError) {
        results.push({
          name: test.name,
          pass: false,
          message: err.message,
          expected: err.expected,
          actual: err.actual,
        });
      } else {
        results.push({
          name: test.name,
          pass: false,
          message: `${(err as Error).name ?? "Error"}: ${(err as Error).message}`,
        });
      }
    }
  }
  return results;
}
