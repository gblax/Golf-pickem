import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id as string;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.status !== "UPCOMING" && tournament.status !== "DRAFT_OPEN") {
      return NextResponse.json(
        { error: "Entries are no longer open for this tournament" },
        { status: 400 }
      );
    }

    // Check for existing entry
    const existing = await prisma.weekEntry.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId: id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already entered this tournament" },
        { status: 409 }
      );
    }

    const entry = await prisma.weekEntry.create({
      data: {
        userId,
        tournamentId: id,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error entering tournament:", error);
    return NextResponse.json(
      { error: "Failed to enter tournament" },
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

    const { id } = await params;
    const userId = session.user.id as string;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { draft: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.status !== "UPCOMING" && tournament.status !== "DRAFT_OPEN") {
      return NextResponse.json(
        { error: "Cannot withdraw after the draft has started" },
        { status: 400 }
      );
    }

    if (tournament.draft && tournament.draft.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot withdraw after the draft has started" },
        { status: 400 }
      );
    }

    const entry = await prisma.weekEntry.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId: id,
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "No entry found to withdraw" },
        { status: 404 }
      );
    }

    await prisma.weekEntry.delete({
      where: { id: entry.id },
    });

    return NextResponse.json({ message: "Entry withdrawn successfully" });
  } catch (error) {
    console.error("Error withdrawing entry:", error);
    return NextResponse.json(
      { error: "Failed to withdraw entry" },
      { status: 500 }
    );
  }
}
