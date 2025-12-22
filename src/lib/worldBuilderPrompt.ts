import type { Landmark } from "./landmarks";
import type { GlitchTier } from "./worldSchema";

function themeGuardrails(theme: string) {
  switch (theme) {
    case "Post-Snowpocalypse Survival":
      return `
Theme guardrails (Post-Snowpocalypse Survival):
- Keep it grounded Buffalo winter realism: lake-effect snow, wind, slush/ice, salt-stained concrete, frozen edges, boarded windows, emergency lighting.
- NO sci-fi or fantasy: no floating debris, no anti-gravity, no portals, no "reality tears", no impossible geometry.
- Avoid over-the-top apocalypse tropes: no skull piles, no cinematic wasteland dunes, no giant ruins collapse unless plausible.
- Damage/adaptation should be realistic: temporary barriers, sandbags, plywood, heat lamps, tarps, generator lights, snow fencing, plowed berms.
- Snow/ice should match Great Lakes: dirty snowbanks, windblown powder, icy crust, frost, rime, but not arctic glaciers.
- Crowds: if people appear, keep them normal (winter gear, small groups), no monsters, no militarized sci-fi squads.
`.trim();

    case "Retro-Futurism 1980s":
      return `
Theme guardrails (Retro-Futurism 1980s):
- Aim for "1980s optimistic futurism" (corporate modernism, early computer age), NOT cyberpunk.
- Materials: brushed steel, smoked glass, chrome accents, geometric forms; signage minimal and unreadable (avoid logos).
- Lighting: neon + fluorescent practical lighting, but avoid oversaturated "Blade Runner" grime unless requested.
- Tech should look era-plausible: CRT glow, chunky monitors, early digital displays, simple HUD-like projections (subtle), no hologram cities.
- Keep Buffalo architecture recognizable: do not replace landmarks with generic megastructures.
`.trim();

    case "Bills Dynasty City":
      return `
Theme guardrails (Bills Dynasty City):
- Avoid explicit team logos/text: use non-text civic colors (blue/red/white) and abstract sports motifs only.
- Keep it Buffalo civic pride, not stadium-centric everywhere. Integrate celebration subtly: banners WITHOUT readable text, crowd energy, color accents.
- No anachronistic tech unless glitch tier requires it, and even then keep photorealistic/camera-real.
`.trim();

    case "Tech Boom Buffalo":
      return `
Theme guardrails (Tech Boom Buffalo):
- Keep tech integration believable: smart lighting, sensors, subtle projections, drones at a distance; avoid sci-fi skyline transformations.
- Preserve landmark materials + massing; additions should feel like retrofits: LED uplighting, glass canopies, data kiosks, micro-mobility hubs.
- Avoid "generic neon cyber-city"; keep Great Lakes atmosphere and Buffalo industrial heritage cues.
`.trim();

    case "Industrial Revival":
      return `
Theme guardrails (Industrial Revival):
- Keep it historically plausible for the chosen year: period vehicles, clothing, street materials, smoke/steam, riveted steel.
- Avoid steampunk fantasy contraptions. Industrial details should be real (cranes, rail, factories, foundry glow).
- Maintain landmark identity; industrial additions should be adjacent or integrated subtly.
`.trim();

    case "Climate-Adaptive Waterfront":
      return `
Theme guardrails (Climate-Adaptive Waterfront):
- Keep resilience features plausible: wetlands, bioswales, permeable pavers, elevated walkways, flood barriers, floating gardens.
- Avoid sci-fi megastructures. This should look like an evolved version of Buffalo’s real waterfront + infrastructure.
`.trim();

    case "Utopian Transit Era":
      return `
Theme guardrails (Utopian Transit Era):
- Keep transit "clean and advanced" but believable: quiet electric shuttles, sleek light rail, elevated walkways, automated ferries.
- Avoid flying cars and extreme sci-fi. If aerial transit appears, keep it subtle (gondola/skytram), not futuristic aircraft.
- Maintain Buffalo’s industrial heritage textures; utopia = cleanliness + greenery, not a brand-new city.
`.trim();

    default:
      return `
Theme guardrails:
- Keep all changes grounded and plausible for Buffalo.
- Avoid generic cyberpunk/apocalypse drift.
`.trim();
  }
}

