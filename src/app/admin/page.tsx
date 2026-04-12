export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Trophy, Play } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  formatCurrency,
  sortTournamentsByRelevance,
} from "@/lib/utils";
import { TOURNAMENT_STATUS } from "@/types";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatTile,
  StatusBadge,
} from "@/components/ui";
import SyncScheduleButton from "./SyncScheduleButton";

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
    <div className="animate-fade-in-up mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        actions={
          <>
            <Link href="/admin/tournaments/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                New Tournament
              </Button>
            </Link>
            <SyncScheduleButton />
            <Link href="/admin/users">
              <Button variant="secondary">Manage Users</Button>
            </Link>
          </>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Total Users"
          value={totalUsers}
          icon={<Users className="h-4 w-4" />}
        />
        <StatTile
          label="Total Tournaments"
          value={totalTournaments}
          icon={<Trophy className="h-4 w-4" />}
        />
        <StatTile
          label="Active Now"
          value={activeTournaments}
          accent="emerald"
          icon={<Play className="h-4 w-4" />}
        />
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-stone-900">
          Recent Tournaments
        </h2>

        {recentTournaments.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Trophy className="h-6 w-6" />}
              title="No tournaments yet"
              description="Create your first tournament to get the season started."
              action={
                <Link href="/admin/tournaments/new">
                  <Button variant="primary">
                    <Plus className="h-4 w-4" />
                    New Tournament
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100 text-sm">
                <thead className="bg-cream-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-4 py-3">Tournament</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Buy-in</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Entries</th>
                    <th className="px-4 py-3 text-center">Field</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentTournaments.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-cream-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-stone-900">
                        {t.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {formatDate(t.startDate)} – {formatDate(t.endDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600 tabular-nums">
                        {formatCurrency(t.buyIn)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-stone-600 tabular-nums">
                        {t._count.entries}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-stone-600 tabular-nums">
                        {t._count.golfers}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/tournaments/${t.id}`}
                            className="text-sm font-medium text-emerald-700 hover:underline"
                          >
                            Manage
                          </Link>
                          {t.status === TOURNAMENT_STATUS.DRAFT_OPEN &&
                            t.draft && (
                              <Link
                                href={`/tournaments/${t.id}/draft`}
                                className="text-sm font-medium text-sky-700 hover:underline"
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
          </Card>
        )}
      </section>
    </div>
  );
}
