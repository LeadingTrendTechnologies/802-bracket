import type { APIEvent } from "@solidjs/start/server";
import {
  getMockBracket,
  getMockPicks,
  jsonResponse,
  type MockPick,
} from "~/lib/mockBracket";
import { gradePicks, CHAMPION_PICK_ID } from "~/lib/bracket";

/*
 * MOCK of submitPick.mjs / getLeaderboard.mjs
 *   POST /api/bracket/pick           -> create or update a participant's picks
 *   GET  /api/bracket/pick           -> leaderboard (scored live, 10 pts/pick)
 *   GET  /api/bracket/pick?user=Name -> a single user's full picks
 *
 * In-memory per dev-server process (held on globalThis).
 */
type StoredPick = MockPick;

export async function GET({ request }: APIEvent) {
  const user = new URL(request.url).searchParams.get("user");
  if (user) {
    const p = getMockPicks().find((x) => x.userName === user);
    return jsonResponse({
      ok: true,
      pick: p ? { userName: p.userName, winners: p.winners, champion: p.champion } : null,
    });
  }

  const cfg = getMockBracket();
  const leaderboard = getMockPicks()
    .map((p) => {
      const merged: Record<string, number> = { ...p.winners };
      if (p.champion != null) merged[CHAMPION_PICK_ID] = p.champion;
      const { correct, points } = gradePicks(cfg, merged);
      return {
        userName: p.userName,
        correct,
        points,
        champion: p.champion,
        updatedAt: p.updatedAt,
      };
    })
    .sort((a, b) => b.points - a.points || a.updatedAt - b.updatedAt);
  return jsonResponse({ ok: true, leaderboard });
}

export async function POST({ request }: APIEvent) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }

  const userName = typeof body.userName === "string" ? body.userName.trim() : "";
  if (!userName) {
    return jsonResponse({ ok: false, error: "userName is required" }, 400);
  }

  const entry: StoredPick = {
    userName,
    winners: (body.winners as Record<string, number>) || {},
    champion: (body.champion as number | null) ?? null,
    tiebreaker: (body.tiebreaker as number | null) ?? null,
    score: 0,
    updatedAt: Date.now(),
  };

  const picks = getMockPicks();
  const idx = picks.findIndex((p) => p.userName === userName);
  if (idx >= 0) picks[idx] = entry;
  else picks.push(entry);

  return jsonResponse({ ok: true, pick: entry });
}
