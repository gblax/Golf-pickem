import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(tournaments);
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(session.user as { isAdmin?: boolean }).isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, startDate, endDate, buyIn, externalId, pickTimeLimit } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "name, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    let timeLimit: number | undefined;
    if (pickTimeLimit !== undefined) {
      const value = Number(pickTimeLimit);
      if (!Number.isFinite(value) || value < 10 || value > 86400) {
        return NextResponse.json(
          { error: "pickTimeLimit must be between 10 and 86400 seconds" },
          { status: 400 }
        );
      }
      timeLimit = Math.round(value);
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        buyIn: buyIn ?? 5000,
        externalId: externalId ?? null,
        ...(timeLimit !== undefined ? { pickTimeLimit: timeLimit } : {}),
      },
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error("Error creating tournament:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 }
    );
  }
}
