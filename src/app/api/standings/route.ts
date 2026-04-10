import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all entries from completed tournaments
    const entries = await prisma.weekEntry.findMany({
      where: {
        tournament: { status: "COMPLETE" },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Aggregate per user
    const userStats = new Map<
      string,
      {
        userId: string;
        userName: string;
        totalEntries: number;
        totalWinnings: number;
        bestFinish: number | null;
        wins: number;
      }
    >();

    for (const entry of entries) {
      const stats = userStats.get(entry.userId) ?? {
        userId: entry.userId,
        userName: entry.user.name,
        totalEntries: 0,
        totalWinnings: 0,
        bestFinish: null,
        wins: 0,
      };

      stats.totalEntries++;
      stats.totalWinnings += entry.payout ?? 0;

      if (entry.finishPosition !== null) {
        if (stats.bestFinish === null || entry.finishPosition < stats.bestFinish) {
          stats.bestFinish = entry.finishPosition;
        }
        if (entry.finishPosition === 1) {
          stats.wins++;
        }
      }

      userStats.set(entry.userId, stats);
    }

    // Sort by total winnings descending
    const standings = Array.from(userStats.values()).sort(
      (a, b) => b.totalWinnings - a.totalWinnings
    );

    return NextResponse.json(standings);
  } catch (error) {
    console.error("Error fetching standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
