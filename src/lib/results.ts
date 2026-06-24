/* ============================================================
   Race-results ingestion

   The admin uploads a JSON or CSV file of finishing results for the
   CURRENT round. We translate those results into official winners for
   the bracket. A driver that is missing from the file is assumed to
   have lost, so the opponent who IS in the file advances.
   ============================================================ */
import {
  CHAMPION_PICK_ID,
  resolveSeedBracket,
  seedsToList,
  type BracketConfig,
} from "./bracket";

export type ResultEntry = { seed?: number; name?: string; position?: number };

// A matchup in the current round that couldn't be decided because neither
// competitor appeared in the uploaded results file.
export type UndecidedMatch = { id: string; t1: string; t2: string };

export type ApplyResult = {
  winners: Record<string, string>;
  champion: string | null;
  updated: number;
  // The round index that was filled (0 = opening round), or "final" for the
  // grand championship, or null when nothing could be decided.
  round: number | "final" | null;
  // Matchups in the current round left undecided (neither driver in the file),
  // returned so the admin can resolve them manually in the UI.
  undecided: UndecidedMatch[];
};

const toNum = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
};

/*
 * Normalize a driver name for matching. iRacing appends a number to duplicate
 * display names (e.g. "David Durand2", "Matt Taylor15"), so we drop a trailing
 * run of digits and lowercase/trim. Roman numerals like "III" are untouched.
 */
const normalizeName = (n: string): string =>
  n.toLowerCase().trim().replace(/\s*\d+$/, "").trim();

// Name suffixes ignored when comparing first/last name tokens.
const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

const tokenizeName = (n: string): string[] =>
  normalizeName(n)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !NAME_SUFFIXES.has(t));

/*
 * Build a name -> seed matcher from the seed-ordered name list. Tries an exact
 * (normalized) match first, then a fuzzy fallback: same LAST name where one
 * first name is a prefix/nickname of the other (e.g. "Christopher Muise" ->
 * "Chris Muise"). The fuzzy match is only used when exactly one bracket driver
 * qualifies, so ambiguous names are never guessed.
 */
const buildSeedMatcher = (nameList: string[]) => {
  type Entry = { seed: number; first: string; last: string };
  const entries: Entry[] = [];
  const exact = new Map<string, number>();
  nameList.forEach((n, i) => {
    if (!n) return;
    const toks = tokenizeName(n);
    if (!toks.length) return;
    const seed = i + 1;
    const key = toks.join(" ");
    if (!exact.has(key)) exact.set(key, seed);
    entries.push({ seed, first: toks[0], last: toks[toks.length - 1] });
  });

  return (name: string): number | undefined => {
    const toks = tokenizeName(name);
    if (!toks.length) return undefined;
    const hit = exact.get(toks.join(" "));
    if (hit != null) return hit;

    const first = toks[0];
    const last = toks[toks.length - 1];
    let found: number | undefined;
    let count = 0;
    for (const ent of entries) {
      if (ent.last !== last) continue;
      if (
        ent.first === first ||
        ent.first.startsWith(first) ||
        first.startsWith(ent.first)
      ) {
        found = ent.seed;
        count++;
      }
    }
    return count === 1 ? found : undefined;
  };
};

// Map an arbitrary column / property name to one of our known fields.
const fieldOf = (header: string): "seed" | "name" | "position" | null => {
  const h = header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (["seed", "seednum", "seednumber", "seedno"].includes(h)) return "seed";
  if (["name", "driver", "drivername", "racer", "fullname"].includes(h))
    return "name";
  if (
    [
      "position",
      "pos",
      "finish",
      "finpos",
      "finishpos",
      "finishposition",
      "finishingposition",
      "rank",
      "place",
      "result",
      "p",
    ].includes(h)
  )
    return "position";
  return null;
};

const fromObject = (o: Record<string, unknown>): ResultEntry => {
  const e: ResultEntry = {};
  for (const [k, v] of Object.entries(o)) {
    const f = fieldOf(k);
    if (f === "seed") e.seed = toNum(v);
    else if (f === "name") e.name = v == null ? undefined : String(v).trim();
    else if (f === "position") e.position = toNum(v);
  }
  return e;
};

/*
 * iRacing "event_result" payload (from the /data/results/get API). The finishing
 * order lives in session_results[].results[], with display_name + a 0-based
 * finish_position. We pick the RACE session and map each driver to a result
 * entry keyed by name (iRacing has no bracket seed). Position is finish + 1.
 */
type IRSession = {
  simsession_name?: string;
  simsession_type_name?: string;
  results?: Array<Record<string, unknown>>;
};