function glitchGuardrails(glitch: GlitchTier) {
  if (glitch === "minor") {
    return `
Glitch guardrails (minor):
- Subtle camera-real artifacts only: slight chromatic aberration, faint reflection shimmer, tiny temporal ghosting.
- No visible "breaks in reality", no heavy distortion, no surreal geometry.
`.trim();
  }
  if (glitch === "unstable") {
    return `
Glitch guardrails (unstable):
- Visible but controlled: light ghosting, localized pixel shimmer on reflective surfaces, mild lens warp, brief edge flicker.
- Keep it photorealistic: like a camera sensor glitch or temporal echo, not fantasy effects.
`.trim();
  }
  return `
Glitch guardrails (chaotic):
- Strong but still photorealistic and camera-real.
- Prefer: pronounced ghosting/afterimages, localized color splitting, sensor noise bursts, texture "skips" on hard surfaces.
- Avoid: portals, reality tears, impossible physics, floating objects, melting buildings, non-euclidean geometry.
`.trim();
}

export function buildWorldBuilderPrompt(args: {
  year: number;
  theme: string;
  glitch: GlitchTier;
  landmarks: Landmark[];
}): string {
  const { year, theme, glitch, landmarks } = args;

  const landmarkBlock = landmarks
    .map((l) => `- id: ${l.id}\n  name: ${l.name}\n  baseFacts: ${l.baseFacts}`)
    .join("\n");

  return `
You are an assistant that generates a SINGLE JSON object describing a coherent alternate-timeline "world state" for Buffalo, NY.
You are optimizing for: landmark recognizability + Buffalo specificity + photorealism + plausibility.

Hard requirements:
- Output MUST be valid JSON only. No markdown, no code fences, no commentary.
- The JSON must include plans for ALL provided landmarks (same order), matching their id values exactly.
- Keep landmarks recognizable. Use baseFacts to avoid drifting to other cities.
- Photorealistic + camera-real. Do not create illustration styles, cartoons, or fantasy visuals.
- Avoid readable text in-scene (no signs, slogans, banners, logos). If signage exists, it must be indistinct/unreadable.
- Avoid generic “movie set” look; prefer authentic materials, weathering, and Great Lakes atmosphere.

User inputs:
- year: ${year}
- theme: ${theme}
- glitch: ${glitch}

${themeGuardrails(theme)}

${glitchGuardrails(glitch)}

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
  "motifs": [string],
  "glitchSignature": [string],
  "glitchNotes": string,
  "landmarks": [
    {
      "id": string,
      "name": string,
      "buffaloAnchors": [string],
      "mustKeep": [string],
      "changes": [string],
      "cameraHint": string
    }
  ]
}

Rules:
- globalStyle should implicitly include season/time-of-day if useful (e.g., “overcast winter daylight”, “golden hour”, “neon dusk”).
- motifs must be reusable across all landmarks (2–5 items), visual and repeatable.
- glitchSignature: 2–5 camera-real visual effects matching glitch tier.
- buffaloAnchors: 4–6 items. Short, visual, grounded. Prefer:
  - Great Lakes cues: Lake Erie haze, wind, freshwater light, Niagara River mist/ice.
  - Buffalo materials: limestone + red brick + steel + concrete + salt stains + industrial textures.
  - Buffalo heritage hints: grain elevators silhouettes, industrial waterfront remnants, Olmsted parkways where relevant.
  - Avoid naming other cities or importing their famous skylines.
- mustKeep: 2–4 short bullet strings that preserve identity.
- changes: 3–6 short bullet strings describing plausible changes for that landmark under the theme + year.
- cameraHint: short and different per landmark; prefer clear composition.

Now output JSON only.
`.trim();
}
