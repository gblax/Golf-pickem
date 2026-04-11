import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { entries: true } },
        draft: {
          select: { id: true, status: true, mode: true },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error("Error fetching tournament:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournament" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // Cascades: entries → picks, golfers → draftPicks/picks, draft → draftPicks
    await prisma.tournament.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting tournament:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete tournament";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await request.json();
    const {
      name,
      buyIn,
      status,
      cutLine,
      startDate,
      endDate,
      pickTimeLimit,
    } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (buyIn !== undefined) data.buyIn = buyIn;
    if (status !== undefined) data.status = status;
    if (cutLine !== undefined) data.cutLine = cutLine;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (pickTimeLimit !== undefined) {
      const value = Number(pickTimeLimit);
      if (!Number.isFinite(value) || value < 10 || value > 86400) {
        return NextResponse.json(
          { error: "pickTimeLimit must be between 10 and 86400 seconds" },
          { status: 400 }
        );
      }
      data.pickTimeLimit = Math.round(value);
    }

    const tournament = await prisma.tournament.update({
      where: { id },
      data,
    });

    // If pick time changed, also update the draft so subsequent picks use
    // the new limit. This does not touch the current pick's existing
    // deadline — it just affects the next extension.
    if (data.pickTimeLimit !== undefined) {
      await prisma.draft.updateMany({
        where: { tournamentId: id },
        data: { pickTimeLimit: data.pickTimeLimit as number },
      });
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error("Error updating tournament:", error);
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}
