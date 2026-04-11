import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchSchedule } from "@/lib/espn";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(session.user as { isAdmin?: boolean }).isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const events = await fetchSchedule();

    let created = 0;
    let skipped = 0;
    for (const ev of events) {
      const existing = await prisma.tournament.findUnique({
        where: { externalId: ev.id },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.tournament.create({
        data: {
          name: ev.name,
          externalId: ev.id,
          startDate: new Date(ev.startDate),
          endDate: new Date(ev.endDate),
          buyIn: 5000,
          status: "UPCOMING",
        },
      });
      created++;
    }

    return NextResponse.json({
      message: `Sync complete: ${created} created, ${skipped} already existed`,
      created,
      skipped,
      total: events.length,
    });
  } catch (error) {
    console.error("Error syncing PGA schedule:", error);
    const message =
      error instanceof Error ? error.message : "Failed to sync schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
