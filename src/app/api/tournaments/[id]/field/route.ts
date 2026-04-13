import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournamentGolfers = await prisma.tournamentGolfer.findMany({
      where: { tournamentId: id },
      include: {
        golfer: { select: { id: true, name: true, externalId: true } },
      },
      orderBy: { golfer: { name: "asc" } },
    });

    return NextResponse.json(tournamentGolfers);
  } catch (error) {
    console.error("Error fetching field:", error);
    return NextResponse.json(
      { error: "Failed to fetch field" },
      { status: 500 }
    );
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
    const golfers: { name: string; externalId?: string }[] = body.golfers ?? body;
    const replace: boolean = body.replace === true;

    if (!Array.isArray(golfers) || golfers.length === 0) {
      return NextResponse.json(
        { error: "An array of golfers is required" },
        { status: 400 }
      );
    }

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // If replace mode, clear existing field (only safe before draft picks exist)
    if (replace) {
      const draftPickCount = await prisma.draftPick.count({
        where: { tournamentGolfer: { tournamentId: id } },
      });
      if (draftPickCount > 0) {
        return NextResponse.json(
          { error: "Cannot replace field after draft picks have been made" },
          { status: 409 }
        );
      }
      await prisma.tournamentGolfer.deleteMany({
        where: { tournamentId: id },
      });
    }

    let created = 0;

    for (const g of golfers) {
      // Find or create the Golfer record
      let golfer = g.externalId
        ? await prisma.golfer.findFirst({
            where: { externalId: g.externalId },
          })
        : await prisma.golfer.findFirst({
            where: { name: g.name },
          });

      if (!golfer) {
        golfer = await prisma.golfer.create({
          data: {
            name: g.name,
            externalId: g.externalId ?? null,
          },
        });
      }

      // Create TournamentGolfer if not already linked
      const existing = await prisma.tournamentGolfer.findUnique({
        where: {
          tournamentId_golferId: {
            tournamentId: id,
            golferId: golfer.id,
          },
        },
      });

      if (!existing) {
        await prisma.tournamentGolfer.create({
          data: {
            tournamentId: id,
            golferId: golfer.id,
          },
        });
        created++;
      }
    }

    return NextResponse.json(
      { message: `Imported ${created} golfers into tournament field`, imported: created },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error importing field:", error);
    return NextResponse.json(
      { error: "Failed to import field" },
      { status: 500 }
    );
  }
}
