import { NextResponse } from "next/server";
import { pickRandomLandmarks } from "@/lib/landmarks";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ ok: true, message: "API route is alive" });
}

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
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const landmarks = pickRandomLandmarks(3);

    return NextResponse.json({
      ok: true,
      received: { year, theme, glitch },
      landmarks,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
