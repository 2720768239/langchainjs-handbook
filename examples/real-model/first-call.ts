import "dotenv/config";
import { HumanMessage } from "langchain";
import { createConfiguredModel } from "./model";

const model = createConfiguredModel();
const response = await model.invoke([new HumanMessage("用一句中文解释 LangChain.js 的作用。")]);

console.log(response.content);