const parseIRacingEventResult = (
  data: Record<string, unknown>,
): ResultEntry[] => {
  const sessions = (data.session_results as IRSession[]) || [];
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const race =
    sessions.find(
      (s) => String(s?.simsession_name || "").toUpperCase() === "RACE",
    ) ||
    sessions.find(
      (s) => String(s?.simsession_type_name || "").toLowerCase() === "race",
    ) ||
    sessions[sessions.length - 1];
  const rows = (race?.results as Array<Record<string, unknown>>) || [];
  const out: ResultEntry[] = [];
  for (const r of rows) {
    const name =
      typeof r?.display_name === "string" ? r.display_name.trim() : "";
    if (!name) continue;
    const fp = typeof r?.finish_position === "number" ? r.finish_position : -1;
    const e: ResultEntry = { name };
    if (fp >= 0) e.position = fp + 1;
    out.push(e);
  }
  return out;
};

// Minimal CSV line splitter with basic double-quote support.
const splitCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

/*
 * Parse a results file (JSON or CSV) into a list of result entries.
 *
 * JSON accepts:
 *   ["Mark Whitley", "Kevin Tipton"]                 (names that advanced)
 *   [1, 16]                                          (seeds that advanced)
 *   [{ "seed": 1, "name": "...", "position": 1 }]    (objects, any subset)
 *   { "results": [ ... ] }                           (wrapped)
 *
 * CSV accepts a header row (columns like seed,name,position in any order) or
 * a headerless file (1 col = name; 2 cols = seed,name or name,position;
 * 3 cols = seed,name,position).
 */
export const parseResultsFile = (text: string): ResultEntry[] => {
  const trimmed = (text || "").trim();
  if (!trimmed) return [];

  // Try JSON first.
  try {
    const data = JSON.parse(trimmed);

    // iRacing event_result (optionally wrapped as { type, data: {...} }).
    const obj =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const nested =
      obj && obj.data && typeof obj.data === "object"
        ? (obj.data as Record<string, unknown>)
        : null;
    const ir = obj?.session_results ? obj : nested?.session_results ? nested : null;
    if (ir) {
      const entries = parseIRacingEventResult(ir);
      if (entries.length) return entries;
    }

    const arr: unknown[] | null = Array.isArray(data)
      ? data
      : Array.isArray((data as { results?: unknown[] })?.results)
        ? (data as { results: unknown[] }).results
        : null;
    if (arr) {
      return arr
        .map((item): ResultEntry => {
          if (typeof item === "string") return { name: item.trim() };
          if (typeof item === "number") return { seed: item };
          if (item && typeof item === "object")
            return fromObject(item as Record<string, unknown>);
          return {};
        })
        .filter((e) => e.seed != null || !!e.name);
    }
  } catch {
    /* not JSON — fall through to CSV */
  }

  // CSV. Keep blank lines so we can detect section boundaries (iRacing exports
  // a metadata block, a league block, then the results table, blank-separated).
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim());

  // Find the results header: a row with a NAME column plus a POSITION or SEED
  // column. This skips the leading metadata/league header rows.
  let headerIdx = -1;
  let headerMap: (ReturnType<typeof fieldOf>)[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    const m = splitCsvLine(lines[i]).map(fieldOf);
    if (m.includes("name") && (m.includes("position") || m.includes("seed"))) {
      headerIdx = i;
      headerMap = m;
      break;
    }
  }

  const out: ResultEntry[] = [];

  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < lines.length; i++) {
      if (!lines[i]) break; // end of the results section
      const cols = splitCsvLine(lines[i]);
      const e: ResultEntry = {};
      cols.forEach((c, idx) => {
        const f = headerMap[idx];
        if (f === "seed") e.seed = toNum(c);
        else if (f === "name") e.name = c.trim();
        else if (f === "position") e.position = toNum(c);
      });
      if (e.seed != null || e.name) out.push(e);
    }
    return out;
  }

  // Fallback: a simple single-table CSV (no rich header detected).
  const rows = lines.filter(Boolean).map(splitCsvLine);
  if (rows.length === 0) return [];

  const mapped = rows[0].map(fieldOf);
  const hasHeader = mapped.some((m) => m !== null);
  const dataRows = hasHeader ? rows.slice(1) : rows;

  for (const cols of dataRows) {
    const e: ResultEntry = {};
    if (hasHeader) {
      cols.forEach((c, i) => {
        const f = mapped[i];
        if (f === "seed") e.seed = toNum(c);
        else if (f === "name") e.name = c.trim();
        else if (f === "position") e.position = toNum(c);
      });
    } else if (cols.length === 1) {
      e.name = cols[0].trim();
    } else if (cols.length === 2) {
      // seed,name  OR  name,position
      if (toNum(cols[0]) != null && toNum(cols[1]) == null) {
        e.seed = toNum(cols[0]);
        e.name = cols[1].trim();
      } else if (toNum(cols[0]) == null) {
        e.name = cols[0].trim();
        e.position = toNum(cols[1]);
      } else {
        e.seed = toNum(cols[0]);
        e.name = cols[1].trim();
      }
    } else {
      e.seed = toNum(cols[0]);
      e.name = cols[1]?.trim();
      e.position = toNum(cols[2]);
    }
    if (e.seed != null || e.name) out.push(e);
  }
  return out;
};

