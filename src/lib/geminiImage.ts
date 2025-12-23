import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Retry helper for transient Gemini overload / 5xx.
 * - Retries only on likely-transient errors (503, 429, some network hiccups)
 * - Exponential backoff + jitter
 *
 * NOTE: We keep retries small-ish so we don't silently add tons of wait time.
 * The UI (Plan A) will still handle overload with a friendly message + manual retry.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number; maxDelayMs?: number }
): Promise<T> {
  const retries = opts?.retries ?? 2; // total attempts = retries+1
  const baseDelayMs = opts?.baseDelayMs ?? 600;
  const maxDelayMs = opts?.maxDelayMs ?? 3000;

  let lastErr: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;

      const msg = String(e?.message ?? e);
      const m = msg.toLowerCase();

      const is503 =
        msg.includes("503") ||
        m.includes("overloaded") ||
        m.includes("service unavailable") ||
        m.includes("internal error") ||
        m.includes("backend error");

      const is429 =
        msg.includes("429") ||
        m.includes("rate") ||
        m.includes("quota") ||
        m.includes("resource has been exhausted");

      const isNet =
        m.includes("fetch") ||
        m.includes("network") ||
        m.includes("econnreset") ||
        m.includes("etimedout") ||
        m.includes("timeout");

      const transient = is503 || is429 || isNet;

      if (!transient || attempt === retries) break;

      const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
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
    { retries: 2, baseDelayMs: 700, maxDelayMs: 3000 }
  );

  const parts = result.response.candidates?.[0]?.content?.parts ?? [];

  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
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