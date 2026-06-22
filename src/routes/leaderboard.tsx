import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import Frame from "~/components/Frame";
import { defaultConfig, seedsToList } from "~/lib/bracket";
import { getBracket, getLeaderboard, type LeaderboardRow } from "~/lib/api";

export default function LeaderboardPage() {
  const [config, setConfig] = createSignal(defaultConfig());
  const [rows, setRows] = createSignal<LeaderboardRow[]>([]);
  const [loaded, setLoaded] = createSignal(false);

  onMount(async () => {
    const [cfg, board] = await Promise.all([getBracket(), getLeaderboard()]);
    setConfig(cfg);
    setRows(board);
    setLoaded(true);
  });

  const nameList = createMemo(() =>
    seedsToList(config().leftSeeds, config().rightSeeds),
  );
  const champName = (seed: number | null) =>
    seed == null ? "—" : nameList()[seed - 1] || `Seed ${seed}`;

  const rankColor = (i: number) =>
    i === 0
      ? "text-yellow-400"
      : i === 1
        ? "text-slate-300"
        : i === 2
          ? "text-amber-600"
          : "text-slate-500";

  return (
    <Frame>
      <div class="mb-4 flex items-center justify-between gap-3">
        <A
          href="/"
          class="text-[10px] font-mono uppercase tracking-widest text-slate-400 transition-colors hover:text-cyan-300"
        >
          ← Back to Bracket
        </A>
        <A
          href="/picks"
          class="text-[10px] font-mono uppercase tracking-widest text-slate-400 transition-colors hover:text-cyan-300"
        >
          Make Picks →
        </A>
      </div>

      <div class="mb-5 text-center">
        <h1 class="text-xl font-black italic uppercase tracking-wider text-cyan-400 text-shadow-glow">
          Leaderboard
        </h1>
        <p class="mt-1 text-[11px] tracking-wide text-slate-400">
          Ranked by correct picks vs. the official bracket · 10 points each.
        </p>
      </div>

      <div class="mx-auto max-w-2xl">
        <Show
          when={loaded()}
          fallback={
            <div class="py-16 text-center text-sm font-mono tracking-widest text-slate-400">
              Loading leaderboard…
            </div>
          }
        >
          <Show
            when={rows().length > 0}
            fallback={
              <div class="rounded-xl border border-slate-700/60 bg-slate-900/40 py-12 text-center text-sm text-slate-400">
                No picks submitted yet.
              </div>
            }
          >
            <div class="overflow-hidden rounded-xl border border-slate-700/60">
              <div class="grid grid-cols-[2rem_1fr_3.5rem_4rem] gap-2 border-b border-slate-700/60 bg-slate-900/70 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:grid-cols-[2.5rem_1fr_5rem_5rem] sm:px-4">
                <span>#</span>
                <span>Bracket</span>
                <span class="text-right">Correct</span>
                <span class="text-right">Points</span>
              </div>
              <For each={rows()}>
                {(row, i) => (
                  <A
                    href={`/pick/${encodeURIComponent(row.userName)}`}
                    class="grid grid-cols-[2rem_1fr_3.5rem_4rem] items-center gap-2 border-b border-slate-800/60 bg-slate-950/40 px-3 py-2.5 transition-colors last:border-0 hover:bg-slate-800/40 sm:grid-cols-[2.5rem_1fr_5rem_5rem] sm:px-4"
                  >
                    <span class={`text-sm font-black tabular-nums ${rankColor(i())}`}>
                      {i() + 1}
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-bold text-white">
                        {row.userName}
                      </span>
                      <span class="block truncate text-[10px] font-mono text-slate-500">
                        champ pick: {champName(row.champion)}
                      </span>
                    </span>
                    <span class="text-right text-sm font-mono tabular-nums text-slate-300">
                      {row.correct}
                    </span>
                    <span class="text-right text-base font-black tabular-nums text-cyan-300">
                      {row.points}
                    </span>
                  </A>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </Frame>
  );
}
