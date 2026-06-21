import { For, Show } from "solid-js";
import type { BracketConfig, ResolvedBracket, ResolvedMatch } from "~/lib/bracket";

type Props = {
  config: BracketConfig;
  bracket: ResolvedBracket;
  interactive?: boolean;
  onPick?: (matchId: string, team: string) => void;
  onPickChampion?: (team: string) => void;
};

export default function BracketView(props: Props) {
  const pick = (matchId: string, team: string) => {
    if (!props.interactive || !team || team === "TBD") return;
    props.onPick?.(matchId, team);
  };

  const Slot = (sp: {
    side: "left" | "right";
    team: string;
    seed?: number;
    active: boolean;
    onPick: () => void;
  }) => {
    const isTbd = () => !sp.team || sp.team === "TBD";
    const base = `flex items-center gap-2 w-full px-2 py-1 text-[11px] font-mono tracking-wide transition-colors ${
      sp.side === "right" ? "flex-row-reverse text-right" : "text-left"
    } ${
      sp.active
        ? "bg-linear-to-r from-sky-400/40 via-blue-500/20 to-transparent text-sky-200 font-bold"
        : isTbd()
          ? "text-slate-600"
          : props.interactive
            ? "text-blue-100/80 hover:bg-sky-400/10 cursor-pointer"
            : "text-blue-100/80"
    }`;

    const inner = (
      <>
        <Show when={sp.seed !== undefined}>
          <span
            class={`shrink-0 w-5 text-center rounded-sm text-[9px] font-black leading-4 ${
              sp.active ? "bg-sky-300 text-slate-950" : "bg-blue-800/80 text-sky-200"
            }`}
          >
            {sp.seed}
          </span>
        </Show>
        <span class="truncate flex-1">{sp.team}</span>
      </>
    );

    return (
      <Show
        when={props.interactive && !isTbd()}
        fallback={<div class={base}>{inner}</div>}
      >
        <button type="button" class={base} onClick={sp.onPick}>
          {inner}
        </button>
      </Show>
    );
  };

  const MatchCard = (mp: {
    side: "left" | "right";
    r: number;
    match: ResolvedMatch;
    seedHi?: number;
    seedLo?: number;
  }) => {
    const m = mp.match;
    const isSeed = () => mp.r === 0;
    return (
      <div class="match">
        <div class="rounded-md overflow-hidden border border-blue-700/40 bg-blue-950/40 shadow-md backdrop-blur-sm">
          <Slot
            side={mp.side}
            team={m.t1}
            seed={isSeed() ? mp.seedHi : undefined}
            active={m.winner === m.t1 && m.t1 !== "TBD"}
            onPick={() => pick(m.id, m.t1)}
          />
          <div class="h-px bg-blue-800/50" />
          <Slot
            side={mp.side}
            team={m.t2}
            seed={isSeed() ? mp.seedLo : undefined}
            active={m.winner === m.t2 && m.t2 !== "TBD"}
            onPick={() => pick(m.id, m.t2)}
          />
        </div>
      </div>
    );
  };

  const TrackBadge = (bp: {
    name: string;
    sub: string;
    accent: string;
    icon: string;
  }) => (
    <div class="inline-flex items-center gap-2 rounded-full border border-slate-600/60 bg-slate-950/70 pl-2 pr-4 py-1.5 shadow-lg backdrop-blur">
      <span
        class={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${bp.accent}`}
      >
        {bp.icon}
      </span>
      <div class="leading-tight">
        <div class="text-[11px] font-black tracking-widest text-white uppercase">
          {bp.name}
        </div>
        <div class="text-[8px] font-bold tracking-[0.25em] text-slate-400 uppercase">
          {bp.sub}
        </div>
      </div>
    </div>
  );

  const championPick = (team: string) => {
    if (!props.interactive || !team || team === "TBD") return;
    props.onPickChampion?.(team);
  };

  return (
    <>
      {/* Header row */}
      <div class="grid grid-cols-3 items-center gap-2 mb-4">
        <div class="text-left">
          <p class="text-sm sm:text-xl font-black italic uppercase leading-none text-white">
            Starts
          </p>
          <p class="text-sm sm:text-xl font-black italic uppercase leading-none text-cyan-400 text-shadow-glow">
            {props.config.startInfo}
          </p>
        </div>

        <div class="flex justify-center">
          <div class="rounded-xl border border-slate-500/40 bg-linear-to-b from-slate-800/90 to-slate-950/90 px-5 py-2 text-center shadow-2xl">
            <div class="flex items-center justify-center gap-1.5 text-lg font-black italic tracking-tight">
              <span class="text-red-500">///</span>
              <span class="text-white">802</span>
              <span>🏎️</span>
            </div>
            <div class="-mt-0.5 text-xl sm:text-2xl font-black italic uppercase leading-none tracking-tighter text-white">
              {props.config.titleLine1}
            </div>
            <div class="text-base sm:text-lg font-black italic uppercase leading-none tracking-widest text-white">
              {props.config.titleLine2}
            </div>
            <div class="mt-0.5 text-[8px] font-bold uppercase tracking-[0.3em] text-cyan-400">
              iRacing Leagues
            </div>
          </div>
        </div>

        <div class="text-right">
          <p class="text-sm sm:text-xl font-black italic uppercase leading-none text-white">
            Final Round Hosted
          </p>
          <p class="text-sm sm:text-xl font-black italic uppercase leading-none text-red-400">
            {props.config.finalInfo}
          </p>
        </div>
      </div>

      {/* Track badges */}
      <div class="flex items-center justify-between mb-2">
        <TrackBadge
          name={props.config.leftTrack}
          sub={props.config.leftTrackSub}
          accent="bg-blue-600 text-white"
          icon="⭐"
        />
        <TrackBadge
          name={props.config.rightTrack}
          sub={props.config.rightTrackSub}
          accent="bg-red-600 text-white"
          icon="🏁"
        />
      </div>

      {/* Bracket field */}
      <div class="flex items-stretch gap-2 min-h-[480px]">
        {/* LEFT BRACKET */}
        <div class="bracket left flex-1">
          <For each={props.bracket.left}>
            {(round, r) => (
              <div class="round">
                <For each={round}>
                  {(match, i) => (
                    <MatchCard
                      side="left"
                      r={r()}
                      match={match}
                      seedHi={i() * 2 + 1}
                      seedLo={i() * 2 + 2}
                    />
                  )}
                </For>
              </div>
            )}
          </For>
        </div>

        {/* CENTER HUB */}
        <div class="w-[220px] shrink-0 flex flex-col items-center justify-center gap-2.5 px-1">
          <div class="w-full rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-center">
            <p class="text-[9px] font-black uppercase tracking-widest text-cyan-300">
              Weekly Challenge
            </p>
            <p class="text-[9px] font-mono text-slate-400">
              {props.config.weeklyNote}
            </p>
          </div>

          <div class="relative w-full rounded-xl border border-slate-700 bg-slate-950/90 p-4 text-center shadow-2xl">
            <div class="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded bg-red-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
              Winner Gets
            </div>
            <div class="mt-1 flex items-center justify-center gap-2">
              <span class="text-2xl">💵</span>
              <span class="text-2xl font-black italic tracking-tight text-yellow-400">
                {props.config.payout}
              </span>
            </div>
            <div class="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Payout
            </div>
          </div>

          <div class="w-full rounded-xl border border-yellow-600/40 bg-linear-to-b from-yellow-500/10 to-transparent p-3 text-center">
            <h2 class="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Grand Champion
            </h2>
            <div class="mt-2 space-y-1">
              <ChampSlot
                team={props.bracket.championship.t1}
                active={
                  props.bracket.championship.winner ===
                    props.bracket.championship.t1 &&
                  props.bracket.championship.t1 !== "TBD"
                }
                interactive={props.interactive}
                onPick={() => championPick(props.bracket.championship.t1)}
              />
              <div class="text-[8px] font-black uppercase tracking-widest text-slate-600">
                vs
              </div>
              <ChampSlot
                team={props.bracket.championship.t2}
                active={
                  props.bracket.championship.winner ===
                    props.bracket.championship.t2 &&
                  props.bracket.championship.t2 !== "TBD"
                }
                interactive={props.interactive}
                onPick={() => championPick(props.bracket.championship.t2)}
              />
              <div class="pt-1 text-sm font-black italic text-yellow-400 text-shadow-glow">
                {props.bracket.championship.winner || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT BRACKET (rounds reversed so the final sits nearest center) */}
        <div class="bracket right flex-1">
          <For each={props.bracket.right.slice().reverse()}>
            {(round, ri) => {
              const realR = () => props.bracket.right.length - 1 - ri();
              return (
                <div class="round">
                  <For each={round}>
                    {(match, i) => (
                      <MatchCard
                        side="right"
                        r={realR()}
                        match={match}
                        seedHi={i() * 2 + 17}
                        seedLo={i() * 2 + 18}
                      />
                    )}
                  </For>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Bottom banner */}
      <div class="mt-5 rounded-lg border border-slate-600/40 bg-linear-to-b from-slate-800/80 to-slate-950/80 py-2 text-center shadow-inner">
        <span class="text-lg sm:text-xl font-black italic uppercase tracking-[0.25em] text-white">
          iRacing Leagues
        </span>
        <span class="ml-3 text-[9px] font-bold uppercase tracking-[0.3em] text-cyan-400">
          Presented by <span class="text-red-500">///</span>802
        </span>
      </div>
    </>
  );
}

function ChampSlot(props: {
  team: string;
  active: boolean;
  interactive?: boolean;
  onPick: () => void;
}) {
  const isTbd = () => !props.team || props.team === "TBD";
  const cls = `w-full rounded px-2 py-1.5 text-[11px] font-mono font-bold tracking-wide transition-colors ${
    props.active
      ? "bg-yellow-400 text-slate-950"
      : "bg-slate-900 text-slate-300"
  } ${props.interactive && !isTbd() ? "hover:bg-slate-800 cursor-pointer" : ""}`;
  return (
    <Show when={props.interactive && !isTbd()} fallback={<div class={cls}>{props.team}</div>}>
      <button type="button" class={cls} onClick={props.onPick}>
        {props.team}
      </button>
    </Show>
  );
}
