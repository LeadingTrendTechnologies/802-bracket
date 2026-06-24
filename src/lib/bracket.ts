/* ============================================================
   Bracket configuration + results
   Edited on /admin, displayed (read-only) on /
   ============================================================ */
export type SeedPair = { t1: string; t2: string };

/*
 * Standard 32-team tournament seeding. Each half holds 8 first-round matchups;
 * the value is the TOP seed of that matchup and its opponent is (33 - seed),
 * so matchup order is 1v32, 16v17, 8v25, 9v24, 4v29, 13v20, 5v28, 12v21 (left)
 * and 2v31, 15v18, 7v26, 10v23, 3v30, 14v19, 6v27, 11v22 (right).
 */
export const LEFT_SEED_ORDER = [1, 16, 8, 9, 4, 13, 5, 12];
export const RIGHT_SEED_ORDER = [2, 15, 7, 10, 3, 14, 6, 11];
export const seedOpponent = (seed: number) => 33 - seed;
export const SEED_COUNT = 32;

// Picks are locked once the cutoff (lockAt) has passed.
export const isLocked = (lockAt: string | null): boolean => {
  if (!lockAt) return false;
  const t = new Date(lockAt).getTime();
  return Number.isFinite(t) && Date.now() >= t;
};

// Human-readable lock date in the VIEWER's local timezone (with tz label).
export const formatLockDate = (lockAt: string | null): string => {
  if (!lockAt) return "";
  const d = new Date(lockAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
};

// Convert an ISO timestamp to the value a <input type="datetime-local"> expects.
export const toDateTimeLocalValue = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

// Seed numbers (1-based) that live in the left half of the bracket.
export const LEFT_SEED_SET = new Set<number>(
  LEFT_SEED_ORDER.flatMap((s) => [s, seedOpponent(s)]),
);

/*
 * Flatten the matchup pairs into a single seed-ordered list where
 * index 0 = seed 1 ... index 31 = seed 32.
 */
export const seedsToList = (left: SeedPair[], right: SeedPair[]): string[] => {
  const list = Array.from({ length: SEED_COUNT }, () => "");
  LEFT_SEED_ORDER.forEach((seed, m) => {
    list[seed - 1] = left[m]?.t1 ?? "";
    list[seedOpponent(seed) - 1] = left[m]?.t2 ?? "";
  });
  RIGHT_SEED_ORDER.forEach((seed, m) => {
    list[seed - 1] = right[m]?.t1 ?? "";
    list[seedOpponent(seed) - 1] = right[m]?.t2 ?? "";
  });
  return list;
};

// Rebuild the left/right matchup pairs from a seed-ordered list.
export const listToSeeds = (
  list: string[],
): { leftSeeds: SeedPair[]; rightSeeds: SeedPair[] } => {
  const name = (seed: number) => list[seed - 1] ?? "";
  return {
    leftSeeds: LEFT_SEED_ORDER.map((seed) => ({
      t1: name(seed),
      t2: name(seedOpponent(seed)),
    })),
    rightSeeds: RIGHT_SEED_ORDER.map((seed) => ({
      t1: name(seed),
      t2: name(seedOpponent(seed)),
    })),
  };
};

export type BracketConfig = {
  startInfo: string;
  finalInfo: string;
  leftTrack: string;
  leftTrackSub: string;
  rightTrack: string;
  rightTrackSub: string;
  payout: string;
  weeklyNote: string;
  // Where the tournament currently is, shown as a live banner on the public page.
  currentRound: string;
  currentTrack: string;
  // ISO timestamp after which picks are locked (no edits). null = never locks.
  lockAt: string | null;
  leftSeeds: SeedPair[];
  rightSeeds: SeedPair[];
  // Results: match id -> winning team name, plus the grand champion
  winners: Record<string, string>;
  champion: string | null;
};

export const STORAGE_KEY = "802-bracket-config";

export const defaultConfig = (): BracketConfig => ({
  startInfo: "June 25th @ Texas",
  finalInfo: "At Indianapolis",
  leftTrack: "Texas Motor Speedway",
  leftTrackSub: "Opening Round",
  rightTrack: "Indianapolis Speedway",
  rightTrackSub: "Final Round",
  payout: "$50 CASH",
  weeklyNote: "Top 32 points \u00b7 seeded 1\u201332",
  currentRound: "Round 1",
  currentTrack: "",
  lockAt: null,
  // Ordered to match the seeded bracket layout (t1 = top seed, t2 = 33 - seed).
  leftSeeds: [
    { t1: "Mark Whitley", t2: "Johnny Wood Jr" }, // 1 v 32
    { t1: "Kevin Tipton", t2: "Micheal Woolf" }, // 16 v 17
    { t1: "Chris Muise", t2: "Arabia Cayton III" }, // 8 v 25
    { t1: "Jim Ott", t2: "David Durand" }, // 9 v 24
    { t1: "Scott Simley", t2: "Tyler Ducharme" }, // 4 v 29
    { t1: "Matt Taylor", t2: "Timothy Parker" }, // 13 v 20
    { t1: "Tyler Humphrey", t2: "Kenny Reel" }, // 5 v 28
    { t1: "Steve Holmes", t2: "Daniel Holdcroft" }, // 12 v 21
  ],
  rightSeeds: [
    { t1: "Grant Humphrey", t2: "Jeff Pogo" }, // 2 v 31
    { t1: "Chad Coleman", t2: "Joe Hudson" }, // 15 v 18
    { t1: "Brandon Garrand", t2: "Kevin Roy" }, // 7 v 26
    { t1: "Jeff Gilmore", t2: "Johnny Barker" }, // 10 v 23
    { t1: "Rob Lowell", t2: "Connor Patton" }, // 3 v 30
    { t1: "Devin Mccaffrey", t2: "Derek Mcdonald" }, // 14 v 19
    { t1: "Steve Ritter", t2: "Logan Troyer" }, // 6 v 27
    { t1: "Brett Hahn", t2: "Keith Ayers" }, // 11 v 22
  ],
  winners: {},
  champion: null,
});

export const loadConfig = (): BracketConfig => {
  if (typeof localStorage === "undefined") return defaultConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    return { ...defaultConfig(), ...(JSON.parse(raw) as Partial<BracketConfig>) };
  } catch {
    return defaultConfig();
  }
};

