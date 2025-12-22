"use client";

import { useState } from "react";

const THEMES = [
  "Climate-Adaptive Waterfront",
  "Industrial Revival",
  "Bills Dynasty City",
  "Retro-Futurism 1980s",
  "Tech Boom Buffalo",
  "Post-Snowpocalypse Survival",
  "Utopian Transit Era",
];

function glitchLabel(v: number) {
  if (v < 34) return "Minor";
  if (v < 67) return "Unstable";
  return "Chaotic";
}

export default function Home() {
  const [year, setYear] = useState("2075");
  const [theme, setTheme] = useState(THEMES[0]);
  const [glitch, setGlitch] = useState(50);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResp(null);

    try {
      const yearNum = Number(year);

      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: yearNum, theme, glitch }),
      });

      const data = await r.json();

      if (!r.ok) {
        setResp(data); // show error/debug payload in UI
        throw new Error(data?.error || "Request failed");
      }

      setResp(data);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Buffalo Timeline Glitch Generator</h1>
        <p className="mt-2 text-sm text-gray-600">
          One click → alternate-history Buffalo landmarks.
        </p>

        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Year</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1920 or 2075"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Theme</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Glitch: {glitchLabel(glitch)}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={glitch}
                onChange={(e) => setGlitch(Number(e.target.value))}
                className="mt-3 w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Minor</span>
                <span>Unstable</span>
                <span>Chaotic</span>
              </div>
            </div>
          </div>

          <button
            onClick={onGenerate}
            disabled={loading}
            className="mt-5 rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Timeline"}
          </button>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Success UI */}
          {resp?.world && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">Timeline</div>
                <div className="text-lg font-semibold">{resp.world.timelineName}</div>
                <div className="mt-2 text-sm text-gray-700">{resp.world.glitchNotes}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {resp.world.motifs?.map((m: string) => (
                    <span key={m} className="rounded-full border px-2 py-1 text-xs">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {resp.images?.map((img: any) => (
                  <div
                    key={img.id}
                    className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                  >
                    <div className="p-3">
                      <div className="text-sm font-medium">{img.landmark}</div>
                      <div className="text-xs text-gray-500">
                        {resp.world.theme} • {resp.world.year} • glitch: {resp.world.glitch}
                      </div>
                    </div>

                    <img
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={img.landmark}
                      className="h-64 w-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Debug (optional while building) */}
              {resp.prompts && (
                <details className="rounded-2xl border bg-white p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Show prompts (debug)
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap text-xs text-gray-700">
                    {resp.prompts.join("\n\n---\n\n")}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Error/debug fallback UI */}
          {resp && !resp.world && (
            <pre className="mt-4 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
              {JSON.stringify(resp, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}