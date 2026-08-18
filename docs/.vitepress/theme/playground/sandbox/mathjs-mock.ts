/**
 * "mathjs" 的最小替身：只提供课程示例用到的 evaluate()，
 * 支持基础四则运算、括号、取余和乘方（^），并做了严格的字符白名单校验。
 */
export function evaluate(expression: string): number {
  const cleaned = String(expression).trim();
  if (!/^[\d+\-*/().%^\s]+$/.test(cleaned)) {
    throw new Error(`表达式包含不支持的字符：${cleaned}（沙箱内的 evaluate 只支持基础算术）`);
  }
  const jsExpr = cleaned.replace(/\^/g, "**");
  try {
    const result = new Function(`"use strict"; return (${jsExpr});`)();
    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new Error("结果不是有效数字");
    }
    return result;
  } catch (err) {
    throw new Error(`表达式求值失败：${(err as Error).message}`);
  }
}