export const saveConfig = (cfg: BracketConfig) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
};

/* ============================================================
   Pure derivation of the bracket from a config
   ============================================================ */
export type ResolvedMatch = {
  id: string;
  t1: string;
  t2: string;
  winner: string | null;
};

// Resolve one side into rounds (16 -> 8 -> 4 -> 2 -> 1). Each round's teams
// are derived from the previous round's winners. A stored winner is only kept
// if it still matches one of the (possibly changed) competitors.
export const resolveSide = (
  seeds: SeedPair[],
  prefix: string,
  winners: Record<string, string>,
): ResolvedMatch[][] => {
  const validWinner = (id: string, t1: string, t2: string): string | null => {
    const w = winners[id];
    return w && (w === t1 || w === t2) ? w : null;
  };

  const round0: ResolvedMatch[] = seeds.map((p, i) => {
    const id = `${prefix}-0-${i}`;
    return { id, t1: p.t1, t2: p.t2, winner: validWinner(id, p.t1, p.t2) };
  });

  const rounds: ResolvedMatch[][] = [round0];
  let prev = round0;
  let count = prev.length;
  let r = 1;
  while (count > 1) {
    count = Math.floor(count / 2);
    const round: ResolvedMatch[] = [];
    for (let i = 0; i < count; i++) {
      const id = `${prefix}-${r}-${i}`;
      const t1 = prev[i * 2].winner ?? "TBD";
      const t2 = prev[i * 2 + 1].winner ?? "TBD";
      round.push({ id, t1, t2, winner: validWinner(id, t1, t2) });
    }
    rounds.push(round);
    prev = round;
    r++;
  }
  return rounds;
};

export type ResolvedBracket = {
  left: ResolvedMatch[][];
  right: ResolvedMatch[][];
  championship: { t1: string; t2: string; winner: string | null };
};

export const resolveBracket = (cfg: BracketConfig): ResolvedBracket => {
  const left = resolveSide(cfg.leftSeeds, "L", cfg.winners);
  const right = resolveSide(cfg.rightSeeds, "R", cfg.winners);
  const t1 = left[left.length - 1][0]?.winner ?? "TBD";
  const t2 = right[right.length - 1][0]?.winner ?? "TBD";
  const champ = cfg.champion;
  const winner = champ && (champ === t1 || champ === t2) ? champ : null;
  return { left, right, championship: { t1, t2, winner } };
};

