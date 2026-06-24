import { createMemo, createSignal, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import Frame from "~/components/Frame";
import BracketView from "~/components/BracketView";
import BracketSkeleton from "~/components/BracketSkeleton";
import {
  defaultConfig,
  gradePicks,
  isLocked,
  formatLockDate,
  resolveSeedBracket,
  seedsToList,
  CHAMPION_PICK_ID,
  TOTAL_MATCH_PICKS,
  type ResolvedBracket,
  type SeedMatch,
} from "~/lib/bracket";
import { getBracket, submitPick } from "~/lib/api";
import { getMyBracket, setMyBracket } from "~/lib/owner";

type Status = "idle" | "saving" | "saved" | "error";

export default function PicksEditor(props: {
  heading?: string;
  initialName?: string;
  lockName?: boolean;
  readOnly?: boolean;
  initialPicks?: Record<string, number>;
  onSaved?: (name: string) => void;
}) {
  const [config, setConfig] = createSignal(defaultConfig());
  const [picks, setPicks] = createSignal<Record<string, number>>({
    ...(props.initialPicks ?? {}),
  });
  const [userName, setUserName] = createSignal(props.initialName ?? "");
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      setConfig(await getBracket());
    } finally {
      setLoading(false);
    }
  });

  const nameList = createMemo(() =>
    seedsToList(config().leftSeeds, config().rightSeeds),
  );
  const nm = (seed: number | null) =>
    seed == null ? "TBD" : nameList()[seed - 1] || "TBD";

  const seedBracket = createMemo(() => resolveSeedBracket(picks()));

  const matchIndex = createMemo(() => {
    const map = new Map<string, SeedMatch>();
    const sb = seedBracket();
    for (const round of [...sb.left, ...sb.right])
      for (const m of round) map.set(m.id, m);
    return map;
  });

  const display = createMemo<ResolvedBracket>(() => {
    const sb = seedBracket();
    const conv = (m: SeedMatch) => ({
      id: m.id,
      t1: nm(m.s1),
      t2: nm(m.s2),
      winner: m.winner != null ? nm(m.winner) : null,
    });
    return {
      left: sb.left.map((r) => r.map(conv)),
      right: sb.right.map((r) => r.map(conv)),
      championship: {
        t1: nm(sb.championship.s1),
        t2: nm(sb.championship.s2),
        winner:
          sb.championship.winner != null ? nm(sb.championship.winner) : null,
      },
    };
  });

  const seedForTeam = (
    s1: number | null,
    s2: number | null,
    team: string,
  ): number | null => {
    if (s1 != null && nm(s1) === team) return s1;
    if (s2 != null && nm(s2) === team) return s2;
    return null;
  };

  const onPick = (matchId: string, team: string) => {
    const m = matchIndex().get(matchId);
    if (!m) return;
    const seed = seedForTeam(m.s1, m.s2, team);
    if (seed == null) return;
    setPicks((p) => ({ ...p, [matchId]: seed }));
    setStatus("idle");
  };

  const onPickChampion = (team: string) => {
    const c = seedBracket().championship;
    const seed = seedForTeam(c.s1, c.s2, team);
    if (seed == null) return;
    setPicks((p) => ({ ...p, [CHAMPION_PICK_ID]: seed }));
    setStatus("idle");
  };

  const matchPickCount = () =>
    Object.keys(picks()).filter((k) => k !== CHAMPION_PICK_ID).length;
  const hasChampion = () => picks()[CHAMPION_PICK_ID] != null;
  const complete = () => matchPickCount() >= TOTAL_MATCH_PICKS && hasChampion();

  // Grade picks against the official results (if any have been entered).
  const grade = createMemo(() => gradePicks(config(), picks()));
  const graded = () => Object.keys(grade().results).length > 0;

  // Lock state: past the cutoff OR an explicit read-only view.
  const locked = () => isLocked(config().lockAt);
  const editable = () => !props.readOnly && !locked();

  const resetPicks = () => {
    if (confirm("Clear all of your picks?")) {
      setPicks({});
      setStatus("idle");
    }
  };

  const submit = async () => {
    if (locked()) {
      setError("Picks are locked — the deadline has passed.");
      setStatus("error");
      return;
    }
    const name = (props.lockName ? props.initialName : userName())?.trim() ?? "";
    if (!name) {
      setError("Enter your name before submitting.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError("");
    const all = picks();
    const champion = all[CHAMPION_PICK_ID] ?? null;
    const winners: Record<string, number> = {};
    for (const [k, v] of Object.entries(all)) {
      if (k !== CHAMPION_PICK_ID) winners[k] = v;
    }
    try {
      await submitPick({ userName: name, winners, champion });
      setMyBracket(name); // this browser now owns this bracket
      setStatus("saved");
      props.onSaved?.(name);
    } catch (err) {
      console.error(err);
      setError("Could not save your picks. Please try again.");
      setStatus("error");
    }
  };

  return (
    <Frame>
      {/* Top strip */}
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <A
          href="/"
          class="text-[10px] font-mono uppercase tracking-widest text-slate-400 transition-colors hover:text-cyan-300"
        >
          ← Back to Bracket
        </A>
        <span class="text-[10px] font-mono uppercase tracking-widest text-slate-500">
          {matchPickCount()}/{TOTAL_MATCH_PICKS} matchups
          {hasChampion() ? " · champion set" : " · pick a champion"}
        </span>
      </div>

      <div class="mb-3 text-center">
        <h1 class="text-xl font-black italic uppercase tracking-wider text-cyan-400 text-shadow-glow">
          {props.heading ?? "Make Your Picks"}
        </h1>
        <p class="mt-1 text-[11px] tracking-wide text-slate-400">
          Click a driver in each matchup to advance them all the way to champion,
          then save your bracket.
        </p>
      </div>

      <Show when={!loading()} fallback={<BracketSkeleton />}>
      {/* Read-only / locked notice OR submission bar */}
      <Show
        when={editable()}
        fallback={
          <Show
            when={locked()}
            fallback={
              <div class="mx-auto mb-5 flex max-w-2xl flex-wrap items-center justify-center gap-3 rounded-xl border border-amber-600/40 bg-amber-950/20 p-3 text-center">
                <span class="text-[11px] font-mono uppercase tracking-widest text-amber-300">
                  Viewing only — this isn’t your bracket
                </span>
                <A
                  href={getMyBracket() ? `/pick/${encodeURIComponent(getMyBracket() as string)}` : "/picks"}
                  class="rounded-md border border-slate-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-colors hover:border-cyan-500 hover:text-cyan-300"
                >
                  {getMyBracket() ? "Go to your bracket →" : "Create your bracket →"}
                </A>
              </div>
            }
          >
            <div class="mx-auto mb-5 flex max-w-2xl flex-col items-center justify-center gap-1 rounded-xl border border-red-600/50 bg-red-950/25 p-3 text-center">
              <span class="text-[12px] font-black uppercase tracking-widest text-red-300">
                🔒 Picks are locked
              </span>
              <span class="text-[11px] font-mono tracking-wide text-slate-400">
                The deadline was {formatLockDate(config().lockAt)}. No more changes.
              </span>
            </div>
          </Show>
        }
      >
        <div class="mx-auto mb-5 flex max-w-2xl flex-col items-stretch justify-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Show
            when={!props.lockName}
            fallback={
              <span class="truncate px-1 text-center text-sm font-black uppercase tracking-wide text-white sm:flex-1 sm:text-left">
                {props.initialName}
              </span>
            }
          >
            <input
              type="text"
              placeholder="Your name"
              value={userName()}
              onInput={(e) => setUserName(e.currentTarget.value)}
              class="min-w-0 rounded border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm font-mono text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none sm:flex-1"
            />
          </Show>
          <div class="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetPicks}
              class="flex-1 rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:border-red-700 hover:text-red-400 sm:flex-none"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={status() === "saving"}
              class="flex-1 rounded-md bg-linear-to-r from-cyan-500 to-blue-600 px-5 py-1.5 text-[12px] font-black uppercase tracking-widest text-black shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              {status() === "saving"
                ? "Saving…"
                : props.lockName
                  ? "Save Changes"
                  : "Submit Picks"}
            </button>
          </div>
          <div class="w-full text-center">
            <Show when={status() === "saved"}>
              <span class="text-[11px] font-mono uppercase tracking-widest text-green-400">
                ✓ Picks saved{complete() ? "" : " (still incomplete)"}
              </span>
            </Show>
            <Show when={status() === "error"}>
              <span class="text-[11px] font-mono uppercase tracking-widest text-red-400">
                {error()}
              </span>
            </Show>
            <Show when={status() !== "error" && config().lockAt}>
              <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400/80">
                Picks lock {formatLockDate(config().lockAt)}
              </span>
            </Show>
          </div>
        </div>
      </Show>

      {/* Scoring summary (only once official results exist) */}
      <Show when={graded()}>
        <div class="mx-auto mb-4 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-lg border border-slate-700/60 bg-slate-900/50 px-4 py-2 text-center">
          <span class="text-sm font-black uppercase tracking-widest text-cyan-300">
            {grade().points} pts
          </span>
          <span class="text-[11px] font-mono uppercase tracking-widest text-slate-400">
            {grade().correct} correct · 10 pts each
          </span>
          <span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
            <span class="inline-block h-2 w-2 rounded-full bg-green-500" /> Correct
          </span>
          <span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-400">
            <span class="inline-block h-2 w-2 rounded-full bg-red-500" /> Incorrect
          </span>
        </div>
      </Show>

      <BracketView
        config={config()}
        bracket={display()}
        interactive={editable()}
        onPick={onPick}
        onPickChampion={onPickChampion}
        results={grade().results}
      />
      </Show>
    </Frame>
  );
}
