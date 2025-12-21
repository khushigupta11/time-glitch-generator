import type { Landmark } from "./landmarks";
import type { GlitchTier } from "./worldSchema";

export function buildWorldBuilderPrompt(args: {
  year: number;
  theme: string;
  glitch: GlitchTier;
  landmarks: Landmark[];
}): string {
  const { year, theme, glitch, landmarks } = args;

  const landmarkBlock = landmarks
    .map(
      (l) =>
        `- id: ${l.id}\n  name: ${l.name}\n  baseFacts: ${l.baseFacts}`
    )
    .join("\n");

  return `
You are an assistant that generates a SINGLE JSON object describing a coherent alternate-timeline "world state" for Buffalo, NY.

Hard requirements:
- Output MUST be valid JSON only. No markdown, no code fences, no commentary.
- The JSON must include plans for ALL provided landmarks (same order), matching their id values exactly.
- Keep landmarks recognizable. Use baseFacts to avoid drifting to other cities.
- The style must be photorealistic and grounded (no sci-fi fantasy).

User inputs:
- year: ${year}
- theme: ${theme}
- glitch: ${glitch}

Landmarks (fixed facts):
${landmarkBlock}

Return JSON with this exact shape:

{
  "year": number,
  "theme": string,
  "glitch": "minor" | "unstable" | "chaotic",
  "timelineName": string,
  "globalStyle": {
    "realism": "photorealistic",
    "lighting": string,
    "palette": string,
    "camera": string,
    "mood": string
  },
  "motifs": [string, string, string],
  "glitchSignature": [string, string, string],
  "glitchNotes": string,
  "landmarks": [
    {
      "id": string,
      "name": string,
      "mustKeep": [string, string],
      "changes": [string, string, string],
      "cameraHint": string
    }
  ]
}

Rules:
- motifs must be reusable across all landmarks (2–5 items).
- glitchSignature must describe visual distortions (2–5 items) that match the glitch tier.
- mustKeep: 2–4 short bullet strings that preserve identity.
- changes: 3–6 short bullet strings describing plausible future changes for that landmark under the theme + year.
- cameraHint should be short and different per landmark (e.g., "from waterfront promenade", "ground-level plaza looking up").
- Keep everything Buffalo-specific and geographically plausible.

Now output JSON only.
`.trim();
}
