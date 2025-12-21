import type { Landmark } from "./landmarks";

export type GlitchTier = "minor" | "unstable" | "chaotic";

export type WorldLandmarkPlan = {
  id: Landmark["id"];
  name: string;

  // what must remain recognizable to preserve landmark identity
  mustKeep: string[];

  // future changes to apply for this timeline
  changes: string[];

  // optional per-landmark camera framing hints
  cameraHint?: string;
};

export type WorldState = {
  year: number;
  theme: string;
  glitch: GlitchTier;

  timelineName: string; // fun title like “Steel Bloom Paradox”
  globalStyle: {
    realism: "photorealistic";
    lighting: string; // e.g. “overcast winter daylight”
    palette: string;  // e.g. “cool neutrals with industrial rust accents”
    camera: string;   // e.g. “street-level wide lens”
    mood: string;     // e.g. “optimistic but unstable”
  };

  motifs: string[];       // recurring details across all images
  glitchSignature: string[]; // how the glitch should look visually
  glitchNotes: string;    // short summary for UI

  landmarks: WorldLandmarkPlan[];
};
