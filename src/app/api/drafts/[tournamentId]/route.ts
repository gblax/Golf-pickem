import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateDraftOrder, getPickSequence, getCurrentPick } from "@/lib/draft";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;

    const draft = await prisma.draft.findUnique({
      where: { tournamentId },
      include: {
        picks: {
          include: {
            user: { select: { id: true, name: true } },
            tournamentGolfer: {
              include: {
                golfer: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { overallPickNumber: "asc" },
        },
        tournament: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    const draftOrder = JSON.parse(draft.draftOrder) as string[];
    const pickSequence = getPickSequence(draftOrder);
    const currentPick = getCurrentPick(draftOrder, draft.currentPickIndex);

    // Fetch user names for draft order
    const users = await prisma.user.findMany({
      where: { id: { in: draftOrder } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u: { id: string; name: string }) => [u.id, u.name]));

    return NextResponse.json({
      ...draft,
      draftOrder: draftOrder.map((id) => ({ id, name: userMap.get(id) ?? "Unknown" })),
      pickSequence,
      currentPick,
    });
  } catch (error) {
    console.error("Error fetching draft:", error);
    return NextResponse.json(
      { error: "Failed to fetch draft" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(session.user as { isAdmin?: boolean }).isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { tournamentId } = await params;
    const body = await request.json();
    const { mode, pickTimeLimit } = body;

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // Check if draft already exists
    const existingDraft = await prisma.draft.findUnique({
      where: { tournamentId },
    });

    if (existingDraft) {
      return NextResponse.json(
        { error: "Draft already exists for this tournament" },
        { status: 409 }
      );
    }

    // Get opted-in users
    const entries = await prisma.weekEntry.findMany({
      where: { tournamentId },
      select: { userId: true },
    });

    if (entries.length < 2) {
      return NextResponse.json(
        { error: "At least 2 entries are required to create a draft" },
        { status: 400 }
      );
    }

    const userIds = entries.map((e: { userId: string }) => e.userId);
    const draftOrder = generateDraftOrder(userIds);

    const draftMode = mode === "ASYNC" ? "ASYNC" : "LIVE";
    const timeLimit = pickTimeLimit ?? (draftMode === "ASYNC" ? 14400 : 120);

    const draft = await prisma.draft.create({
      data: {
        tournamentId,
        mode: draftMode,
        draftOrder: JSON.stringify(draftOrder),
        pickTimeLimit: timeLimit,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        currentPickDeadline: new Date(Date.now() + timeLimit * 1000),
      },
    });

    // Update tournament status
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "DRAFT_OPEN" },
    });

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error("Error creating draft:", error);
    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 }
    );
  }
}
