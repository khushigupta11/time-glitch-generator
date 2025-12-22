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

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { year, theme, glitch } = body as {
      year: number;
      theme: string;
      glitch: number;
    };

    if (
      !Number.isFinite(year) ||
      typeof theme !== "string" ||
      !Number.isFinite(glitch)
    ) {
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
      return NextResponse.json(
        { error: "Model did not return valid JSON", raw },
        { status: 502 }
      );
    }

    // Safety check: ensure we have 3 landmark plans
    if (!world.landmarks || world.landmarks.length < 3) {
      return NextResponse.json(
        { error: "WorldState missing landmark plans", world },
        { status: 502 }
      );
    }

    // 5) Build 3 deterministic prompts from the world JSON
    const prompts = [0, 1, 2].map((i) => buildImagePrompt(world, i));

    // 6) Generate 3 images (sequential to avoid rate-limit pain during dev)
    const images: Array<{
      id: string;
      landmark: string;
      mimeType: string;
      base64: string;
    }> = [];

    for (let i = 0; i < prompts.length; i++) {
      const img = await generateImageBase64({ apiKey, prompt: prompts[i] });

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
      world,
      images,
      prompts, // keep for debugging while building; remove later if you want
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
