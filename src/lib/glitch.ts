import type { GlitchTier } from "./worldSchema";

export function glitchTierFromSlider(v: number): GlitchTier {
  if (v < 34) return "minor";
  if (v < 67) return "unstable";
  return "chaotic";
}
