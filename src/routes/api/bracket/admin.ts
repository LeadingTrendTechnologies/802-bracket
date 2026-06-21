import type { APIEvent } from "@solidjs/start/server";
import { applyBracketUpdate, jsonResponse } from "~/lib/mockBracket";

/*
 * MOCK of createAdminBracket.mjs
 *   POST /api/bracket/admin
 */
export async function POST({ request }: APIEvent) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* empty body -> returns current state */
  }
  const bracket = applyBracketUpdate(body);
  return jsonResponse({ ok: true, created: false, bracket });
}
