import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rankEntries } from "@/lib/scoring";
import { refreshTournamentScores } from "@/lib/scores";

const SCORES_CACHE_MS = 60_000; // 60 seconds

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // Auto-refresh scores from ESPN if the tournament is in progress and
    // our cached scores are older than SCORES_CACHE_MS. Silently swallow
    // ESPN errors so a bad upstream doesn't break the leaderboard.
    if (
      tournament.status === "IN_PROGRESS" &&
      tournament.externalId &&
      (!tournament.lastScoresSyncAt ||
        Date.now() - tournament.lastScoresSyncAt.getTime() > SCORES_CACHE_MS)
    ) {
      try {
        await refreshTournamentScores(id);
      } catch (err) {
        console.error("Auto-refresh scores failed:", err);
      }
    }

    const entries = await prisma.weekEntry.findMany({
      where: { tournamentId: id },
      include: {
        user: { select: { id: true, name: true } },
        picks: {
          include: {
            tournamentGolfer: {
              include: {
                golfer: { select: { name: true } },
              },
            },
          },
          orderBy: { pickOrder: "asc" },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ranked = rankEntries(entries as any);

    const leaderboard = ranked.map((entry) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const picks = (entry.picks as any[]).map((pick) => ({
        pickOrder: pick.pickOrder,
        golferName: pick.tournamentGolfer?.golfer?.name ?? "Unknown",
        scoreToPar: pick.tournamentGolfer?.scoreToPar ?? null,
        position: pick.tournamentGolfer?.position ?? null,
        thru: pick.tournamentGolfer?.thru ?? null,
        madeTheCut: pick.tournamentGolfer?.madeTheCut ?? null,
        isWithdrawn: pick.tournamentGolfer?.isWithdrawn ?? false,
      }));

      return {
        entryId: entry.id,
        userId: entry.userId,
        userName: entry.user.name,
        rank: entry.rank,
        totalScore: entry.calculatedScore,
        isDisqualified: entry.calculatedDQ,
        payout: entry.payout,
        finishPosition: entry.finishPosition,
        picks,
      };
    });

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
