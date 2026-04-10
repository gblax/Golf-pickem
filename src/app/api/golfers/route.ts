import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const golfers = await prisma.golfer.findMany({
      where: {
        name: { contains: q },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json(golfers);
  } catch (error) {
    console.error("Error searching golfers:", error);
    return NextResponse.json(
      { error: "Failed to search golfers" },
      { status: 500 }
    );
  }
}
