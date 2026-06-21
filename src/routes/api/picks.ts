import type { APIEvent } from "@solidjs/start/server";

/*
 * MOCK endpoint mirroring the AWS Lambdas:
 *   POST /api/picks  -> submitPick.mjs   (create/update a participant's picks)
 *   GET  /api/picks  -> getBracket.mjs   (leaderboard view)
 *
 * In-memory per dev-server process (resets on restart).
 */
type StoredPick = {
  userName: string;
  winners: Record<string, string>;
  champion: string | null;
  tiebreaker: number | null;
  score: number;
  updatedAt: number;
};

// Stored on globalThis so it survives dev-server module reloads between requests.
const store = globalThis as unknown as { __mockPicks?: StoredPick[] };
store.__mockPicks ??= [];
const picks: StoredPick[] = store.__mockPicks;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET() {
  const leaderboard = [...picks]
    .sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt)
    .map(({ userName, score, champion, updatedAt }) => ({
      userName,
      score,
      champion,
      updatedAt,
    }));
  return json({ ok: true, leaderboard });
}

export async function POST({ request }: APIEvent) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }

  const userName = typeof body.userName === "string" ? body.userName.trim() : "";
  if (!userName) return json({ ok: false, error: "userName is required" }, 400);

  const entry: StoredPick = {
    userName,
    winners: (body.winners as Record<string, string>) || {},
    champion: (body.champion as string | null) ?? null,
    tiebreaker: (body.tiebreaker as number | null) ?? null,
    score: 0,
    updatedAt: Date.now(),
  };

  const idx = picks.findIndex((p) => p.userName === userName);
  if (idx >= 0) picks[idx] = entry;
  else picks.push(entry);

  return json({ ok: true, pick: entry });
}
