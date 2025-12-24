"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type ApiOverloadPayload = {
  ok: false;
  errorCode: "MODEL_OVERLOADED";
  phase?: "text" | "image" | "unknown";
  message: string;
  retryAfterMs?: number;
  detail?: string;
};

function isOverloadPayload(x: any): x is ApiOverloadPayload {
  return x && x.errorCode === "MODEL_OVERLOADED";
}

type Stage =
  | "idle"
  | "world"
  | "prompting"
  | "images"
  | "finalizing"
  | "done"
  | "overload"
  | "error";

function stageLabel(s: Stage) {
  switch (s) {
    case "world":
      return "Tuning the timeline…";
    case "prompting":
      return "Wiring the vibes…";
    case "images":
      return "Rendering 3 glitched frames…";
    case "finalizing":
      return "Polishing the output…";
    case "overload":
      return "Glitch surge — model overloaded…";
    case "error":
      return "Something went wrong…";
    default:
      return "";
  }
}

export default function Home() {
  const DEFAULT_YEAR = "2075";
  const DEFAULT_THEME = THEMES[0];
  const DEFAULT_GLITCH = 50;

  const [year, setYear] = useState(DEFAULT_YEAR);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [glitch, setGlitch] = useState(DEFAULT_GLITCH);

  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [overload, setOverload] = useState<ApiOverloadPayload | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const nowTick = useNowTick(250);

  const cooldownRemainingMs = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, cooldownUntil - nowTick);
  }, [cooldownUntil, nowTick]);

  const canRetry = !loading && (!!overload ? cooldownRemainingMs === 0 : true);

  const [stage, setStage] = useState<Stage>("idle");
  const stageTimersRef = useRef<number[]>([]);

  function clearStageTimers() {
    for (const id of stageTimersRef.current) window.clearTimeout(id);
    stageTimersRef.current = [];
  }

  function startStages() {
    clearStageTimers();
    setStage("world");
    stageTimersRef.current.push(
      window.setTimeout(() => setStage("prompting"), 900),
      window.setTimeout(() => setStage("images"), 2200),
      window.setTimeout(() => setStage("finalizing"), 5200)
    );
  }

  function stopStages(final: Stage) {
    clearStageTimers();
    setStage(final);
    if (final === "done" || final === "idle") return;
    stageTimersRef.current.push(window.setTimeout(() => setStage("idle"), 2500));
  }

  const inputsDisabled = loading;

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  function onReset() {
    if (loading) return;

    setYear(DEFAULT_YEAR);
    setTheme(DEFAULT_THEME);
    setGlitch(DEFAULT_GLITCH);

    setResp(null);
    setError(null);
    setOverload(null);
    setCooldownUntil(null);
    setOpenIdx(null);

    stopStages("idle");
  }

  async function onGenerate() {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResp(null);
    setOverload(null);
    setCooldownUntil(null);
    setOpenIdx(null);

    startStages();

    try {
      const yearNum = Number(year);

      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: yearNum, theme, glitch }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        if (r.status === 503 && isOverloadPayload(data)) {
          setOverload(data);
          const ms = typeof data.retryAfterMs === "number" ? data.retryAfterMs : 8000;
          setCooldownUntil(Date.now() + ms);
          stopStages("overload");
          return;
        }

        setResp(data);
        stopStages("error");
        throw new Error(data?.error || "Request failed");
      }

      setResp(data);
      stopStages("done");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      stopStages("error");
    } finally {
      setLoading(false);
    }
  }

  // ESC to close modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIdx(null);
    }
    if (openIdx !== null) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIdx]);

  // Lock background scroll when modal is open (iOS-safe)
  useEffect(() => {
    if (openIdx === null) return;

    const scrollY = window.scrollY || 0;
    document.body.dataset.scrollY = String(scrollY);

    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    document.body.style.top = `-${scrollY}px`;

    return () => {
      const y = Number(document.body.dataset.scrollY || "0");

      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
      document.body.style.top = "";
      delete document.body.dataset.scrollY;

      window.scrollTo(0, y);
    };
  }, [openIdx]);

  const modalData =
    openIdx !== null && resp?.world && Array.isArray(resp?.images)
      ? {
          img: resp.images[openIdx],
          plan: resp.world.landmarks?.[openIdx],
          world: resp.world,
        }
      : null;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Buffalo Timeline Glitch Generator</h1>
        <p className="mt-2 text-sm text-white/70">
          One click → alternate-history Buffalo landmarks.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/95 p-5 shadow-sm text-gray-900">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-900">Year</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1920 or 2075"
                disabled={inputsDisabled}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900">Theme</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                disabled={inputsDisabled}
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900">
                Glitch: {glitchLabel(glitch)}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={glitch}
                onChange={(e) => setGlitch(Number(e.target.value))}
                className="mt-3 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={inputsDisabled}
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Minor</span>
                <span>Unstable</span>
                <span>Chaotic</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={onGenerate}
              disabled={loading || (!!overload && cooldownRemainingMs > 0)}
              className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Timeline"}
            </button>

            <button
              onClick={onReset}
              disabled={loading}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
              title="Reset inputs and clear results"
            >
              Reset
            </button>
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border bg-gray-50 p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
              <div className="text-sm text-gray-700">{stageLabel(stage)}</div>
            </div>
          )}

          {overload && (
            <div className="mt-4 rounded-2xl border bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-900">
                Glitch surge — the model is overloaded
              </div>
              <p className="mt-1 text-sm text-amber-800">
                {overload.message}
                {overload.phase ? (
                  <span className="ml-1 text-amber-700">(phase: {overload.phase})</span>
                ) : null}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={onGenerate}
                  disabled={!canRetry}
                  className="rounded-xl bg-amber-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {cooldownRemainingMs > 0
                    ? `Retry in ${Math.ceil(cooldownRemainingMs / 1000)}s`
                    : "Retry now"}
                </button>

                <span className="text-xs text-amber-800">
                  Tip: chaotic glitch + busy times can spike overload. Try again in a moment.
                </span>
              </div>
            </div>
          )}

          {error && !overload && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

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

                <div className="mt-3 text-xs text-gray-500">
                  Tip: click an image to expand + read what changed.
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {resp.images?.map((img: any, i: number) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setOpenIdx(i)}
                    className="overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    title="Click to expand"
                    aria-label={`Open ${img.landmark}`}
                  >
                    <div className="p-3">
                      <div className="text-sm font-medium">{img.landmark}</div>
                      <div className="text-xs text-gray-500">
                        {resp.world.theme} • {resp.world.year} • glitch: {resp.world.glitch}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400">Click to expand</div>
                    </div>

                    <img
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={img.landmark}
                      className="h-64 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {resp && !resp.world && !overload && (
            <pre className="mt-4 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
              {JSON.stringify(resp, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* ✅ Modal: background locked + modal scroll works on desktop + mobile + iOS */}
      {modalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overscroll-contain"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenIdx(null)}
        >
          <div
            className="w-full max-w-5xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-start justify-between gap-4 border-b p-4 shrink-0">
              <div>
                <div className="text-sm text-gray-500">Expanded view</div>
                <div className="text-xl font-semibold text-gray-900">{modalData.img.landmark}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {modalData.world.theme} • {modalData.world.year} • glitch: {modalData.world.glitch}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpenIdx(null)}
                className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                aria-label="Close"
                title="Close (Esc)"
              >
                Close
              </button>
            </div>

            {/* ✅ key change:
                - On mobile: whole area under header scrolls (so stacked layout works)
                - On md+: keep split layout; right panel scrolls independently
            */}
            <div className="flex-1 min-h-0 modal-scroll overflow-y-auto md:overflow-hidden">
              <div className="grid md:grid-cols-2 md:h-full">
                {/* Left: image */}
                <div className="bg-black flex items-center justify-center md:min-h-0">
                  <img
                    src={`data:${modalData.img.mimeType};base64,${modalData.img.base64}`}
                    alt={modalData.img.landmark}
                    className="w-full object-contain"
                    style={{
                      // mobile: keep image reasonable; desktop: will naturally fit the md split
                      maxHeight: "calc(100vh - 2rem - 73px)",
                    }}
                  />
                </div>

                {/* Right: details (scrolls on desktop; on mobile it just flows inside the parent scroller) */}
                <div className="md:min-h-0 md:overflow-y-auto md:modal-scroll p-5 border-t md:border-t-0 md:border-l">
                  <div className="text-sm font-semibold text-gray-900">
                    How it differs in this timeline
                  </div>

                  <div className="mt-3 space-y-4 text-sm text-gray-700">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs font-semibold text-gray-600">
                        What changed (glitched modifications)
                      </div>
                      {modalData.plan?.changes?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {modalData.plan.changes.slice(0, 10).map((c: string, idx: number) => (
                            <li key={`${idx}-${c}`}>{c}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-gray-500">
                          Subtle civic upgrades + atmosphere changes consistent with the theme.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border p-3">
                      <div className="text-xs font-semibold text-gray-600">
                        Still recognizable because…
                      </div>
                      {modalData.plan?.mustKeep?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {modalData.plan.mustKeep.slice(0, 10).map((m: string, idx: number) => (
                            <li key={`${idx}-${m}`}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-gray-500">
                          Core landmark form + Buffalo setting cues are preserved.
                        </p>
                      )}
                    </div>

                    {modalData.plan?.cameraHint ? (
                      <div className="rounded-xl border p-3">
                        <div className="text-xs font-semibold text-gray-600">Camera hint</div>
                        <div className="mt-1 text-sm text-gray-700">{modalData.plan.cameraHint}</div>
                      </div>
                    ) : null}

                    <div className="text-xs text-gray-500">
                      Tip: press <span className="font-semibold">Esc</span> to close.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end modal body */}
          </div>
        </div>
      )}
    </main>
  );
}

function useNowTick(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  const msRef = useRef(ms);
  useEffect(() => {
    msRef.current = ms;
  }, [ms]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), msRef.current);
    return () => clearInterval(id);
  }, []);
  return now;
}
