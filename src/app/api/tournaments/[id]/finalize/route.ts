import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rankEntries } from "@/lib/scoring";
import { calculatePayouts, resolvePayoutsWithTies } from "@/lib/payouts";

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

    if (tournament.status === "COMPLETE") {
      return NextResponse.json(
        { error: "Tournament is already finalized" },
        { status: 400 }
      );
    }

    // Fetch all entries with picks and golfer scores
    const entries = await prisma.weekEntry.findMany({
      where: { tournamentId: id },
      include: {
        user: { select: { id: true, name: true } },
        picks: {
          include: { tournamentGolfer: true },
        },
      },
    });

    // Rank entries
    const ranked = rankEntries(entries);

    // Calculate payouts
    const numEntrants = entries.length;
    const payoutTiers = calculatePayouts(numEntrants, tournament.buyIn);

    // Build ranks for payout resolution (only active ranked entries)
    const ranksForPayouts = ranked
      .filter((e) => e.rank !== null)
      .map((e) => ({ userId: e.userId, rank: e.rank! }));

    const payoutResults = resolvePayoutsWithTies(payoutTiers, ranksForPayouts);

    // Update each entry with finish position and payout
    for (const entry of ranked) {
      const payoutInfo = payoutResults.find((p) => p.userId === entry.userId);

      await prisma.weekEntry.update({
        where: { id: entry.id },
        data: {
          totalScore: entry.calculatedScore,
          isDisqualified: entry.calculatedDQ,
          finishPosition: entry.rank,
          payout: payoutInfo?.amount ?? 0,
        },
      });
    }

    // Set tournament status to COMPLETE
    await prisma.tournament.update({
      where: { id },
      data: { status: "COMPLETE" },
    });

    return NextResponse.json({
      message: "Tournament finalized",
      payouts: payoutResults,
      rankings: ranked.map((e) => ({
        userId: e.userId,
        userName: e.user.name,
        rank: e.rank,
        totalScore: e.calculatedScore,
        isDisqualified: e.calculatedDQ,
        payout: payoutResults.find((p) => p.userId === e.userId)?.amount ?? 0,
      })),
    });
  } catch (error) {
    console.error("Error finalizing tournament:", error);
    return NextResponse.json(
      { error: "Failed to finalize tournament" },
      { status: 500 }
    );
  }
}
