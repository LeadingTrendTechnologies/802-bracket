/* ============================================================
   Bracket configuration + results
   Edited on /admin, displayed (read-only) on /
   ============================================================ */
export type SeedPair = { t1: string; t2: string };

export type BracketConfig = {
  titleLine1: string;
  titleLine2: string;
  startInfo: string;
  finalInfo: string;
  leftTrack: string;
  leftTrackSub: string;
  rightTrack: string;
  rightTrackSub: string;
  payout: string;
  weeklyNote: string;
  leftSeeds: SeedPair[];
  rightSeeds: SeedPair[];
  // Results: match id -> winning team name, plus the grand champion
  winners: Record<string, string>;
  champion: string | null;
};

export const STORAGE_KEY = "802-bracket-config";

export const defaultConfig = (): BracketConfig => ({
  titleLine1: "NextGen Bracket",
  titleLine2: "Challenge",
  startInfo: "June 25th @ Texas",
  finalInfo: "At Indianapolis",
  leftTrack: "Texas Motor Speedway",
  leftTrackSub: "Opening Round",
  rightTrack: "Indianapolis Speedway",
  rightTrackSub: "Final Round",
  payout: "$50 CASH",
  weeklyNote: "Top 32 points \u00b7 seeded 1\u201332",
  leftSeeds: Array.from({ length: 8 }, (_, i) => ({
    t1: `Seed ${i * 2 + 1}`,
    t2: `Seed ${i * 2 + 2}`,
  })),
  rightSeeds: Array.from({ length: 8 }, (_, i) => ({
    t1: `Seed ${i * 2 + 17}`,
    t2: `Seed ${i * 2 + 18}`,
  })),
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
