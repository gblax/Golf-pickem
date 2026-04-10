export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { entries: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link href="/admin" className="text-sm text-green-600 hover:underline">&larr; Back to Admin</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">Manage Users</h1>

      <div className="rounded-lg bg-white shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Admin</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Entries</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-center">
                  {user.isAdmin ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Admin
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{user._count.entries}</td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
