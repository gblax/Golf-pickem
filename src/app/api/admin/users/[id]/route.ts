import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(): Promise<
  | { error: NextResponse; currentUserId?: undefined }
  | { error?: undefined; currentUserId: string }
> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(session.user as { isAdmin?: boolean }).isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { currentUserId: (session.user as { id: string }).id };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;
    const currentUserId = authResult.currentUserId;

    const { id } = await params;
    const body = await request.json();
    const { isAdmin } = body as { isAdmin?: boolean };

    if (typeof isAdmin !== "boolean") {
      return NextResponse.json({ error: "isAdmin must be a boolean" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Can't demote yourself
    if (currentUserId === id && !isAdmin) {
      return NextResponse.json(
        { error: "You cannot remove your own admin status" },
        { status: 400 }
      );
    }

    // Can't demote the last admin
    if (!isAdmin && target.isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isAdmin },
    });

    return NextResponse.json({ id: updated.id, isAdmin: updated.isAdmin });
  } catch (err) {
    console.error("Error updating user:", err);
    const message = err instanceof Error ? err.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;
    const currentUserId = authResult.currentUserId;

    const { id } = await params;

    // Can't delete yourself
    if (currentUserId === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { entries: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Block if they have any tournament entries — removing would corrupt
    // draft/pick history. Admin must clear the entries first.
    if (target._count.entries > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete user with ${target._count.entries} tournament ${target._count.entries === 1 ? "entry" : "entries"}. Remove their entries first.`,
        },
        { status: 400 }
      );
    }

    // Can't delete the last admin
    if (target.isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting user:", err);
    const message = err instanceof Error ? err.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
