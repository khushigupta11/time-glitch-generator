import { NextResponse } from "next/server";
import { pickRandomLandmarks } from "@/lib/landmarks";
import { glitchTierFromSlider } from "@/lib/glitch";
import { buildWorldBuilderPrompt } from "@/lib/worldBuilderPrompt";
import { generateWorldStateJson } from "@/lib/geminiText";
import type { WorldState } from "@/lib/worldSchema";
import { extractFirstJsonObject } from "@/lib/jsonExtract";
import { buildImagePrompt } from "@/lib/promptBuilder";
import { generateImageBase64 } from "@/lib/geminiImage";

export const runtime = "nodejs";

const IMAGE_TIMEOUT_MS = 45_000;

/**
 * Debug gating:
 * - By default we do NOT send prompts/landmarks/raw to the client.
 * - Enable by setting DEBUG_PROMPTS=1 (server env).
 */
const DEBUG_PROMPTS = process.env.DEBUG_PROMPTS === "1";

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) =>
        ac.signal.addEventListener("abort", () => rej(new Error(`${label} timed out`)))
      ),
    ]);
  } finally {
    clearTimeout(t);
  }
}

function isOverloadedErrorMessage(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("503") ||
    m.includes("overloaded") ||
    m.includes("service unavailable") ||
    m.includes("resource has been exhausted") ||
    m.includes("rate limit") ||
    m.includes("quota")
  );
}

function overloadedResponse(args: { phase: "text" | "image" | "unknown"; detail?: string }) {
  const base = 6500;
  const jitter = Math.floor(Math.random() * 4000); // 0–4s
  const retryAfterMs = base + jitter;

  return NextResponse.json(
    {
      ok: false,
      errorCode: "MODEL_OVERLOADED",
      phase: args.phase,
      message:
        "The timeline generator is temporarily overloaded (glitch surge). Please wait a few seconds and try again.",
      retryAfterMs,
      // keep short detail for logs/debugging; UI shouldn’t show raw stack
      detail: args.detail ? String(args.detail).slice(0, 300) : undefined,
    },
    {
      status: 503,
      headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
    }
  );
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    const body = await req.json();
    const { year, theme, glitch } = body as { year: number; theme: string; glitch: number };

    if (!Number.isFinite(year) || typeof theme !== "string" || !Number.isFinite(glitch)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 1) Pick 3 landmarks
    const landmarks = pickRandomLandmarks(3);

    // 2) Slider -> glitch tier
    const glitchTier = glitchTierFromSlider(glitch);

    // 3) Build world-state prompt and call Gemini text model
    const worldPrompt = buildWorldBuilderPrompt({
      year,
      theme,
      glitch: glitchTier,
      landmarks,
    });

    let raw: string;
    try {
      raw = await generateWorldStateJson({ apiKey, prompt: worldPrompt });
    } catch (err: any) {
      const msg = String(err?.message ?? err ?? "");
      if (isOverloadedErrorMessage(msg)) {
        return overloadedResponse({ phase: "text", detail: msg });
      }
      throw err;
    }

    // 4) Parse world-state JSON robustly
    let world: WorldState;
    try {
      const jsonStr = extractFirstJsonObject(raw);
      world = JSON.parse(jsonStr) as WorldState;
    } catch {
      return NextResponse.json(
        DEBUG_PROMPTS ? { error: "Model did not return valid JSON", raw } : { error: "Model did not return valid JSON" },
        { status: 502 }
      );
    }

    // Safety checks (Phase 2 additions)
    if (!world.landmarks || world.landmarks.length < 3) {
      return NextResponse.json(
        DEBUG_PROMPTS
          ? { error: "WorldState missing landmark plans", world }
          : { error: "WorldState missing landmark plans" },
        { status: 502 }
      );
    }
    for (let i = 0; i < 3; i++) {
      const lm = world.landmarks[i] as any;
      if (!Array.isArray(lm?.buffaloAnchors) || lm.buffaloAnchors.length < 2) {
        return NextResponse.json(
          DEBUG_PROMPTS
            ? { error: "WorldState missing buffaloAnchors for one or more landmarks", world }
            : { error: "WorldState missing buffaloAnchors for one or more landmarks" },
          { status: 502 }
        );
      }
    }

    // 5) Build 3 deterministic prompts from the world JSON
    const prompts = [0, 1, 2].map((i) => buildImagePrompt(world, i));

    // 6) Generate 3 images (sequential)
    const images: Array<{ id: string; landmark: string; mimeType: string; base64: string }> = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        const img = await withTimeout(
          generateImageBase64({ apiKey, prompt: prompts[i] }),
          IMAGE_TIMEOUT_MS,
          `Image ${i + 1}`
        );

        images.push({
          id: world.landmarks[i].id,
          landmark: world.landmarks[i].name,
          mimeType: img.mimeType,
          base64: img.base64,
        });
      } catch (err: any) {
        const msg = String(err?.message ?? err ?? "");
        if (isOverloadedErrorMessage(msg)) {
          return overloadedResponse({ phase: "image", detail: msg });
        }
        throw err;
      }
    }

    // 7) Return everything the UI needs (NO prompts/landmarks by default)
    const payload: any = { ok: true, world, images };

    if (DEBUG_PROMPTS) {
      payload.debug = { received: { year, theme, glitch, glitchTier }, landmarks, prompts };
    }

    return NextResponse.json(payload);
  } catch (err: any) {
    const message = String(err?.message ?? "Unknown error");
    const status = isOverloadedErrorMessage(message) ? 503 : 500;

    if (status === 503) {
      return overloadedResponse({ phase: "unknown", detail: message });
    }

    return NextResponse.json({ error: message }, { status });
  }
}