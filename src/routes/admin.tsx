import { createMemo, createSignal, Index, Show, onMount, onCleanup } from "solid-js";
import { A } from "@solidjs/router";
import Frame from "~/components/Frame";
import BracketView from "~/components/BracketView";
import {
  defaultConfig,
  resolveBracket,
  type BracketConfig,
  type SeedPair,
} from "~/lib/bracket";
import { getBracket, saveBracket } from "~/lib/api";

export default function AdminPage() {
  const [config, setConfig] = createSignal<BracketConfig>(defaultConfig());
  const [savedTick, setSavedTick] = createSignal(0);
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const bracket = createMemo(() => resolveBracket(config()));

  // Initial load shouldn't count as an unsaved change.
  onMount(async () => setConfig(await getBracket()));

  // Warn before leaving with unsaved edits.
  onMount(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    onCleanup(() => window.removeEventListener("beforeunload", beforeUnload));
  });

  // Local edits stage changes; nothing hits the DB until "Save Changes".
  const commit = (cfg: BracketConfig) => {
    setConfig(cfg);
    setDirty(true);
  };

  const saveChanges = async () => {
    if (saving() || !dirty()) return;
    setSaving(true);
    try {
      await saveBracket(config());
      setDirty(false);
      setSavedTick(Date.now());
    } catch (err) {
      console.error(err);
      alert("Failed to save changes. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const patch = (p: Partial<BracketConfig>) => commit({ ...config(), ...p });

  const updateSeed = (
    side: "leftSeeds" | "rightSeeds",
    idx: number,
    key: keyof SeedPair,
    value: string,
  ) => {
    const seeds = config()[side].map((pair, i) =>
      i === idx ? { ...pair, [key]: value } : pair,
    );
    patch({ [side]: seeds } as Partial<BracketConfig>);
  };

  const pickWinner = (matchId: string, team: string) => {
    patch({ winners: { ...config().winners, [matchId]: team } });
  };

  const pickChampion = (team: string) => patch({ champion: team });

  const clearResults = () => {
    if (confirm("Clear all match results (keep seeds & info)?")) {
      patch({ winners: {}, champion: null });
    }
  };

  const resetAll = () => {
    if (confirm("Reset EVERYTHING to defaults?")) commit(defaultConfig());
  };

  const Field = (props: {
    label: string;
    value: () => string;
    onInput: (v: string) => void;
    accent?: "red";
  }) => (
    <label class="block">
      <span class="mb-1 block text-[10px] font-mono uppercase tracking-widest text-slate-400">
        {props.label}
      </span>
      <input
        type="text"
        value={props.value()}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        class={`w-full rounded border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-sm font-mono text-white focus:outline-none ${
          props.accent === "red" ? "focus:border-red-500" : "focus:border-cyan-500"
        }`}
      />
    </label>
  );

  return (
    <Frame>
      {/* Top strip */}
      <div class="mb-5 flex items-center justify-between">
        <A
          href="/"
          class="text-[10px] font-mono tracking-widest text-slate-400 hover:text-cyan-300 transition-colors uppercase"
        >
          ← View Public Bracket
        </A>
        <div class="flex items-center gap-3">
          <Show when={dirty()}>
            <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              ● Unsaved changes
            </span>
          </Show>
          <Show when={!dirty() && savedTick() > 0}>
            <span class="text-[10px] font-mono uppercase tracking-widest text-green-400">
              ✓ Saved
            </span>
          </Show>
          <button
            type="button"
            onClick={saveChanges}
            disabled={!dirty() || saving()}
            class="rounded-md bg-linear-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-black shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {saving() ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div class="mb-3 text-center">
        <h1 class="text-xl font-black italic uppercase tracking-wider text-cyan-400 text-shadow-glow">
          Admin · Set Results &amp; Info
        </h1>
        <p class="mt-1 text-[11px] tracking-wide text-slate-400">
          Click drivers to advance them, then hit{" "}
          <span class="font-bold text-cyan-300">Save Changes</span> to publish to
          the public bracket.
        </p>
      </div>

      {/* Interactive bracket */}
      <BracketView
        config={config()}
        bracket={bracket()}
        interactive
        onPick={pickWinner}
        onPickChampion={pickChampion}
      />

      {/* Editor */}
      <div class="mx-auto mt-8 max-w-4xl border-t border-slate-700/60 pt-6">
        {/* Event info */}
        <section class="mb-8 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
          <h2 class="mb-3 text-[11px] font-bold font-mono uppercase tracking-widest text-cyan-300">
            Event Info
          </h2>
          <div class="mb-3 rounded-lg border border-green-600/40 bg-green-950/20 p-3">
            <p class="mb-2 text-[10px] font-bold font-mono uppercase tracking-widest text-green-300">
              Live Now · shown as a banner on the public bracket
            </p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Current round"
                value={() => config().currentRound}
                onInput={(v) => patch({ currentRound: v })}
              />
              <Field
                label="Current track / location"
                value={() => config().currentTrack}
                onInput={(v) => patch({ currentTrack: v })}
              />
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Title line 1"
              value={() => config().titleLine1}
              onInput={(v) => patch({ titleLine1: v })}
            />
            <Field
              label="Title line 2"
              value={() => config().titleLine2}
              onInput={(v) => patch({ titleLine2: v })}
            />
            <Field
              label="Start info (left header)"
              value={() => config().startInfo}
              onInput={(v) => patch({ startInfo: v })}
            />
            <Field
              label="Final info (right header)"
              value={() => config().finalInfo}
              onInput={(v) => patch({ finalInfo: v })}
              accent="red"
            />
            <Field
              label="Cash payout"
              value={() => config().payout}
              onInput={(v) => patch({ payout: v })}
            />
            <Field
              label="Weekly challenge note"
              value={() => config().weeklyNote}
              onInput={(v) => patch({ weeklyNote: v })}
            />
            <Field
              label="Left track name"
              value={() => config().leftTrack}
              onInput={(v) => patch({ leftTrack: v })}
            />
            <Field
              label="Left track subtitle"
              value={() => config().leftTrackSub}
              onInput={(v) => patch({ leftTrackSub: v })}
            />
            <Field
              label="Right track name"
              value={() => config().rightTrack}
              onInput={(v) => patch({ rightTrack: v })}
              accent="red"
            />
            <Field
              label="Right track subtitle"
              value={() => config().rightTrackSub}
              onInput={(v) => patch({ rightTrackSub: v })}
              accent="red"
            />
          </div>
        </section>

        {/* Seeds */}
        <section class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div class="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4">
            <h2 class="mb-3 text-[11px] font-bold font-mono uppercase tracking-widest text-blue-300">
              Left Bracket · Seeds 1–16
            </h2>
            <div class="space-y-2">
              <Index each={config().leftSeeds}>
                {(pair, i) => (
                  <div class="grid grid-cols-[1.25rem_1fr_1fr] items-center gap-2">
                    <span class="text-center text-[10px] font-black text-blue-400">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      title={pair().t1}
                      class="rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      value={pair().t1}
                      onInput={(e) =>
                        updateSeed("leftSeeds", i, "t1", e.currentTarget.value)
                      }
                    />
                    <input
                      type="text"
                      title={pair().t2}
                      class="rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      value={pair().t2}
                      onInput={(e) =>
                        updateSeed("leftSeeds", i, "t2", e.currentTarget.value)
                      }
                    />
                  </div>
                )}
              </Index>
            </div>
          </div>

          <div class="rounded-xl border border-red-800/40 bg-red-950/20 p-4">
            <h2 class="mb-3 text-[11px] font-bold font-mono uppercase tracking-widest text-red-300">
              Right Bracket · Seeds 17–32
            </h2>
            <div class="space-y-2">
              <Index each={config().rightSeeds}>
                {(pair, i) => (
                  <div class="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2">
                    <span class="text-center text-[10px] font-black text-red-400">
                      {i + 9}
                    </span>
                    <input
                      type="text"
                      title={pair().t1}
                      class="rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs font-mono focus:border-red-500 focus:outline-none"
                      value={pair().t1}
                      onInput={(e) =>
                        updateSeed("rightSeeds", i, "t1", e.currentTarget.value)
                      }
                    />
                    <input
                      type="text"
                      title={pair().t2}
                      class="rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs font-mono focus:border-red-500 focus:outline-none"
                      value={pair().t2}
                      onInput={(e) =>
                        updateSeed("rightSeeds", i, "t2", e.currentTarget.value)
                      }
                    />
                  </div>
                )}
              </Index>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearResults}
            class="rounded-md border border-slate-700 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:border-amber-600 hover:text-amber-400"
          >
            Clear Results
          </button>
          <div class="flex items-center gap-3">
            <button
              type="button"
              onClick={resetAll}
              class="rounded-md border border-slate-700 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:border-red-700 hover:text-red-400"
            >
              Reset All
            </button>
            <button
              type="button"
              onClick={saveChanges}
              disabled={!dirty() || saving()}
              class="rounded-md bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-2 text-[12px] font-black uppercase tracking-widest text-black shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {saving() ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </Frame>
  );
}
