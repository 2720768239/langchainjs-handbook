/**
 * 迷你断言库：为训练场测试提供 Jest 风格的 expect API，
 * 失败时抛出带有 expected/actual 的 AssertionError，便于 UI 展示差异。
 */

export class AssertionError extends Error {
  expected?: string;
  actual?: string;

  constructor(message: string, expected?: unknown, actual?: unknown) {
    super(message);
    this.name = "AssertionError";
    if (expected !== undefined) this.expected = fmt(expected);
    if (actual !== undefined) this.actual = fmt(actual);
  }
}

function fmt(value: unknown, depth = 0): string {
  if (typeof value === "string") return depth === 0 ? value : JSON.stringify(value);
  if (value === null || value === undefined) return String(value);
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
  try {
    const json = JSON.stringify(value, null, 2);
    if (json === undefined) return String(value);
    return json.length > 600 ? json.slice(0, 600) + "\n…（已截断）" : json;
  } catch {
    return String(value);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

export interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toContain(needle: string | unknown): void;
  toMatch(regex: RegExp): void;
  toHaveLength(len: number): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toBeCloseTo(n: number, precision?: number): void;
  toBeInstanceOf(cls: abstract new (...args: any[]) => unknown): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  /** 自定义谓词断言，desc 用于失败提示 */
  toSatisfy(predicate: (v: any) => boolean, desc: string): void;
  toBeTypeOf(type: string): void;
}

export type ExpectFn = (actual: unknown, label?: string) => Matchers;

export function createExpect(): ExpectFn {
  return (actual: unknown, label?: string): Matchers => {
    const who = label ? `${label} ` : "";
    const fail = (msg: string, expected?: unknown): never => {
      throw new AssertionError(`${who}${msg}`, expected, actual);
    };
    return {
      toBe(expected) {
        if (!Object.is(actual, expected))
          fail(`期望严格等于 ${fmt(expected, 1)}，实际是 ${fmt(actual, 1)}`, expected);
      },
      toEqual(expected) {
        if (!deepEqual(actual, expected)) fail(`期望深度相等`, expected);
      },
      toContain(needle) {
        if (typeof actual === "string") {
          if (!actual.includes(String(needle)))
            fail(`期望字符串包含 ${fmt(needle, 1)}`, needle);
        } else if (Array.isArray(actual)) {
          if (!actual.some((item) => deepEqual(item, needle)))
            fail(`期望数组包含 ${fmt(needle, 1)}`, needle);
        } else {
          fail(`toContain 只支持字符串或数组，实际类型是 ${typeof actual}`);
        }
      },
      toMatch(regex) {
        if (typeof actual !== "string" || !regex.test(actual))
          fail(`期望匹配正则 ${regex}`, String(regex));
      },
      toHaveLength(len) {
        const actualLen = (actual as { length?: number } | null)?.length;
        if (actualLen !== len) fail(`期望长度为 ${len}，实际是 ${actualLen}`, len);
      },
      toBeGreaterThan(n) {
        if (typeof actual !== "number" || !(actual > n)) fail(`期望大于 ${n}`, `> ${n}`);
      },
      toBeGreaterThanOrEqual(n) {
        if (typeof actual !== "number" || !(actual >= n)) fail(`期望 ≥ ${n}`, `>= ${n}`);
      },
      toBeLessThanOrEqual(n) {
        if (typeof actual !== "number" || !(actual <= n)) fail(`期望 ≤ ${n}`, `<= ${n}`);
      },
      toBeCloseTo(n, precision = 2) {
        const pass =
          typeof actual === "number" && Math.abs(actual - n) < Math.pow(10, -precision) / 2;
        if (!pass) fail(`期望约等于 ${n}（精度 ${precision} 位小数）`, n);
      },
      toBeInstanceOf(cls) {
        if (!(actual instanceof cls))
          fail(
            `期望是 ${cls.name} 的实例，实际是 ${
              (actual as object | null)?.constructor?.name ?? typeof actual
            }`,
            cls.name,
          );
      },
      toBeDefined() {
        if (actual === undefined) fail(`期望已定义（不为 undefined）`);
      },
      toBeTruthy() {
        if (!actual) fail(`期望为真值，实际是 ${fmt(actual, 1)}`);
      },
      toSatisfy(predicate, desc) {
        if (!predicate(actual)) fail(`不满足条件：${desc}`, desc);
      },
      toBeTypeOf(type) {
        if (typeof actual !== type) fail(`期望类型为 ${type}，实际是 ${typeof actual}`, type);
      },
    };
  };
}
