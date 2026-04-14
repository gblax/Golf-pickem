import { prisma } from "./prisma";
import { fetchLiveScores, fetchOutrightOdds } from "./espn";
import { calculateEntryScore } from "./scoring";

/**
 * Fetch live scores from ESPN, update all TournamentGolfer records,
 * recalculate entry scores, and stamp `lastScoresSyncAt`.
 *
 * Shared between the admin "Fetch Scores" button (POST /scores) and the
 * auto-refresh on the leaderboard GET route.
 *
 * Returns the number of golfer records updated and entries recalculated.
 * Throws if the tournament has no externalId.
 */
export async function refreshTournamentScores(
  tournamentId: string
): Promise<{ updated: number; entries: number }> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (!tournament.externalId) {
    throw new Error("Tournament has no external ID for ESPN lookup");
  }

  // Fetch scores and odds in parallel. Odds failure is non-fatal — we still
  // want to update scores even if the futures endpoint is flaky.
  const [liveScores, oddsResult] = await Promise.all([
    fetchLiveScores(tournament.externalId),
    fetchOutrightOdds(tournament.name).catch((err) => {
      console.warn("fetchOutrightOdds failed, continuing without odds:", err);
      return { provider: null, entries: [] as Array<{ athleteId: string; value: string }> };
    }),
  ]);

  const oddsByAthleteId = new Map(
    oddsResult.entries.map((e) => [e.athleteId, e.value])
  );
  const oddsSyncedAt = oddsResult.entries.length > 0 ? new Date() : null;

  const tournamentGolfers = await prisma.tournamentGolfer.findMany({
    where: { tournamentId },
    include: { golfer: true },
  });

  let updated = 0;
  for (const tg of tournamentGolfers) {
    const espnGolfer = liveScores.find(
      (s) =>
        s.id === tg.golfer.externalId ||
        s.name.toLowerCase() === tg.golfer.name.toLowerCase()
    );

    const oddsValue = tg.golfer.externalId
      ? oddsByAthleteId.get(tg.golfer.externalId) ?? null
      : null;

    if (espnGolfer) {
      await prisma.tournamentGolfer.update({
        where: { id: tg.id },
        data: {
          scoreToPar: espnGolfer.scoreToPar,
          currentRound: espnGolfer.currentRound,
          thru: espnGolfer.thru,
          madeTheCut: espnGolfer.madeTheCut,
          position: espnGolfer.position,
          isWithdrawn: espnGolfer.isWithdrawn,
          odds: oddsValue,
          oddsProvider: oddsValue ? oddsResult.provider : null,
          oddsUpdatedAt: oddsValue ? oddsSyncedAt : null,
        },
      });
      updated++;
    } else if (oddsValue) {
      // Pre-tournament case: scores aren't live yet but odds are posted. Still
      // persist odds so the draft / field pages can show them.
      await prisma.tournamentGolfer.update({
        where: { id: tg.id },
        data: {
          odds: oddsValue,
          oddsProvider: oddsResult.provider,
          oddsUpdatedAt: oddsSyncedAt,
        },
      });
      updated++;
    }
  }

  const entries = await prisma.weekEntry.findMany({
    where: { tournamentId },
    include: {
      picks: {
        include: { tournamentGolfer: true },
      },
    },
  });

  for (const entry of entries) {
    const { totalScore, isDisqualified } = calculateEntryScore(entry);
    await prisma.weekEntry.update({
      where: { id: entry.id },
      data: { totalScore, isDisqualified },
    });
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { lastScoresSyncAt: new Date() },
  });

  return { updated, entries: entries.length };
}
