import type { WorldState } from "./worldSchema";

function bullets(items: string[] = []) {
  return items.map((x) => `- ${x}`).join("\n");
}

function negatives(_: WorldState) {
  // Strong negatives to reduce: borders, mats, vignettes, cinematic bars, posters, PIP frames
  const base = [
    "no text, no readable signage, no captions, no logos, no watermarks",
    "no borders, no frames, no matte, no mat board, no film frame, no poster layout",
    "no letterboxing, no pillarboxing, no black bars, no white bars, no embedded margins",
    "no vignette, no heavy corner shading, no dark rounded corners",
    "no picture-in-picture, no photo-within-a-photo, no mockup, no gallery framing",
    "no split-screen, no collage, no multiple panels",
    "no extreme wide cinematic bars",
    "no distorted anatomy (avoid extra limbs/faces if people appear)",
  ];

  const cityLeak = [
    "do not depict NYC/Chicago/Toronto skylines or iconic landmarks from other cities",
  ];

  const sciFi = ["no flying cars, no sci-fi spacecraft, no fantasy architecture"];

  return bullets([...base, ...cityLeak, ...sciFi]);
}

export function buildImagePrompt(world: WorldState, idx: number): string {
  const lm = world.landmarks[idx];

  const glitchStrength =
    world.glitch === "minor"
      ? "subtle, barely noticeable"
      : world.glitch === "unstable"
      ? "visible but controlled"
      : "strong and dramatic (still photorealistic)";

  const cameraHint = lm.cameraHint ?? "street-level view";

  // Defensive fallbacks (avoid runtime crashes if model returns partial arrays)
  const lmAnchors = lm?.buffaloAnchors ?? [];
  const motifs = world?.motifs ?? [];
  const mustKeep = lm?.mustKeep ?? [];
  const changes = lm?.changes ?? [];
  const glitchSig = world?.glitchSignature ?? [];

  return `
Generate ONE photorealistic image of ${lm.name} in Buffalo, New York in the year ${world.year}.

This image is part of the SAME alternate timeline:
Timeline name: ${world.timelineName}
Theme: ${world.theme}

Global style:
- Lighting: ${world.globalStyle.lighting}
- Palette: ${world.globalStyle.palette}
- Camera: ${world.globalStyle.camera}
- Mood: ${world.globalStyle.mood}

Buffalo anchors (must include at least 2–3 as subtle background cues):
${bullets(lmAnchors)}

Recurring motifs (include a few if relevant):
${bullets(motifs)}

Landmark identity constraints (must keep):
${bullets(mustKeep)}

Timeline changes for this landmark (apply plausibly):
${bullets(changes)}

Camera hint:
- ${cameraHint}

Timeline glitch:
- Level: ${world.glitch} (${glitchStrength})
- Visual glitch signature (use some, but keep realistic):
${bullets(glitchSig)}

Framing & output rules (VERY IMPORTANT):
- Output ONE single image only.
- Full-bleed, edge-to-edge scene: the image MUST fill the entire canvas.
- NO borders of any kind (no black/white borders, no frames, no mats).
- NO letterboxing or pillarboxing (no black bars).
- NO vignette or heavy corner darkening.
- Do not depict a poster, print, phone screen, gallery display, or photo-within-a-photo.

Hard rules:
- Keep the landmark clearly recognizable and Buffalo-specific.
- Grounded realism: no fantasy/sci-fi elements like flying cars.
- Avoid readable text/logos/watermarks.
- Output a single full-frame image with no borders/letterboxing.

Negative prompts:
${negatives(world)}
`.trim();
}
