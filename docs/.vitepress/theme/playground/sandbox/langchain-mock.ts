/**
 * "langchain" 包的沙箱替身：提供与 v1 API 形状一致的 createAgent 迷你实现
 * （ReAct 循环：模型 → 工具调用 → ToolMessage 回传 → 模型 … 直到产生最终回答），
 * 并 re-export 常用的消息类与 tool()，让课程代码可以原样在浏览器里运行。
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

interface CreateAgentOptions {
  model: any;
  tools?: any[];
  /** v1 支持 systemPrompt / prompt 两种写法，这里都兼容 */
  systemPrompt?: string;
  prompt?: string;
}

function normalizeMessages(messages: (BaseMessage | { role: string; content: string })[]) {
  return messages.map((m) => {
    if (typeof (m as BaseMessage).getType === "function") return m as BaseMessage;
    const plain = m as { role: string; content: string };
    if (plain.role === "system") return new SystemMessage(plain.content);
    if (plain.role === "assistant" || plain.role === "ai") return new AIMessage(plain.content);
    return new HumanMessage(plain.content);
  });
}

export function createAgent(options: CreateAgentOptions) {
  const { model, tools = [] } = options;
  const systemText = options.systemPrompt ?? options.prompt;

  return {
    async invoke(input: { messages: (BaseMessage | { role: string; content: string })[] }) {
      const messages: BaseMessage[] = normalizeMessages(input.messages);
      if (systemText) messages.unshift(new SystemMessage(systemText));

      const runner =
        tools.length > 0 && typeof model.bindTools === "function"
          ? model.bindTools(tools)
          : model;

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const ai: AIMessage = await runner.invoke(messages);
        messages.push(ai);

        const toolCalls = ai.tool_calls ?? [];
        if (toolCalls.length === 0) break;

        for (const call of toolCalls) {
          const matched = tools.find((t) => t.name === call.name);
          if (!matched) {
            messages.push(
              new ToolMessage({
                content: `错误：找不到名为 "${call.name}" 的工具`,
                tool_call_id: call.id ?? "",
                name: call.name,
              }),
            );
            continue;
          }
          let toolMessage: ToolMessage;
          try {
            // 传入完整 ToolCall 时，核心库的 tool 会直接返回 ToolMessage
            const result = await matched.invoke({
              name: call.name,
              args: call.args,
              id: call.id ?? `call_${i}`,
              type: "tool_call",
            });
            toolMessage =
              result instanceof ToolMessage
                ? result
                : new ToolMessage({
                    content: typeof result === "string" ? result : JSON.stringify(result),
                    tool_call_id: call.id ?? `call_${i}`,
                    name: call.name,
                  });
          } catch (err) {
            toolMessage = new ToolMessage({
              content: `工具执行出错：${(err as Error).message}`,
              tool_call_id: call.id ?? `call_${i}`,
              name: call.name,
            });
          }
          messages.push(toolMessage);
        }
      }

      return { messages };
    },
  };
}

/** initChatModel 的沙箱替身：任何配置都返回确定性的模拟模型 */
export async function initChatModel(_model?: string, _options?: Record<string, unknown>) {
  return new FakeChatModel();
}
