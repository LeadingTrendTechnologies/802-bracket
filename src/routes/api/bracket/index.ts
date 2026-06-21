import type { APIEvent } from "@solidjs/start/server";
import { getMockBracket, getMockPicks, jsonResponse } from "~/lib/mockBracket";

/*
 * MOCK of getBracket.mjs
 *   GET /api/bracket?slug=default
 *   GET /api/bracket?slug=default&user=Name  -> also include that user's picks
 */
export async function GET({ request }: APIEvent) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "default";
  const user = url.searchParams.get("user");

  const body: Record<string, unknown> = {
    ok: true,
    bracket: { ...getMockBracket(), slug },
  };
  if (user) {
    const p = getMockPicks().find((x) => x.userName === user);
    body.pick = p
      ? { userName: p.userName, winners: p.winners, champion: p.champion }
      : null;
  }
  return jsonResponse(body);
}
