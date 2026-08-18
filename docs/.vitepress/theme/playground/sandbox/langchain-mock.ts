/**
 * "langchain" 包的沙箱替身：提供与 v1 API 形状一致的 createAgent 迷你实现
 * （ReAct 循环：模型 → 工具调用 → ToolMessage 回传 → 模型 … 直到产生最终回答），
 * 并 re-export 常用的消息类与 tool()，让课程代码可以原样在浏览器里运行。
 *
 * 额外对齐官方常用 API：
 * - systemPrompt：创建时注入系统消息
 * - checkpointer + thread_id：跨 invoke 持久化对话（MemorySaver）
 * - stream({ streamMode: "updates" })：逐步吐出 model / tools 节点增量
 */
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  isAIMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { FakeChatModel } from "./fake-chat-model";

export {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  isAIMessage,
  tool,
};

const MAX_ITERATIONS = 8;

/** 内存 checkpointer：按 thread_id 保存消息历史，形状对齐 @langchain/langgraph 的 MemorySaver */
export class MemorySaver {
  storage = new Map<string, BaseMessage[]>();
}

interface CreateAgentOptions {
  model: any;
  tools?: any[];
  /** v1 支持 systemPrompt / prompt 两种写法，这里都兼容 */
  systemPrompt?: string;
  prompt?: string;
  checkpointer?: MemorySaver;
}

type AgentInput = { messages: (BaseMessage | { role: string; content: string })[] };
type AgentConfig = {
  configurable?: { thread_id?: string };
  streamMode?: string;
  version?: string;
};

function normalizeMessages(messages: (BaseMessage | { role: string; content: string })[]) {
  return messages.map((m) => {
    if (typeof (m as BaseMessage).getType === "function") return m as BaseMessage;
    const plain = m as { role: string; content: string };
    if (plain.role === "system") return new SystemMessage(plain.content);
    if (plain.role === "assistant" || plain.role === "ai") return new AIMessage(plain.content);
    return new HumanMessage(plain.content);
  });
}

function hasSystemMessage(messages: BaseMessage[]) {
  return messages.some((m) => m.getType() === "system");
}

async function executeToolCall(tools: any[], call: any, iteration: number): Promise<ToolMessage> {
  const matched = tools.find((t) => t.name === call.name);
  if (!matched) {
    return new ToolMessage({
      content: `错误：找不到名为 "${call.name}" 的工具`,
      tool_call_id: call.id ?? "",
      name: call.name,
    });
  }
  try {
    const result = await matched.invoke({
      name: call.name,
      args: call.args,
      id: call.id ?? `call_${iteration}`,
      type: "tool_call",
    });
    if (result instanceof ToolMessage) return result;
    return new ToolMessage({
      content: typeof result === "string" ? result : JSON.stringify(result),
      tool_call_id: call.id ?? `call_${iteration}`,
      name: call.name,
    });
  } catch (err) {
    return new ToolMessage({
      content: `工具执行出错：${(err as Error).message}`,
      tool_call_id: call.id ?? `call_${iteration}`,
      name: call.name,
    });
  }
}

export function createAgent(options: CreateAgentOptions) {
  const { model, tools = [], checkpointer } = options;
  const systemText = options.systemPrompt ?? options.prompt;

  function loadHistory(threadId: string | undefined): BaseMessage[] {
    if (!threadId || !(checkpointer instanceof MemorySaver)) return [];
    return [...(checkpointer.storage.get(threadId) ?? [])];
  }

  function saveHistory(threadId: string | undefined, messages: BaseMessage[]) {
    if (!threadId || !(checkpointer instanceof MemorySaver)) return;
    checkpointer.storage.set(threadId, [...messages]);
  }

  function seedMessages(input: AgentInput, config?: AgentConfig): BaseMessage[] {
    const threadId = config?.configurable?.thread_id;
    const messages: BaseMessage[] = [
      ...loadHistory(threadId),
      ...normalizeMessages(input.messages),
    ];
    if (systemText && !hasSystemMessage(messages)) {
      messages.unshift(new SystemMessage(systemText));
    }
    return messages;
  }

  const runner =
    tools.length > 0 && typeof model.bindTools === "function"
      ? model.bindTools(tools)
      : model;

  async function* stepLoop(input: AgentInput, config?: AgentConfig) {
    const threadId = config?.configurable?.thread_id;
    const messages = seedMessages(input, config);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const ai: AIMessage = await runner.invoke(messages);
      messages.push(ai);
      yield { model: { messages: [ai] } };

      const toolCalls = ai.tool_calls ?? [];
      if (toolCalls.length === 0) break;

      for (const call of toolCalls) {
        const toolMessage = await executeToolCall(tools, call, i);
        messages.push(toolMessage);
        yield { tools: { messages: [toolMessage] } };
      }
    }

    saveHistory(threadId, messages);
    return messages;
  }

  return {
    async invoke(input: AgentInput, config?: AgentConfig) {
      const messages = seedMessages(input, config);
      const threadId = config?.configurable?.thread_id;

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const ai: AIMessage = await runner.invoke(messages);
        messages.push(ai);

        const toolCalls = ai.tool_calls ?? [];
        if (toolCalls.length === 0) break;

        for (const call of toolCalls) {
          messages.push(await executeToolCall(tools, call, i));
        }
      }

      saveHistory(threadId, messages);
      return { messages };
    },

    async stream(input: AgentInput, config?: AgentConfig) {
      return stepLoop(input, config);
    },
  };
}

/** initChatModel 的沙箱替身：任何配置都返回确定性的模拟模型 */
export async function initChatModel(_model?: string, _options?: Record<string, unknown>) {
  return new FakeChatModel();
}
