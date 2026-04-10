export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOURNAMENT_STATUS } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24">
        <div className="max-w-lg text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Golf Pick&apos;em
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Compete with friends by drafting PGA golfers each week. Pick wisely,
            climb the leaderboard, and win the pot.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="rounded-md bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-green-700"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-green-600 px-6 py-3 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const userId = (session.user as { id: string }).id;

  const tournament = await prisma.tournament.findFirst({
    where: { status: { not: TOURNAMENT_STATUS.COMPLETE } },
    orderBy: { startDate: "asc" },
    include: {
      entries: { include: { user: true } },
      draft: true,
    },
  });

  const userEntry = tournament?.entries.find((e) => e.userId === userId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome back, {session.user.name}
      </h1>

      {tournament ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {tournament.status === TOURNAMENT_STATUS.UPCOMING
                  ? "Upcoming Tournament"
                  : tournament.status === TOURNAMENT_STATUS.IN_PROGRESS
                    ? "Live Tournament"
                    : "Current Tournament"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                {tournament.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {formatDate(tournament.startDate)} &ndash;{" "}
                {formatDate(tournament.endDate)}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Buy-in: {formatCurrency(tournament.buyIn)}
                </span>
                <span className="text-sm text-gray-600">
                  {tournament.entries.length} entered
                </span>
                <StatusBadge status={tournament.status} />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              {!userEntry && tournament.status === TOURNAMENT_STATUS.UPCOMING && (
                <Link
                  href={`/tournaments/${tournament.id}/enter`}
                  className="rounded-md bg-green-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-green-700"
                >
                  Enter Tournament
                </Link>
              )}
              {userEntry && (
                <span className="text-sm font-medium text-green-700">
                  You&apos;re entered
                </span>
              )}
              {tournament.draft &&
                tournament.draft.status !== "COMPLETE" &&
                (tournament.status === TOURNAMENT_STATUS.DRAFT_OPEN) && (
                  <Link
                    href={`/tournaments/${tournament.id}/draft`}
                    className="rounded-md bg-green-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-green-800"
                  >
                    Go to Draft Room
                  </Link>
                )}
              {(tournament.status === TOURNAMENT_STATUS.IN_PROGRESS ||
                tournament.status === TOURNAMENT_STATUS.COMPLETE) && (
                <Link
                  href={`/tournaments/${tournament.id}/leaderboard`}
                  className="rounded-md border border-green-600 px-4 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-50"
                >
                  View Leaderboard
                </Link>
              )}
              <Link
                href={`/tournaments/${tournament.id}`}
                className="text-sm text-green-600 hover:text-green-700 hover:underline"
              >
                Tournament Details
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-gray-500">
            No upcoming tournaments right now. Check back soon!
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/tournaments"
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-green-300 hover:shadow"
        >
          <h3 className="font-semibold text-gray-900">All Tournaments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Browse past and upcoming tournaments
          </p>
        </Link>
        <Link
          href="/standings"
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-green-300 hover:shadow"
        >
          <h3 className="font-semibold text-gray-900">Season Standings</h3>
          <p className="mt-1 text-sm text-gray-500">
            See who&apos;s leading the season
          </p>
        </Link>
      </div>
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] || status}
    </span>
  );
}
