import type { APIEvent } from "@solidjs/start/server";
import { getMockBracket, jsonResponse } from "~/lib/mockBracket";

/*
 * MOCK of getBracket.mjs
 *   GET /api/bracket?slug=default
 */
export async function GET({ request }: APIEvent) {
  const slug = new URL(request.url).searchParams.get("slug") || "default";
  return jsonResponse({ ok: true, bracket: { ...getMockBracket(), slug } });
}
