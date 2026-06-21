import type { JSX } from "solid-js";

export default function Frame(props: { children: JSX.Element }) {
  return (
    <div class="min-h-screen w-full bg-slate-950 text-white font-sans flex items-center justify-center p-3 sm:p-6">
      <div class="chrome-frame w-full max-w-[1500px]">
        <div class="chrome-inner p-4 sm:p-7">
          <div class="circuit-bg" />
          <div class="speed-streak" />
          <div class="relative z-10">{props.children}</div>
        </div>
      </div>
    </div>
  );
}
