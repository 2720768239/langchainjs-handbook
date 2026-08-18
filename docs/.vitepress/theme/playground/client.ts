/**
 * 主线程侧的运行器封装：管理 Worker 生命周期、超时熔断（防死循环）与结果回调。
 */
import type { ConsoleEvent, RunDoneEvent, RunMode, WorkerEvent } from "./types";

const TIMEOUT_MS = 15_000;

export interface RunOutcome {
  done: RunDoneEvent;
}

export class PlaygroundRunner {
  private worker: Worker | null = null;
  private runId = 0;
  private pending: {
    resolve: (r: RunDoneEvent) => void;
    timer: ReturnType<typeof setTimeout>;
    id: number;
  } | null = null;

  constructor(private onConsole: (e: ConsoleEvent) => void) {}

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL("./runner.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (e: MessageEvent<WorkerEvent>) => {
      const event = e.data;
      if (event.type === "console") {
        if (event.runId === this.pending?.id) this.onConsole(event);
        return;
      }
      if (event.type === "done" && this.pending && event.runId === this.pending.id) {
        clearTimeout(this.pending.timer);
        const { resolve } = this.pending;
        this.pending = null;
        resolve(event);
      }
    };
    this.worker.onerror = (e) => {
      if (this.pending) {
        clearTimeout(this.pending.timer);
        const { resolve, id } = this.pending;
        this.pending = null;
        resolve({
          type: "done",
          runId: id,
          mode: "run",
          ok: false,
          error: `执行器内部错误：${e.message}`,
          durationMs: 0,
        });
      }
    };
    return this.worker;
  }

  /** 中断当前执行并重建 Worker（超时或用户主动停止时使用） */
  private restart() {
    this.worker?.terminate();
    this.worker = null;
  }

  isBusy(): boolean {
    return this.pending !== null;
  }

  stop() {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { resolve, id } = this.pending;
    this.pending = null;
    this.restart();
    resolve({
      type: "done",
      runId: id,
      mode: "run",
      ok: false,
      error: "已手动停止执行",
      durationMs: 0,
    });
  }

  run(mode: RunMode, exerciseId: string, code: string): Promise<RunDoneEvent> {
    if (this.pending) this.stop();
    const id = ++this.runId;
    const worker = this.ensureWorker();

    return new Promise<RunDoneEvent>((resolve) => {
      const timer = setTimeout(() => {
        this.pending = null;
        this.restart();
        resolve({
          type: "done",
          runId: id,
          mode,
          ok: false,
          error: `执行超过 ${TIMEOUT_MS / 1000} 秒被中止（检查是否有死循环，或多余的顶层 await）`,
          durationMs: TIMEOUT_MS,
        });
      }, TIMEOUT_MS);

      this.pending = { resolve, timer, id };
      worker.postMessage({ type: mode, runId: id, exerciseId, code });
    });
  }

  dispose() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }
}
