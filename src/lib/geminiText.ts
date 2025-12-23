import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Retry helper for transient Gemini overload / rate-limit / flaky network.
 * - Retries only on likely-transient errors (503, 429, some network hiccups)
 * - Exponential backoff + jitter
 * - Keeps total delay modest (we still want the UI Plan-A handling to shine)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number; maxDelayMs?: number }
): Promise<T> {
  const retries = opts?.retries ?? 2; // keep small (total attempts = retries+1)
  const baseDelayMs = opts?.baseDelayMs ?? 500;
  const maxDelayMs = opts?.maxDelayMs ?? 2500;

  let lastErr: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;

      const msg = String(e?.message ?? e);
      const m = msg.toLowerCase();

      const is503 = msg.includes("503") || m.includes("overloaded") || m.includes("service unavailable");
      const is429 = msg.includes("429") || m.includes("rate") || m.includes("quota") || m.includes("resource has been exhausted");
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

export async function generateWorldStateJson(args: { apiKey: string; prompt: string }) {
  const { apiKey, prompt } = args;

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const result = await withRetry(
    async () => {
      return await model.generateContent(prompt);
    },
    { retries: 2, baseDelayMs: 450, maxDelayMs: 2200 }
  );

  return result.response.text();
}