import { defaultConfig, type BracketConfig } from "./bracket";

/*
 * Shared in-memory store for the MOCK API routes (dev only). Held on
 * globalThis so it survives dev-server module reloads between requests.
 * Mirrors the AWS Lambda I/O shapes.
 */
export type StoredBracket = BracketConfig & {
  slug: string;
  status: string;
  updatedAt: string;
};

export const EDITABLE_KEYS: (keyof BracketConfig)[] = [
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
  "currentRound",
  "currentTrack",
  "leftSeeds",
  "rightSeeds",
  "winners",
  "champion",
];

export function getMockBracket(): StoredBracket {
  const g = globalThis as unknown as { __mockBracket?: StoredBracket };
  g.__mockBracket ??= {
    ...defaultConfig(),
    slug: "default",
    status: "open",
    updatedAt: new Date().toISOString(),
  };
  return g.__mockBracket;
}

export function applyBracketUpdate(
  body: Record<string, unknown>,
): StoredBracket {
  const stored = getMockBracket();
  for (const key of EDITABLE_KEYS) {
    if (body[key] !== undefined) {
      (stored as Record<string, unknown>)[key] = body[key];
    }
  }
  if (typeof body.slug === "string" && body.slug) stored.slug = body.slug;
  stored.updatedAt = new Date().toISOString();
  return stored;
}

export const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
