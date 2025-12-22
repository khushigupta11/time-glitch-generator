import type { WorldState } from "./worldSchema";

function bullets(items: string[]) {
  return items.map((x) => `- ${x}`).join("\n");
}

export function buildImagePrompt(world: WorldState, idx: number): string {
  const lm = world.landmarks[idx];

  const glitchStrength =
    world.glitch === "minor"
      ? "subtle, barely noticeable"
      : world.glitch === "unstable"
      ? "visible but controlled"
      : "strong and dramatic";

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

Recurring motifs (include a few if relevant):
${bullets(world.motifs)}

Landmark identity constraints (must keep):
${bullets(lm.mustKeep)}

Timeline changes for this landmark (apply plausibly):
${bullets(lm.changes)}

Camera hint:
- ${lm.cameraHint ?? "street-level view"}

Timeline glitch:
- Level: ${world.glitch} (${glitchStrength})
- Visual glitch signature (use some, but keep realistic):
${bullets(world.glitchSignature)}

Hard rules:
- Keep the landmark clearly recognizable and Buffalo-specific.
- No text overlays, no logos, no watermarks.
- Do NOT transform it into another city.
- Grounded realism: no fantasy/sci-fi elements like flying cars.
`.trim();
}