/*
 * Apply parsed results to the official bracket. Determines the current round
 * (the lowest round whose matchups have both competitors set but no winner
 * yet) and fills in the winners. A competitor present in the file beats an
 * absent one; if both are present, the better finishing position wins (and we
 * fall back to the better seed when positions are missing).
 */
export const applyResultsToConfig = (
  cfg: BracketConfig,
  results: ResultEntry[],
): ApplyResult => {
  const nameList = seedsToList(cfg.leftSeeds, cfg.rightSeeds);
  const matchSeed = buildSeedMatcher(nameList);

  // Resolve each result entry to a seed, recording its finishing position.
  const fileBySeed = new Map<number, { position?: number }>();
  for (const e of results) {
    let seed = e.seed;
    if ((seed == null || seed < 1 || seed > 32) && e.name) {
      seed = matchSeed(e.name);
    }
    if (seed == null || seed < 1 || seed > 32) continue;
    const prev = fileBySeed.get(seed);
    if (!prev) fileBySeed.set(seed, { position: e.position });
    else if (
      e.position != null &&
      (prev.position == null || e.position < prev.position)
    ) {
      fileBySeed.set(seed, { position: e.position });
    }
  }

  // Current official winners, expressed as seed picks, so we can resolve which
  // competitors each match currently has.
  const picks: Record<string, number> = {};
  for (const [matchId, name] of Object.entries(cfg.winners)) {
    const s = matchSeed(String(name));
    if (s != null) picks[matchId] = s;
  }
  if (cfg.champion) {
    const s = matchSeed(cfg.champion);
    if (s != null) picks[CHAMPION_PICK_ID] = s;
  }

  const sb = resolveSeedBracket(picks);

  const decide = (a: number | null, b: number | null): number | null => {
    if (a == null || b == null) return null;
    const aIn = fileBySeed.has(a);
    const bIn = fileBySeed.has(b);
    if (aIn && !bIn) return a;
    if (bIn && !aIn) return b;
    if (aIn && bIn) {
      const pa = fileBySeed.get(a)!.position;
      const pb = fileBySeed.get(b)!.position;
      if (pa != null && pb != null) return pa <= pb ? a : b;
      if (pa != null) return a; // a finished, b did not
      if (pb != null) return b;
      return a <= b ? a : b; // neither has a position -> better (lower) seed
    }
    return null; // neither present -> can't decide
  };

  const winners = { ...cfg.winners };
  let champion = cfg.champion;
  let updated = 0;
  let roundUsed: number | "final" | null = null;
  const undecided: UndecidedMatch[] = [];
  const nameOf = (seed: number | null) =>
    seed != null ? nameList[seed - 1] || `Seed ${seed}` : "TBD";

  const numRounds = sb.left.length;
  for (let r = 0; r < numRounds; r++) {
    const ready = [...sb.left[r], ...sb.right[r]].filter(
      (m) => m.s1 != null && m.s2 != null && m.winner == null,
    );
    if (ready.length === 0) continue;
    roundUsed = r;
    for (const m of ready) {
      const w = decide(m.s1, m.s2);
      if (w != null) {
        winners[m.id] = nameList[w - 1];
        updated++;
      } else {
        undecided.push({ id: m.id, t1: nameOf(m.s1), t2: nameOf(m.s2) });
      }
    }
    break;
  }

  // No side round pending -> the grand championship is the current decision.
  if (roundUsed == null) {
    const c = sb.championship;
    if (c.s1 != null && c.s2 != null && c.winner == null) {
      const w = decide(c.s1, c.s2);
      if (w != null) {
        champion = nameList[w - 1];
        updated++;
        roundUsed = "final";
      } else {
        undecided.push({
          id: CHAMPION_PICK_ID,
          t1: nameOf(c.s1),
          t2: nameOf(c.s2),
        });
      }
    }
  }

  return { winners, champion, updated, round: roundUsed, undecided };
};
