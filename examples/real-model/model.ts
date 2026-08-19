import { ChatOpenAI } from "@langchain/openai";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is missing. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export function createConfiguredModel() {
  return new ChatOpenAI({
    apiKey: required("AI_API_KEY"),
    model: required("AI_MODEL"),
    temperature: 0,
    configuration: {
      baseURL: required("AI_ENDPOINT"),
    },
  });
}
