export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOURNAMENT_STATUS } from "@/types";
import { formatCurrency, formatDate, formatScore, cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

function getPayoutStructure(entryCount: number, buyIn: number): { place: number; payout: number }[] {
  const pool = entryCount * buyIn;
  if (entryCount <= 2) return [{ place: 1, payout: pool }];
  if (entryCount <= 5)
    return [
      { place: 1, payout: Math.round(pool * 0.7) },
      { place: 2, payout: Math.round(pool * 0.3) },
    ];
  if (entryCount <= 10)
    return [
      { place: 1, payout: Math.round(pool * 0.6) },
      { place: 2, payout: Math.round(pool * 0.25) },
      { place: 3, payout: Math.round(pool * 0.15) },
    ];
  return [
    { place: 1, payout: Math.round(pool * 0.5) },
    { place: 2, payout: Math.round(pool * 0.25) },
    { place: 3, payout: Math.round(pool * 0.15) },
    { place: 4, payout: Math.round(pool * 0.1) },
  ];
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      entries: {
        include: {
          user: true,
          picks: {
            include: {
              tournamentGolfer: { include: { golfer: true } },
            },
          },
        },
      },
      golfers: {
        include: { golfer: true },
        orderBy: { scoreToPar: "asc" },
      },
      draft: true,
    },
  });

  if (!tournament) return notFound();

  const userEntry = userId
    ? tournament.entries.find((e) => e.userId === userId)
    : null;

  const payouts = getPayoutStructure(
    tournament.entries.length,
    tournament.buyIn
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tournament.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(tournament.startDate)} &ndash;{" "}
            {formatDate(tournament.endDate)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={tournament.status} />
            <span className="text-sm text-gray-600">
              Buy-in: {formatCurrency(tournament.buyIn)}
            </span>
            <span className="text-sm text-gray-600">
              {tournament.entries.length} entries
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:items-end">
          {session && !userEntry && tournament.status === TOURNAMENT_STATUS.UPCOMING && (
            <Link
              href={`/tournaments/${id}/enter`}
              className="rounded-md bg-green-600 px-5 py-2 text-center text-sm font-medium text-white hover:bg-green-700"
            >
              Enter Tournament
            </Link>
          )}
          {userEntry && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Entered
            </span>
          )}
          {tournament.draft && (
            <Link
              href={`/tournaments/${id}/draft`}
              className="rounded-md border border-green-600 px-5 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-50"
            >
              Draft Room
            </Link>
          )}
          {(tournament.status === TOURNAMENT_STATUS.IN_PROGRESS ||
            tournament.status === TOURNAMENT_STATUS.COMPLETE) && (
            <Link
              href={`/tournaments/${id}/leaderboard`}
              className="rounded-md border border-green-600 px-5 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-50"
            >
              Leaderboard
            </Link>
          )}
        </div>
      </div>

      {/* Payout Structure */}
      {tournament.entries.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Payout Structure
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Total pool: {formatCurrency(tournament.entries.length * tournament.buyIn)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {payouts.map((p) => (
              <div
                key={p.place}
                className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm"
              >
                <p className="text-xs font-medium text-gray-500">
                  {p.place === 1
                    ? "1st"
                    : p.place === 2
                      ? "2nd"
                      : p.place === 3
                        ? "3rd"
                        : `${p.place}th`}
                </p>
                <p className="mt-1 text-lg font-bold text-green-700">
                  {formatCurrency(p.payout)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entered Players */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Entered Players ({tournament.entries.length})
        </h2>
        {tournament.entries.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No one has entered yet. Be the first!
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Player
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Picks
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tournament.entries.map((entry) => (
                  <tr key={entry.id} className={cn(entry.userId === userId && "bg-green-50")}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {entry.user.name}
                      {entry.isDisqualified && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                          DQ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.picks.length > 0
                        ? entry.picks
                            .sort((a, b) => a.pickOrder - b.pickOrder)
                            .map((p) => p.tournamentGolfer.golfer.name)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600">
                      {entry.totalScore !== null
                        ? formatScore(entry.totalScore)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Field of Golfers (Collapsible) */}
      {tournament.golfers.length > 0 && (
        <div className="mt-8">
          <details className="group">
            <summary className="cursor-pointer text-lg font-semibold text-gray-900 hover:text-green-700">
              <span className="ml-1">
                Tournament Field ({tournament.golfers.length} golfers)
              </span>
            </summary>
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Golfer
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Position
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Score
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Thru
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tournament.golfers.map((tg) => (
                    <tr
                      key={tg.id}
                      className={cn(
                        tg.isWithdrawn && "bg-gray-50 text-gray-400",
                        tg.madeTheCut === false && "bg-gray-50 text-gray-400"
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        <span className={cn(tg.isWithdrawn && "line-through")}>
                          {tg.golfer.name}
                        </span>
                        {tg.isWithdrawn && (
                          <span className="ml-2 text-xs text-red-500">WD</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-center text-sm">
                        {tg.position || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-center text-sm">
                        {formatScore(tg.scoreToPar ?? null)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-center text-sm">
                        {tg.thru || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    UPCOMING: "bg-blue-100 text-blue-700",
    DRAFT_OPEN: "bg-yellow-100 text-yellow-700",
    IN_PROGRESS: "bg-green-100 text-green-700",
    COMPLETE: "bg-gray-100 text-gray-600",
  };

  const labels: Record<string, string> = {
    UPCOMING: "Upcoming",
    DRAFT_OPEN: "Draft Open",
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
