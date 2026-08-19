/**
 * 校验每道练习的 demo 对参考答案能打出可见输出。
 */
import { exercises } from "../docs/.vitepress/theme/playground/exercises";
import {
  compile,
  executeModule,
  makeCollectingConsole,
} from "../docs/.vitepress/theme/playground/execute";
import { resetSandbox } from "../docs/.vitepress/theme/playground/sandbox/state";

async function main() {
  let failed = 0;
  for (const ex of exercises) {
    if (!ex.demo) {
      console.log(`[MISS] ${ex.id}  缺少 demo`);
      failed++;
      continue;
    }
    resetSandbox(ex.modelBehavior, ex.mcpTools);
    const logs: string[] = [];
    const cons = makeCollectingConsole(logs);
    const log = (...args: unknown[]) => cons.log(...args);
    try {
      const exports = await executeModule(compile(ex.solution), cons);
      await ex.demo({ exports, log });
      if (logs.length === 0) {
        console.log(`[EMPTY] ${ex.id}  demo 无输出`);
        failed++;
      } else {
        console.log(`[OK] ${ex.id}  ${logs.length} 行  e.g. ${logs[0].slice(0, 72)}`);
      }
    } catch (err) {
      console.log(`[FAIL] ${ex.id}  ${(err as Error).message}`);
      failed++;
    }
  }
  if (failed) {
    console.error(`${failed} 道 demo 未通过`);
    process.exit(1);
  }
  console.log(`全部 ${exercises.length} 道练习 demo 已产出可见输出`);
}

main();
