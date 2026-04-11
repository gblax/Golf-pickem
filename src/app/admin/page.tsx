export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  formatCurrency,
  sortTournamentsByRelevance,
} from "@/lib/utils";
import { TOURNAMENT_STATUS } from "@/types";
import SyncScheduleButton from "./SyncScheduleButton";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    [TOURNAMENT_STATUS.UPCOMING]: "bg-gray-100 text-gray-700",
    [TOURNAMENT_STATUS.DRAFT_OPEN]: "bg-blue-100 text-blue-700",
    [TOURNAMENT_STATUS.IN_PROGRESS]: "bg-green-100 text-green-700",
    [TOURNAMENT_STATUS.COMPLETE]: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    redirect("/");
  }

  const [totalUsers, totalTournaments, activeTournaments, allTournaments] =
    await Promise.all([
      prisma.user.count(),
      prisma.tournament.count(),
      prisma.tournament.count({
        where: {
          status: {
            in: [
              TOURNAMENT_STATUS.DRAFT_OPEN,
              TOURNAMENT_STATUS.IN_PROGRESS,
            ],
          },
        },
      }),
      prisma.tournament.findMany({
        include: {
          _count: { select: { entries: true, golfers: true } },
          draft: { select: { id: true, status: true } },
        },
      }),
    ]);

  const recentTournaments = sortTournamentsByRelevance(allTournaments).slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex flex-wrap items-start gap-3">
          <Link
            href="/admin/tournaments/new"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + New Tournament
          </Link>
          <SyncScheduleButton />
          <Link
            href="/admin/users"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage Users
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Users</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalUsers}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Tournaments
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {totalTournaments}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active Now</p>
          <p className="mt-1 text-3xl font-bold text-green-600">
            {activeTournaments}
          </p>
        </div>
      </div>

      {/* Recent tournaments */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Tournaments
          </h2>
        </div>

        {recentTournaments.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500">
            No tournaments yet.{" "}
            <Link
              href="/admin/tournaments/new"
              className="text-green-600 hover:underline"
            >
              Create one
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-3 py-3 font-medium">Tournament</th>
                  <th className="px-3 py-3 font-medium">Dates</th>
                  <th className="px-3 py-3 font-medium">Buy-in</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Entries</th>
                  <th className="px-3 py-3 font-medium">Field</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTournaments.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {t.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                      {formatDate(t.startDate)} - {formatDate(t.endDate)}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {formatCurrency(t.buyIn)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {t._count.entries}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {t._count.golfers}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/tournaments/${t.id}`}
                          className="text-green-600 hover:text-green-700 hover:underline"
                        >
                          Manage
                        </Link>
                        {t.status === TOURNAMENT_STATUS.DRAFT_OPEN &&
                          t.draft && (
                            <Link
                              href={`/draft/${t.draft.id}`}
                              className="text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              Draft
                            </Link>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
