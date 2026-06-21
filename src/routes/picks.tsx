import { onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import PicksEditor from "~/components/PicksEditor";
import { getMyBracket } from "~/lib/owner";

export default function PicksPage() {
  const navigate = useNavigate();

  // If this browser already owns a bracket, they can't create another —
  // send them to edit their existing one.
  onMount(() => {
    const mine = getMyBracket();
    if (mine) navigate(`/pick/${encodeURIComponent(mine)}`, { replace: true });
  });

  return (
    <PicksEditor
      heading="Make Your Picks"
      onSaved={(name) => navigate(`/pick/${encodeURIComponent(name)}`)}
    />
  );
}
