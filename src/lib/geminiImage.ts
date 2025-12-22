import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Simple retry helper for transient Gemini overload / 5xx.
 * - Retries only on likely-transient errors (503, 429, some network hiccups)
 * - Uses exponential backoff + jitter
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number }
): Promise<T> {
  const retries = opts?.retries ?? 4; // total attempts = retries+1
  const baseDelayMs = opts?.baseDelayMs ?? 600;

  let lastErr: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;

      const msg = String(e?.message ?? e);
      const is503 = msg.includes("503") || msg.toLowerCase().includes("overloaded");
      const is429 = msg.includes("429") || msg.toLowerCase().includes("rate");
      const isNet =
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("econnreset") ||
        msg.toLowerCase().includes("etimedout");

      const transient = is503 || is429 || isNet;

      if (!transient || attempt === retries) break;

      const exp = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 250);
      const delay = exp + jitter;

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastErr;
}

export async function generateImageBase64(args: {
  apiKey: string;
  prompt: string;
}): Promise<{ mimeType: string; base64: string; text?: string }> {
  const { apiKey, prompt } = args;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
  });

  const result = await withRetry(
    async () => {
      return await model.generateContent(prompt);
    },
    { retries: 4, baseDelayMs: 700 }
  );

  const parts = result.response.candidates?.[0]?.content?.parts ?? [];

  const imagePart = parts.find(
    (p: any) => p.inlineData?.mimeType?.startsWith("image/")
  );
  const textPart = parts.find((p: any) => typeof p.text === "string");

  if (!imagePart?.inlineData?.data) {
    // include a short text snippet if present to help debug
    const maybeText = textPart?.text?.slice(0, 300);
    throw new Error(
      `No image returned from Gemini image model${maybeText ? `; text: ${maybeText}` : ""}`
    );
  }

  return {
    mimeType: imagePart.inlineData.mimeType,
    base64: imagePart.inlineData.data,
    text: textPart?.text,
  };
}
