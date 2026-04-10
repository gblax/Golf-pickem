import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentPick, isDraftComplete, getPickDeadline } from "@/lib/draft";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tournamentId } = await params;
    const userId = session.user.id as string;
    const body = await request.json();
    const { tournamentGolferId } = body;

    if (!tournamentGolferId) {
      return NextResponse.json(
        { error: "tournamentGolferId is required" },
        { status: 400 }
      );
    }

    const draft = await prisma.draft.findUnique({
      where: { tournamentId },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    if (draft.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Draft is not in progress" },
        { status: 400 }
      );
    }

    const draftOrder = JSON.parse(draft.draftOrder) as string[];
    const currentPick = getCurrentPick(draftOrder, draft.currentPickIndex);

    if (!currentPick) {
      return NextResponse.json(
        { error: "No more picks remaining" },
        { status: 400 }
      );
    }

    // Validate it's this user's turn
    if (currentPick.userId !== userId) {
      return NextResponse.json(
        { error: "It is not your turn to pick" },
        { status: 403 }
      );
    }

    // Validate the golfer exists in this tournament
    const tournamentGolfer = await prisma.tournamentGolfer.findFirst({
      where: {
        id: tournamentGolferId,
        tournamentId,
      },
    });

    if (!tournamentGolfer) {
      return NextResponse.json(
        { error: "Golfer not found in this tournament" },
        { status: 404 }
      );
    }

    // Check golfer hasn't already been drafted
    const alreadyPicked = await prisma.draftPick.findFirst({
      where: {
        draftId: draft.id,
        tournamentGolferId,
      },
    });

    if (alreadyPicked) {
      return NextResponse.json(
        { error: "This golfer has already been picked" },
        { status: 409 }
      );
    }

    // Find the user's WeekEntry
    const weekEntry = await prisma.weekEntry.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId,
        },
      },
    });

    if (!weekEntry) {
      return NextResponse.json(
        { error: "No entry found for this user in this tournament" },
        { status: 400 }
      );
    }

    // Create DraftPick and Pick records together
    const newPickIndex = draft.currentPickIndex + 1;
    const draftIsComplete = isDraftComplete(draftOrder, newPickIndex);

    await prisma.$transaction(async (tx) => {
      // Create the draft pick
      await tx.draftPick.create({
        data: {
          draftId: draft.id,
          userId,
          tournamentGolferId,
          overallPickNumber: currentPick.overallPick,
          round: currentPick.round,
        },
      });

      // Create the Pick record for the WeekEntry
      await tx.pick.create({
        data: {
          weekEntryId: weekEntry.id,
          tournamentGolferId,
          pickOrder: currentPick.round,
        },
      });

      // Advance the draft
      await tx.draft.update({
        where: { id: draft.id },
        data: {
          currentPickIndex: newPickIndex,
          currentRound: currentPick.round,
          currentPickDeadline: draftIsComplete
            ? null
            : getPickDeadline(draft.pickTimeLimit),
          ...(draftIsComplete
            ? { status: "COMPLETE", completedAt: new Date() }
            : {}),
        },
      });

      // If draft is complete, update tournament status
      if (draftIsComplete) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: "DRAFT_COMPLETE" },
        });
      }
    });

    return NextResponse.json({
      message: draftIsComplete
        ? "Pick made. Draft is now complete!"
        : "Pick made successfully",
      overallPickNumber: currentPick.overallPick,
      round: currentPick.round,
      draftComplete: draftIsComplete,
    });
  } catch (error) {
    console.error("Error making draft pick:", error);
    return NextResponse.json(
      { error: "Failed to make draft pick" },
      { status: 500 }
    );
  }
}
