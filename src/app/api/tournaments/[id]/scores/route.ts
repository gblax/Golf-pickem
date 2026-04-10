import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { fetchLiveScores } from "@/lib/espn";
import { calculateEntryScore } from "@/lib/scoring";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(session.user as { isAdmin?: boolean }).isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    if (!tournament.externalId) {
      return NextResponse.json(
        { error: "Tournament has no external ID for ESPN lookup" },
        { status: 400 }
      );
    }

    // Fetch live scores from ESPN
    const liveScores = await fetchLiveScores(tournament.externalId);

    // Get all tournament golfers with their associated golfer records
    const tournamentGolfers = await prisma.tournamentGolfer.findMany({
      where: { tournamentId: id },
      include: { golfer: true },
    });

    // Update tournament golfer scores
    let updated = 0;
    for (const tg of tournamentGolfers) {
      const espnGolfer = liveScores.find(
        (s) =>
          s.id === tg.golfer.externalId ||
          s.name.toLowerCase() === tg.golfer.name.toLowerCase()
      );

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
          },
        });
        updated++;
      }
    }

    // Recalculate all entry scores
    const entries = await prisma.weekEntry.findMany({
      where: { tournamentId: id },
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
        data: {
          totalScore,
          isDisqualified,
        },
      });
    }

    return NextResponse.json({
      message: `Updated ${updated} golfer scores and recalculated ${entries.length} entries`,
    });
  } catch (error) {
    console.error("Error refreshing scores:", error);
    return NextResponse.json(
      { error: "Failed to refresh scores" },
      { status: 500 }
    );
  }
}
