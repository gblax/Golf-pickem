import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateDraftOrder } from "@/lib/draft";

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

    const draft = await prisma.draft.findUnique({
      where: { tournamentId },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    if (draft.status !== "PENDING") {
      return NextResponse.json(
        { error: "Draft order can only be re-randomized when draft is PENDING" },
        { status: 400 }
      );
    }

    const currentOrder = JSON.parse(draft.draftOrder) as string[];
    const newOrder = generateDraftOrder(currentOrder);

    await prisma.draft.update({
      where: { id: draft.id },
      data: { draftOrder: JSON.stringify(newOrder) },
    });

    // Fetch user names for the response
    const users = await prisma.user.findMany({
      where: { id: { in: newOrder } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u: { id: string; name: string }) => [u.id, u.name]));

    return NextResponse.json({
      message: "Draft order re-randomized",
      draftOrder: newOrder.map((id) => ({ id, name: userMap.get(id) ?? "Unknown" })),
    });
  } catch (error) {
    console.error("Error re-randomizing draft order:", error);
    return NextResponse.json(
      { error: "Failed to re-randomize draft order" },
      { status: 500 }
    );
  }
}