/* ============================================================
   Seed-based bracket (used by /picks)

   Picks are stored as `matchId -> seed number` (and the champion
   under CHAMPION_PICK_ID). Because they reference SEEDS rather than
   names, a participant's selections stay valid even if the admin
   renames drivers or reorders the list later.
   ============================================================ */
export type SeedMatch = {
  id: string;
  s1: number | null;
  s2: number | null;
  winner: number | null;
};

export type SeedBracket = {
  left: SeedMatch[][];
  right: SeedMatch[][];
  championship: { s1: number | null; s2: number | null; winner: number | null };
};

export const CHAMPION_PICK_ID = "champion";

const resolveSeedSide = (
  order: number[],
  prefix: string,
  picks: Record<string, number>,
): SeedMatch[][] => {
  const valid = (
    id: string,
    s1: number | null,
    s2: number | null,
  ): number | null => {
    const w = picks[id];
    return w != null && (w === s1 || w === s2) ? w : null;
  };

  const round0: SeedMatch[] = order.map((seed, i) => {
    const id = `${prefix}-0-${i}`;
    const s1 = seed;
    const s2 = seedOpponent(seed);
    return { id, s1, s2, winner: valid(id, s1, s2) };
  });

  const rounds: SeedMatch[][] = [round0];
  let prev = round0;
  let count = prev.length;
  let r = 1;
  while (count > 1) {
    count = Math.floor(count / 2);
    const round: SeedMatch[] = [];
    for (let i = 0; i < count; i++) {
      const id = `${prefix}-${r}-${i}`;
      const s1 = prev[i * 2].winner;
      const s2 = prev[i * 2 + 1].winner;
      round.push({ id, s1, s2, winner: valid(id, s1, s2) });
    }
    rounds.push(round);
    prev = round;
    r++;
  }
  return rounds;
};

export const resolveSeedBracket = (
  picks: Record<string, number>,
): SeedBracket => {
  const left = resolveSeedSide(LEFT_SEED_ORDER, "L", picks);
  const right = resolveSeedSide(RIGHT_SEED_ORDER, "R", picks);
  const s1 = left[left.length - 1][0]?.winner ?? null;
  const s2 = right[right.length - 1][0]?.winner ?? null;
  const cw = picks[CHAMPION_PICK_ID];
  const winner = cw != null && (cw === s1 || cw === s2) ? cw : null;
  return { left, right, championship: { s1, s2, winner } };
};

// Total match picks excluding the champion (15 per side: 8+4+2+1).
export const TOTAL_MATCH_PICKS =
  (LEFT_SEED_ORDER.length * 2 - 1) + (RIGHT_SEED_ORDER.length * 2 - 1);

export const POINTS_PER_PICK = 10;

export type PickResult = "correct" | "incorrect";

export type GradeResult = {
  // matchId (and CHAMPION_PICK_ID) -> whether the user's pick was right.
  results: Record<string, PickResult>;
  correct: number;
  points: number;
};

/*
 * Grade a participant's SEED-based picks against the OFFICIAL bracket config
 * (whose winners are stored by name). Only matches that have an official
 * result AND a user guess are graded. +1 correct per match and per champion.
 */
export const gradePicks = (
  cfg: BracketConfig,
  picks: Record<string, number>,
): GradeResult => {
  const list = seedsToList(cfg.leftSeeds, cfg.rightSeeds);
  const nameToSeed = new Map<string, number>();
  list.forEach((name, i) => {
    if (name) nameToSeed.set(name, i + 1);
  });

  const officialSeed: Record<string, number> = {};
  for (const [matchId, name] of Object.entries(cfg.winners)) {
    const s = nameToSeed.get(name);
    if (s != null) officialSeed[matchId] = s;
  }
  if (cfg.champion) {
    const s = nameToSeed.get(cfg.champion);
    if (s != null) officialSeed[CHAMPION_PICK_ID] = s;
  }

  const results: Record<string, PickResult> = {};
  let correct = 0;
  for (const [matchId, off] of Object.entries(officialSeed)) {
    const guess = picks[matchId];
    if (guess == null) continue;
    if (guess === off) {
      results[matchId] = "correct";
      correct++;
    } else {
      results[matchId] = "incorrect";
    }
  }

  return { results, correct, points: correct * POINTS_PER_PICK };
};
