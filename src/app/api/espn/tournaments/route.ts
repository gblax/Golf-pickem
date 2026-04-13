import { NextResponse } from "next/server";
import { fetchSchedule } from "@/lib/espn";

export async function GET() {
  try {
    const tournaments = await fetchSchedule();
    return NextResponse.json(tournaments);
  } catch (error) {
    console.error("Error fetching ESPN tournaments:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournaments from ESPN" },
      { status: 500 }
    );
  }
}
