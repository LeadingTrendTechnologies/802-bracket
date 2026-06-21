import { defaultConfig, type BracketConfig } from "./bracket";

/*
 * Frontend API client.
 *
 * In development these hit the mock SolidStart routes under /api/*.
 * Set VITE_API_BASE_URL (e.g. your API Gateway URL) to point the same calls
 * at the real Lambda-backed endpoints instead.
 */
const env = ((import.meta as unknown as { env?: Record<string, string> }).env) ?? {};
const BASE = (env.VITE_API_BASE_URL as string) || "";

const BRACKET_PATH = "/api/bracket"; // GET -> getBracket, POST -> createAdminBracket
const PICKS_PATH = "/api/picks"; // GET -> leaderboard, POST -> submitPick

// Fields that mirror the editable columns on the Bracket model / BracketConfig.
const EDITABLE_KEYS: (keyof BracketConfig)[] = [
  "titleLine1",
  "titleLine2",
  "startInfo",
  "finalInfo",
  "leftTrack",
  "leftTrackSub",
  "rightTrack",
  "rightTrackSub",
  "payout",
  "weeklyNote",
  "leftSeeds",
  "rightSeeds",
  "winners",
  "champion",
];

// Map a raw bracket document (from the mock route or MongoDB) into a BracketConfig.
const toConfig = (raw: unknown): BracketConfig => {
  const base = defaultConfig();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  for (const key of EDITABLE_KEYS) {
    if (r[key] !== undefined && r[key] !== null) {
      (base as Record<string, unknown>)[key] = r[key];
    }
  }
  return base;
};

export async function getBracket(slug = "default"): Promise<BracketConfig> {
  try {
    const res = await fetch(
      `${BASE}${BRACKET_PATH}?slug=${encodeURIComponent(slug)}`,
    );
    if (!res.ok) return defaultConfig();
    const data = await res.json();
    return toConfig(data.bracket);
  } catch {
    return defaultConfig();
  }
}

export async function saveBracket(config: BracketConfig, slug = "default") {
  const body: Record<string, unknown> = { slug };
  for (const key of EDITABLE_KEYS) body[key] = config[key];

  const res = await fetch(`${BASE}${BRACKET_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`saveBracket failed (${res.status})`);
  return res.json();
}

export type PickSubmission = {
  slug?: string;
  userName: string;
  winners: Record<string, string>;
  champion: string | null;
  tiebreaker?: number | null;
};

export async function submitPick(pick: PickSubmission) {
  const res = await fetch(`${BASE}${PICKS_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "default", ...pick }),
  });
  if (!res.ok) throw new Error(`submitPick failed (${res.status})`);
  return res.json();
}

export async function getLeaderboard(slug = "default") {
  const res = await fetch(
    `${BASE}${PICKS_PATH}?slug=${encodeURIComponent(slug)}`,
  );
  if (!res.ok) throw new Error(`getLeaderboard failed (${res.status})`);
  return res.json();
}
