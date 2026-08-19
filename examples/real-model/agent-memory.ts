import "dotenv/config";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { createConfiguredModel } from "./model";

const agent = createAgent({
  model: createConfiguredModel(),
  tools: [],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: "handbook-memory-demo" } };

await agent.invoke({ messages: [{ role: "user", content: "我叫小林，请记住。" }] }, config);

const result = await agent.invoke(
  { messages: [{ role: "user", content: "我叫什么名字？" }] },
  config,
);

console.log(result.messages.at(-1)?.content);
