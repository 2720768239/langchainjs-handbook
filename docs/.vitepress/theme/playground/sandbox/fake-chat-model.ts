import {
  BaseChatModel,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import {
  AIMessage,
  AIMessageChunk,
  ToolMessage,
  isHumanMessage,
  isToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ChatGenerationChunk, type ChatResult } from "@langchain/core/outputs";
import { RunnableLambda } from "@langchain/core/runnables";
import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { getBehavior, nextCallIndex, recordCall } from "./state";
import type { ModelCallContext, ModelTurn } from "../types";

function textOf(message: BaseMessage): string {
  const content = message.content;
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * 确定性模拟 Chat 模型：在训练场里替代 ChatOpenAI。
 * 行为由练习题的 modelBehavior 脚本驱动；没有脚本时使用可预测的默认回复，
 * 因此测试用例可以对输出做精确断言，且完全离线、无需 API Key。
 */
export class FakeChatModel extends BaseChatModel {
  private boundTools: any[] = [];

  constructor(_fields?: BaseChatModelParams & Record<string, unknown>) {
    super({});
  }

  _llmType(): string {
    return "playground-fake-model";
  }

  /** 解析本轮应当返回什么（脚本优先，否则用默认策略） */
  private resolveTurn(messages: BaseMessage[]): ModelTurn {
    const lastMessage = messages[messages.length - 1];
    const lastHumanMsg = [...messages].reverse().find((m) => isHumanMessage(m));
    const lastHuman = lastHumanMsg ? textOf(lastHumanMsg) : "";

    // 收集最近一批工具执行结果（从末尾向前直到遇到非 ToolMessage）
    const lastToolResults: { name?: string; content: string }[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (isToolMessage(m)) {
        lastToolResults.unshift({ name: (m as ToolMessage).name, content: textOf(m) });
      } else {
        break;
      }
    }

    const ctx: ModelCallContext = {
      messages,
      lastHuman,
      lastMessage,
      boundToolNames: this.boundTools.map((t) => t?.name).filter(Boolean),
      callIndex: nextCallIndex(),
      lastToolResults,
    };

    const behavior = getBehavior();
    const scripted = behavior?.(ctx);

    recordCall({
      messageCount: messages.length,
      lastHuman,
      hadToolResult: lastToolResults.length > 0,
      returnedToolCalls: scripted?.toolCalls?.map((c) => c.name) ?? [],
    });

    if (scripted) return scripted;

    // 默认策略：刚执行完工具 → 汇总工具结果；否则回声最后一条用户消息
    if (lastToolResults.length > 0) {
      const summary = lastToolResults
        .map((r) => (r.name ? `${r.name} → ${r.content}` : r.content))
        .join("；");
      return { content: `根据工具返回的结果：${summary}` };
    }
    return { content: `[模拟模型回复] 我收到了你的消息：${lastHuman}` };
  }

  private turnToMessage(turn: ModelTurn): AIMessage {
    const content = turn.content ?? "";
    const toolCalls = (turn.toolCalls ?? []).map((c, i) => ({
      name: c.name,
      args: c.args,
      id: c.id ?? `call_${Date.now()}_${i}`,
      type: "tool_call" as const,
    }));
    const outputTokens = estimateTokens(content) + toolCalls.length * 8;
    return new AIMessage({
      content,
      tool_calls: toolCalls,
      usage_metadata: {
        input_tokens: 32,
        output_tokens: outputTokens,
        total_tokens: 32 + outputTokens,
      },
      response_metadata: { model_name: "playground-sim-model" },
    });
  }

  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    // 模拟少量网络延迟，让 async 语义更真实
    await new Promise((r) => setTimeout(r, 10));
    const message = this.turnToMessage(this.resolveTurn(messages));
    return {
      generations: [{ message, text: typeof message.content === "string" ? message.content : "" }],
    };
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const turn = this.resolveTurn(messages);
    const text = turn.content ?? "";
    // 按小片段吐出内容，模拟真实流式输出
    const size = 3;
    for (let i = 0; i < text.length; i += size) {
      const piece = text.slice(i, i + size);
      await new Promise((r) => setTimeout(r, 8));
      const chunk = new ChatGenerationChunk({
        message: new AIMessageChunk({ content: piece }),
        text: piece,
      });
      yield chunk;
      await runManager?.handleLLMNewToken(piece);
    }
  }

  override bindTools(tools: any[]): FakeChatModel {
    const next = new FakeChatModel();
    next.boundTools = [...this.boundTools, ...tools];
    return next;
  }

  override withStructuredOutput(schema: any): any {
    return RunnableLambda.from(async (input: any) => {
      const messages: BaseMessage[] = Array.isArray(input)
        ? input
        : typeof input === "string"
          ? [{ content: input, getType: () => "human" } as unknown as BaseMessage]
          : [input];
      // 直接走行为脚本：优先 structured 字段，其次尝试把 content 当 JSON 解析
      const lastHuman =
        typeof input === "string"
          ? input
          : textOf(messages[messages.length - 1] as BaseMessage);
      const behavior = getBehavior();
      const turn =
        behavior?.({
          messages: messages as BaseMessage[],
          lastHuman,
          lastMessage: messages[messages.length - 1] as BaseMessage,
          boundToolNames: [],
          callIndex: nextCallIndex(),
          lastToolResults: [],
        }) ?? {};
      recordCall({
        messageCount: messages.length,
        lastHuman,
        hadToolResult: false,
        returnedToolCalls: [],
      });
      let data: unknown = turn.structured;
      if (data === undefined && turn.content) {
        try {
          data = JSON.parse(turn.content);
        } catch {
          throw new Error("模拟模型未返回可解析的结构化数据");
        }
      }
      if (data === undefined) {
        throw new Error(
          "此练习的模拟模型没有为该输入配置结构化输出，请检查传入的文本是否符合题目要求",
        );
      }
      // 用传入的 Zod schema 校验，行为与真实 withStructuredOutput 一致
      if (schema && typeof schema.parse === "function") {
        return schema.parse(data);
      }
      return data;
    });
  }
}

/** 模拟的 OpenAIEmbeddings 见 fake-embeddings.ts；这里导出别名以模拟 @langchain/openai */
export const ChatOpenAI = FakeChatModel;
export const AzureChatOpenAI = FakeChatModel;
