import { createMemo, createSignal, onMount } from "solid-js";
import { A } from "@solidjs/router";
import Frame from "~/components/Frame";
import BracketView from "~/components/BracketView";
import { defaultConfig, resolveBracket } from "~/lib/bracket";
import { getBracket } from "~/lib/api";

export default function BracketPage() {
  const [config, setConfig] = createSignal(defaultConfig());
  const bracket = createMemo(() => resolveBracket(config()));

  onMount(async () => setConfig(await getBracket()));

  return (
    <Frame>
      <div class="mb-4 flex items-center justify-between gap-3">
        <A
          href="/picks"
          class="rounded-md bg-linear-to-r from-cyan-500 to-blue-600 px-5 py-2 text-[12px] font-black uppercase tracking-widest text-black shadow-lg transition-all hover:brightness-110"
        >
          Make Your Picks →
        </A>
        <A
          href="/leaderboard"
          class="text-[10px] font-mono tracking-widest text-slate-400 hover:text-cyan-300 transition-colors uppercase"
        >
          Leaderboard
        </A>
      </div>

      <BracketView config={config()} bracket={bracket()} />
    </Frame>
  );
}
