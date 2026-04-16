import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateDraftOrder, getPickSequence, getCurrentPick } from "@/lib/draft";
import { resolveExpiredPicks } from "@/lib/draftResolver";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;

    // Auto-DQ any users whose pick window has expired. This runs lazily
    // on every draft read — see src/lib/draftResolver.ts.
    try {
      await resolveExpiredPicks(tournamentId);
    } catch (err) {
      console.error("Failed to resolve expired draft picks:", err);
    }

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
      draftOrder: draftOrder.map((id) => ({ userId: id, userName: userMap.get(id) ?? "Unknown" })),
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
    const body = await request.json().catch(() => ({}));
    const { mode, pickTimeLimit, action } = body as {
      mode?: string;
      pickTimeLimit?: number;
      action?: string;
    };

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

    const existingDraft = await prisma.draft.findUnique({
      where: { tournamentId },
    });

    // "Start" transitions an existing PENDING draft to IN_PROGRESS and
    // starts the clock. The admin UI sends action: "start" for this.
    if (action === "start") {
      if (!existingDraft) {
        return NextResponse.json(
          { error: "No draft to start. Create one first." },
          { status: 404 }
        );
      }
      if (existingDraft.status !== "PENDING") {
        return NextResponse.json(
          {
            error: `Cannot start a draft that is already ${existingDraft.status}. Reset it first.`,
          },
          { status: 400 }
        );
      }

      const timeLimit = existingDraft.pickTimeLimit;
      const updated = await prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          currentPickDeadline: new Date(Date.now() + timeLimit * 1000),
        },
      });

      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "DRAFT_OPEN" },
      });

      return NextResponse.json(updated);
    }

    // Default: create a new draft in PENDING state. The clock doesn't
    // start until the admin explicitly hits "Start Draft".
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
    // Default to the tournament-configured pick time. Admins set this per
    // tournament via the detail page; an explicit request override still wins.
    const timeLimit = pickTimeLimit ?? tournament.pickTimeLimit;

    const draft = await prisma.draft.create({
      data: {
        tournamentId,
        mode: draftMode,
        draftOrder: JSON.stringify(draftOrder),
        pickTimeLimit: timeLimit,
        status: "PENDING",
        // startedAt and currentPickDeadline are set when admin starts.
      },
    });

    // Move tournament to DRAFT_OPEN so the draft room is reachable while
    // we wait for the admin to hit "Start Draft".
    if (tournament.status === "UPCOMING") {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "DRAFT_OPEN" },
      });
    }

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error("Error creating draft:", error);
    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const draft = await prisma.draft.findUnique({
      where: { tournamentId },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // DraftPicks materialize paired Pick rows on each user's WeekEntry.
      // DraftPick cascades when the Draft is deleted, but Pick rows do
      // not — clean those up explicitly so the draft can be redone.
      const draftPicks = await tx.draftPick.findMany({
        where: { draftId: draft.id },
        select: { userId: true, tournamentGolferId: true },
      });

      for (const dp of draftPicks) {
        const entry = await tx.weekEntry.findUnique({
          where: {
            userId_tournamentId: { userId: dp.userId, tournamentId },
          },
          select: { id: true },
        });
        if (entry) {
          await tx.pick.deleteMany({
            where: {
              weekEntryId: entry.id,
              tournamentGolferId: dp.tournamentGolferId,
            },
          });
        }
      }

      await tx.draft.delete({ where: { id: draft.id } });

      // Snap tournament status back so the admin can recreate the draft
      // from a clean slate. If the resolver had already cascaded this
      // tournament to IN_PROGRESS (the runaway-DQ failure mode), we pull
      // it back to DRAFT_OPEN so the Draft section stays reachable.
      const t = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: { status: true },
      });
      if (t && (t.status === "DRAFT_OPEN" || t.status === "IN_PROGRESS")) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: "DRAFT_OPEN" },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}
