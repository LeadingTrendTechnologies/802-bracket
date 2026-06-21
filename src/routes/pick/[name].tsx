import { createResource, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import Frame from "~/components/Frame";
import PicksEditor from "~/components/PicksEditor";
import { getUserPicks } from "~/lib/api";
import { CHAMPION_PICK_ID } from "~/lib/bracket";
import { ownsBracket } from "~/lib/owner";

export default function UserPicksPage() {
  const params = useParams();
  const name = () => decodeURIComponent(params.name ?? "");

  // Re-fetch whenever the route param changes (navigating between brackets).
  const [picks] = createResource(name, async (n) => {
    const up = await getUserPicks(n);
    const map: Record<string, number> = { ...(up?.winners ?? {}) };
    if (up?.champion != null) map[CHAMPION_PICK_ID] = up.champion;
    return map;
  });

  return (
    <Show
      when={!picks.loading}
      fallback={
        <Frame>
          <div class="py-24 text-center text-sm font-mono tracking-widest text-slate-400">
            Loading {name()}’s bracket…
          </div>
        </Frame>
      }
    >
      {/* `keyed` re-creates the editor per bracket so it re-seeds its picks. */}
      <Show when={picks()} keyed>
        {(initialPicks) => (
          <PicksEditor
            heading={`${name()}’s Picks`}
            initialName={name()}
            lockName
            readOnly={!ownsBracket(name())}
            initialPicks={initialPicks}
          />
        )}
      </Show>
    </Show>
  );
}
