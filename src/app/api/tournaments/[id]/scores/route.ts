import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshTournamentScores } from "@/lib/scores";

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
    const { updated, entries } = await refreshTournamentScores(id);

    return NextResponse.json({
      message: `Updated ${updated} golfer scores and recalculated ${entries} entries`,
    });
  } catch (error) {
    console.error("Error refreshing scores:", error);
    const message =
      error instanceof Error ? error.message : "Failed to refresh scores";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
