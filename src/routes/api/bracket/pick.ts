import type { APIEvent } from "@solidjs/start/server";
import { jsonResponse } from "~/lib/mockBracket";

/*
 * MOCK of submitPick.mjs / leaderboard
 *   POST /api/bracket/pick  -> create or update a participant's picks
 *   GET  /api/bracket/pick  -> leaderboard
 *
 * In-memory per dev-server process (held on globalThis).
 */
type StoredPick = {
  userName: string;
  winners: Record<string, string>;
  champion: string | null;
  tiebreaker: number | null;
  score: number;
  updatedAt: number;
};

function getPicks(): StoredPick[] {
  const g = globalThis as unknown as { __mockPicks?: StoredPick[] };
  g.__mockPicks ??= [];
  return g.__mockPicks;
}

export async function GET() {
  const leaderboard = [...getPicks()]
    .sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt)
    .map(({ userName, score, champion, updatedAt }) => ({
      userName,
      score,
      champion,
      updatedAt,
    }));
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
    winners: (body.winners as Record<string, string>) || {},
    champion: (body.champion as string | null) ?? null,
    tiebreaker: (body.tiebreaker as number | null) ?? null,
    score: 0,
    updatedAt: Date.now(),
  };

  const picks = getPicks();
  const idx = picks.findIndex((p) => p.userName === userName);
  if (idx >= 0) picks[idx] = entry;
  else picks.push(entry);

  return jsonResponse({ ok: true, pick: entry });
}
