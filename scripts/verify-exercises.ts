/**
 * 离线校验所有训练场练习的参考答案能否通过测试。
 * 用法：npx tsx scripts/verify-exercises.ts
 */
import { exercises } from "../docs/.vitepress/theme/playground/exercises";
import { runExerciseTests } from "../docs/.vitepress/theme/playground/execute";

async function main() {
  let failed = 0;
  for (const exercise of exercises) {
    const results = await runExerciseTests(exercise.id, exercise.solution);
    const pass = results.filter((r) => r.pass).length;
    const ok = results.length > 0 && results.every((r) => r.pass);
    const mark = ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${exercise.id}  ${pass}/${results.length}  ${exercise.title}`);
    if (!ok) {
      failed++;
      for (const r of results.filter((x) => !x.pass)) {
        console.log(`       × ${r.name}`);
        if (r.message) console.log(`         ${r.message}`);
      }
    }
  }
  console.log("");
  if (failed) {
    console.error(`${failed}/${exercises.length} 道练习未通过`);
    process.exit(1);
  }
  console.log(`全部 ${exercises.length} 道练习的参考答案已通过测试`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
