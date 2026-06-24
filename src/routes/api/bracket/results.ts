import type { APIEvent } from "@solidjs/start/server";
import { getMockBracket, jsonResponse } from "~/lib/mockBracket";
import { parseResultsFile, applyResultsToConfig } from "~/lib/results";

/*
 * MOCK of applyResults.mjs
 *   POST /api/bracket/results  -> parse an uploaded JSON/CSV results file and
 *                                 fill in the current round's official winners.
 *
 * Body: { slug?, content: string }  (raw file text)
 */
export async function POST({ request }: APIEvent) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }

  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) {
    return jsonResponse({ ok: false, error: "No file content provided" }, 400);
  }

  let results;
  try {
    results = parseResultsFile(content);
  } catch {
    return jsonResponse({ ok: false, error: "Could not parse file" }, 400);
  }
  if (!results.length) {
    return jsonResponse(
      { ok: false, error: "No usable rows found in the file" },
      400,
    );
  }

  const cfg = getMockBracket();
  const { winners, champion, updated, round, undecided } = applyResultsToConfig(
    cfg,
    results,
  );
  cfg.winners = winners;
  cfg.champion = champion;
  cfg.updatedAt = new Date().toISOString();

  return jsonResponse({
    ok: true,
    bracket: { ...cfg },
    updated,
    round,
    undecided,
  });
}
