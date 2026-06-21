import type { APIEvent } from "@solidjs/start/server";
import { defaultConfig, type BracketConfig } from "~/lib/bracket";

/*
 * MOCK endpoint mirroring the AWS Lambdas:
 *   GET  /api/bracket?slug=default  -> getBracket.mjs
 *   POST /api/bracket               -> createAdminBracket.mjs
 *
 * State is held in-memory per dev-server process (resets on restart).
 * Replace by setting VITE_API_BASE_URL to your API Gateway URL.
 */
type StoredBracket = BracketConfig & {
  slug: string;
  status: string;
  updatedAt: string;
};

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

// Stored on globalThis so it survives dev-server module reloads between requests.
const store = globalThis as unknown as { __mockBracket?: StoredBracket };
store.__mockBracket ??= {
  ...defaultConfig(),
  slug: "default",
  status: "open",
  updatedAt: new Date().toISOString(),
};
const stored: StoredBracket = store.__mockBracket;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET({ request }: APIEvent) {
  const slug = new URL(request.url).searchParams.get("slug") || "default";
  return json({ ok: true, bracket: { ...stored, slug } });
}

export async function POST({ request }: APIEvent) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* empty body -> just returns current state */
  }

  for (const key of EDITABLE_KEYS) {
    if (body[key] !== undefined) {
      (stored as Record<string, unknown>)[key] = body[key];
    }
  }
  if (typeof body.slug === "string" && body.slug) stored.slug = body.slug;
  stored.updatedAt = new Date().toISOString();

  return json({ ok: true, created: false, bracket: stored });
}
