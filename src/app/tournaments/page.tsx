export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import Link from "next/link";

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { entries: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
      <p className="mt-1 text-sm text-gray-500">
        Browse all tournaments, past and upcoming.
      </p>

      {tournaments.length === 0 ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No tournaments yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/tournaments/${tournament.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {tournament.name}
                    </h2>
                    <StatusBadge status={tournament.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(tournament.startDate)} &ndash;{" "}
                    {formatDate(tournament.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Buy-in: {formatCurrency(tournament.buyIn)}</span>
                  <span>{tournament._count.entries} entries</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    UPCOMING: "bg-blue-100 text-blue-700",
    DRAFT_OPEN: "bg-yellow-100 text-yellow-700",
    DRAFT_COMPLETE: "bg-purple-100 text-purple-700",
    IN_PROGRESS: "bg-green-100 text-green-700",
    COMPLETE: "bg-gray-100 text-gray-600",
  };

  const labels: Record<string, string> = {
    UPCOMING: "Upcoming",
    DRAFT_OPEN: "Draft Open",
    DRAFT_COMPLETE: "Draft Complete",
    IN_PROGRESS: "In Progress",
    COMPLETE: "Complete",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colors[status] || "bg-gray-100 text-gray-600"
      )}
    >
      {labels[status] || status}
    </span>
  );
}
