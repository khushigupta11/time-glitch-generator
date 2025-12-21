import { NextResponse } from "next/server";
import { pickRandomLandmarks } from "@/lib/landmarks";
import { glitchTierFromSlider } from "@/lib/glitch";
import { buildWorldBuilderPrompt } from "@/lib/worldBuilderPrompt";
import { generateWorldStateJson } from "@/lib/geminiText";
import type { WorldState } from "@/lib/worldSchema";
import { extractFirstJsonObject } from "@/lib/jsonExtract";

export const runtime = "nodejs";

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

    const landmarks = pickRandomLandmarks(3);
    const glitchTier = glitchTierFromSlider(glitch);

    const worldPrompt = buildWorldBuilderPrompt({
      year,
      theme,
      glitch: glitchTier,
      landmarks,
    });

    const raw = await generateWorldStateJson({ apiKey, prompt: worldPrompt });

    // Parse JSON (with a helpful error if model returns extra text)
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

    return NextResponse.json({
      ok: true,
      received: { year, theme, glitch, glitchTier },
      landmarks,
      world,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
