export type Landmark = {
  id: string;
  name: string;
  baseFacts: string; // short anchor text to reduce “generic city” drift
};

export const LANDMARKS: Landmark[] = [
  {
    id: "canalside",
    name: "Canalside (Buffalo Waterfront)",
    baseFacts:
      "Buffalo, NY waterfront at Lake Erie/Buffalo River. Brick-and-steel Great Lakes industrial heritage, open promenades, public gathering spaces.",
  },
  {
    id: "cityhall",
    name: "Buffalo City Hall",
    baseFacts:
      "Iconic Art Deco civic tower in downtown Buffalo. Limestone/stone facade, clock tower, grand civic plaza feel, Great Lakes city atmosphere.",
  },
  {
    id: "keybank",
    name: "KeyBank Center",
    baseFacts:
      "Arena on Buffalo’s waterfront near Canalside/Lake Erie. Sports energy, event plaza, modern arena form integrated with waterfront context.",
  },
  {
    id: "niagarasq",
    name: "Niagara Square",
    baseFacts:
      "Major civic square in Buffalo with radial streets, monument centerpiece, classic downtown civic space.",
  },
  {
    id: "akg",
    name: "Buffalo AKG Art Museum",
    baseFacts:
      "Major art museum campus in Buffalo with modern + historic architecture, cultural institution setting.",
  },
  {
    id: "delawarepark",
    name: "Delaware Park / Hoyt Lake",
    baseFacts:
      "Large park landscape in Buffalo, tree-lined paths, lake setting, Olmsted park heritage, seasonal weather.",
  },
  {
    id: "peacebridge",
    name: "Peace Bridge",
    baseFacts:
      "Buffalo–Fort Erie border bridge over the Niagara River, steel bridge infrastructure and river context.",
  },
  {
    id: "electric_tower",
    name: "Electric Tower",
    baseFacts:
      "Historic downtown Buffalo building with distinctive illuminated tower character and early-20th-century architectural identity.",
  },
];

export function pickRandomLandmarks(n: number, seed?: number): Landmark[] {
  const arr = [...LANDMARKS];

  // Seeded RNG (Mulberry32) for reproducible picks when seed is provided.
  const rand = (() => {
    if (seed === undefined) return Math.random;
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  })();

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.slice(0, Math.min(n, arr.length));
}
