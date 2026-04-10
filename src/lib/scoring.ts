import type { WeekEntry, Pick, TournamentGolfer } from "@/generated/prisma/client";

type EntryWithPicks = WeekEntry & {
  picks: (Pick & { tournamentGolfer: TournamentGolfer })[];
};

export function calculateEntryScore(entry: EntryWithPicks): {
  totalScore: number | null;
  isDisqualified: boolean;
} {
  if (entry.picks.length < 2) {
    return { totalScore: null, isDisqualified: false };
  }

  const golfer1 = entry.picks[0].tournamentGolfer;
  const golfer2 = entry.picks[1].tournamentGolfer;

  // Disqualified if either golfer missed the cut or withdrew
  if (
    golfer1.madeTheCut === false ||
    golfer2.madeTheCut === false ||
    golfer1.isWithdrawn ||
    golfer2.isWithdrawn
  ) {
    return { totalScore: null, isDisqualified: true };
  }

  // Scores not yet available
  if (golfer1.scoreToPar === null || golfer2.scoreToPar === null) {
    return { totalScore: null, isDisqualified: false };
  }

  return {
    totalScore: golfer1.scoreToPar + golfer2.scoreToPar,
    isDisqualified: false,
  };
}

export type RankedEntry = EntryWithPicks & {
  user: { id: string; name: string };
  calculatedScore: number | null;
  calculatedDQ: boolean;
  rank: number | null;
};

export function rankEntries(
  entries: (EntryWithPicks & { user: { id: string; name: string } })[]
): RankedEntry[] {
  const scored = entries.map((entry) => {
    const { totalScore, isDisqualified } = calculateEntryScore(entry);
    return {
      ...entry,
      calculatedScore: totalScore,
      calculatedDQ: isDisqualified,
      rank: null as number | null,
    };
  });

  // Separate active from DQ'd
  const active = scored
    .filter((e) => !e.calculatedDQ && e.calculatedScore !== null)
    .sort((a, b) => a.calculatedScore! - b.calculatedScore!);

  const dqOrPending = scored.filter(
    (e) => e.calculatedDQ || e.calculatedScore === null
  );

  // Assign ranks with ties sharing the higher position
  let currentRank = 1;
  for (let i = 0; i < active.length; i++) {
    if (i > 0 && active[i].calculatedScore !== active[i - 1].calculatedScore) {
      currentRank = i + 1;
    }
    active[i].rank = currentRank;
  }

  return [...active, ...dqOrPending];
}
