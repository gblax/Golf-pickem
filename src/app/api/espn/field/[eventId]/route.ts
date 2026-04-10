import { NextResponse } from "next/server";
import { fetchTournamentField } from "@/lib/espn";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const field = await fetchTournamentField(eventId);
    return NextResponse.json(field);
  } catch (error) {
    console.error("Error fetching ESPN field:", error);
    return NextResponse.json(
      { error: "Failed to fetch field from ESPN" },
      { status: 500 }
    );
  }
}
