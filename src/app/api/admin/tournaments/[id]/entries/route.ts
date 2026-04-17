import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    const [entries, allUsers] = await Promise.all([
      prisma.weekEntry.findMany({
        where: { tournamentId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const enteredIds = new Set(entries.map((e) => e.userId));
    const availableUsers = allUsers.filter((u) => !enteredIds.has(u.id));

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        userName: e.user.name,
        userEmail: e.user.email,
      })),
      availableUsers,
    });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "UPCOMING" && tournament.status !== "DRAFT_OPEN") {
      return NextResponse.json(
        { error: "Entries are no longer open for this tournament" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.weekEntry.findUnique({
      where: {
        userId_tournamentId: { userId, tournamentId: id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "User is already entered in this tournament" },
        { status: 409 }
      );
    }

    const entry = await prisma.weekEntry.create({
      data: { userId, tournamentId: id },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating entry:", error);
    const message = error instanceof Error ? error.message : "Failed to create entry";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { draft: { select: { id: true, status: true, draftOrder: true } } },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const existing = await prisma.weekEntry.findUnique({
      where: {
        userId_tournamentId: { userId, tournamentId: id },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "User is not entered in this tournament" },
        { status: 404 }
      );
    }

    // Clean up draft data for this user if a draft exists.
    if (tournament.draft) {
      const draftId = tournament.draft.id;
      await prisma.draftPick.deleteMany({ where: { draftId, userId } });

      // Remove the user from the draft order array.
      const order: string[] = JSON.parse(tournament.draft.draftOrder || "[]");
      const newOrder = order.filter((uid) => uid !== userId);
      await prisma.draft.update({
        where: { id: draftId },
        data: { draftOrder: JSON.stringify(newOrder) },
      });
    }

    // WeekEntry.picks cascade on delete.
    await prisma.weekEntry.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error removing entry:", error);
    const message = error instanceof Error ? error.message : "Failed to remove entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
