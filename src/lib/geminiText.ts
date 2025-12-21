import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateWorldStateJson(args: {
  apiKey: string;
  prompt: string;
}) {
  const { apiKey, prompt } = args;

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
