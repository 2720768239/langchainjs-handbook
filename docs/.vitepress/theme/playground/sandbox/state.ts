import type { ModelBehavior, ModelCallRecord } from "../types";

/**
 * 沙箱全局状态：由 worker 在执行每个练习/测试前重置，
 * 假模型、假 MCP 客户端从这里读取行为脚本，并把调用记录写回来供测试断言。
 */
interface SandboxState {
  behavior?: ModelBehavior;
  callIndex: number;
  calls: ModelCallRecord[];
  mcpTools: any[];
}

const state: SandboxState = {
  behavior: undefined,
  callIndex: 0,
  calls: [],
  mcpTools: [],
};

export function resetSandbox(behavior?: ModelBehavior, mcpTools?: any[]) {
  state.behavior = behavior;
  state.callIndex = 0;
  state.calls = [];
  state.mcpTools = mcpTools ?? [];
}

export function getBehavior() {
  return state.behavior;
}

export function nextCallIndex() {
  return state.callIndex++;
}

export function recordCall(record: ModelCallRecord) {
  state.calls.push(record);
}

export function getCalls() {
  return state.calls;
}

export function getMcpTools() {
  return state.mcpTools;
}
