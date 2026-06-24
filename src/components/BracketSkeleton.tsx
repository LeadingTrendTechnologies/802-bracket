import { For, Index } from "solid-js";

/*
 * Loading placeholder that mirrors BracketView's layout (header + left/right
 * rounds of 8 -> 4 -> 2 -> 1 around a center hub) using shimmering pills and
 * the real connector lines, so the page doesn't flash default data while the
 * bracket is being fetched.
 */
const ROUND_COUNTS = [8, 4, 2, 1];

function SkeletonSide(props: { side: "left" | "right" }) {
  const counts =
    props.side === "left" ? ROUND_COUNTS : [...ROUND_COUNTS].reverse();
  return (
    <div class={`bracket ${props.side} flex-1 min-w-0`}>
      <For each={counts}>
        {(count) => (
          <div class="round">
            <Index each={Array.from({ length: count })}>
              {() => (
                <div class="match">
                  <div class="my-1 w-full overflow-hidden rounded-md border border-slate-700/40 bg-slate-900/40">
                    <div class="flex items-center gap-2 px-2 py-1">
                      <div class="skeleton h-3 w-4 shrink-0" />
                      <div class="skeleton h-3 flex-1" />
                    </div>
                    <div class="flex items-center gap-2 border-t border-slate-700/30 px-2 py-1">
                      <div class="skeleton h-3 w-4 shrink-0" />
                      <div class="skeleton h-3 flex-1" />
                    </div>
                  </div>
                </div>
              )}
            </Index>
          </div>
        )}
      </For>
    </div>
  );
}

export default function BracketSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading bracket">
      {/* Header: starts · logo · final */}
      <div class="mb-4 flex flex-col items-center gap-6 sm:grid sm:grid-cols-3 sm:items-center sm:gap-2">
        <div class="flex w-full flex-col items-center gap-2 sm:items-start">
          <div class="skeleton h-2.5 w-16" />
          <div class="skeleton h-4 w-40" />
        </div>
        <div class="flex flex-col items-center justify-center gap-3">
          <div class="skeleton h-20 w-20 rounded-lg sm:h-28 sm:w-28" />
          <div class="skeleton h-4 w-44" />
        </div>
        <div class="flex w-full flex-col items-center gap-2 sm:items-end">
          <div class="skeleton h-2.5 w-16" />
          <div class="skeleton h-4 w-40" />
        </div>
      </div>

      {/* Status line */}
      <div class="mb-3 flex justify-center">
        <div class="skeleton h-6 w-64 rounded-lg" />
      </div>

      {/* Bracket field */}
      <div class="-mx-1 overflow-x-auto px-1 custom-scrollbar">
        <div class="flex min-h-[480px] min-w-[1400px] items-stretch gap-2 lg:min-w-0">
          <SkeletonSide side="left" />

          {/* Center hub */}
          <div class="flex w-[200px] shrink-0 flex-col items-center justify-center gap-3 px-1">
            <div class="skeleton h-8 w-8 rounded-full" />
            <div class="skeleton h-28 w-full rounded-xl" />
            <div class="skeleton h-3 w-24" />
          </div>

          <SkeletonSide side="right" />
        </div>
      </div>

      {/* Footer */}
      <div class="mt-5 flex flex-col items-center gap-2">
        <div class="skeleton h-3 w-48" />
        <div class="skeleton h-2.5 w-32" />
      </div>
    </div>
  );
}
