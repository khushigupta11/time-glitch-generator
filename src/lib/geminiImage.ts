import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateImageBase64(args: {
  apiKey: string;
  prompt: string;
}): Promise<{ mimeType: string; base64: string; text?: string }> {
  const { apiKey, prompt } = args;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  const result = await model.generateContent(prompt);
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];

  const imagePart = parts.find(
    (p: any) => p.inlineData?.mimeType?.startsWith("image/")
  );
  const textPart = parts.find((p: any) => typeof p.text === "string");

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image returned from Gemini image model");
  }

  return {
    mimeType: imagePart.inlineData.mimeType,
    base64: imagePart.inlineData.data,
    text: textPart?.text,
  };
}
