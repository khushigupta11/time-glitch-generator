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

// Optional: basic server-side timeout guard (keeps dev from hanging forever)
const IMAGE_TIMEOUT_MS = 45_000;
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    // generateImageBase64 doesn't accept abort, but this still protects route from waiting forever
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

    const raw = await generateWorldStateJson({ apiKey, prompt: worldPrompt });

    // 4) Parse world-state JSON robustly
    let world: WorldState;
    try {
      const jsonStr = extractFirstJsonObject(raw);
      world = JSON.parse(jsonStr) as WorldState;
    } catch {
      return NextResponse.json({ error: "Model did not return valid JSON", raw }, { status: 502 });
    }

    // Safety checks (Phase 2 additions)
    if (!world.landmarks || world.landmarks.length < 3) {
      return NextResponse.json({ error: "WorldState missing landmark plans", world }, { status: 502 });
    }
    for (let i = 0; i < 3; i++) {
      const lm = world.landmarks[i] as any;
      if (!Array.isArray(lm?.buffaloAnchors) || lm.buffaloAnchors.length < 2) {
        return NextResponse.json(
          { error: "WorldState missing buffaloAnchors for one or more landmarks", world },
          { status: 502 }
        );
      }
    }

    // 5) Build 3 deterministic prompts from the world JSON
    const prompts = [0, 1, 2].map((i) => buildImagePrompt(world, i));

    // 6) Generate 3 images (sequential to reduce overload/rate-limit pain)
    const images: Array<{ id: string; landmark: string; mimeType: string; base64: string }> = [];

    for (let i = 0; i < prompts.length; i++) {
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
    }

    // 7) Return everything the UI needs
    return NextResponse.json({
      ok: true,
      received: { year, theme, glitch, glitchTier },
      landmarks, // helpful for debugging drift (optional)
      world,
      images,
      prompts, // keep for debugging; remove later
    });
  } catch (err: any) {
    // If Gemini overload bubbles up, surface it clearly
    const message = err?.message ?? "Unknown error";
    const status =
      String(message).includes("503") || String(message).toLowerCase().includes("overloaded")
        ? 503
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}