export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import UserRowActions from "./UserRowActions";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const currentUserId = (session.user as { id: string }).id;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { entries: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        subtitle={`${users.length} ${users.length === 1 ? "member" : "members"}`}
        backHref="/admin"
        backLabel="Admin dashboard"
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead className="bg-cream-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Role</th>
                <th className="px-4 py-3 text-center">Entries</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-cream-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} seed={user.id} size="sm" />
                      <div>
                        <span className="font-medium text-stone-900">
                          {user.name}
                        </span>
                        {user.id === currentUserId && (
                          <span className="ml-2 text-xs text-stone-400">
                            (you)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {user.isAdmin ? (
                      <Badge variant="emerald" size="sm">
                        Admin
                      </Badge>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums text-stone-600">
                    {user._count.entries}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <UserRowActions
                      userId={user.id}
                      userName={user.name}
                      isAdmin={user.isAdmin}
                      isSelf={user.id === currentUserId}
                      entryCount={user._count.entries}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
