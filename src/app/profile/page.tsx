export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatScore, cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";

interface ProfileEntry {
  id: string;
  userId: string;
  tournamentId: string;
  hasPaid: boolean;
  isDisqualified: boolean;
  totalScore: number | null;
  finishPosition: number | null;
  payout: number | null;
  tournament: {
    id: string;
    name: string;
    status: string;
    startDate: Date | string;
  };
  picks: {
    tournamentGolfer: {
      golfer: { name: string };
    };
  }[];
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      entries: {
        include: {
          tournament: { select: { id: true, name: true, status: true, startDate: true } },
          picks: {
            include: {
              tournamentGolfer: {
                include: {
                  golfer: { select: { name: true } },
                },
              },
            },
            orderBy: { pickOrder: "asc" },
          },
        },
        orderBy: { tournament: { startDate: "desc" } },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const entries = user.entries as ProfileEntry[];
  const totalEntries = entries.length;
  const totalWinnings = entries.reduce(
    (sum, e) => sum + (e.payout ?? 0),
    0
  );
  const completedEntries = entries.filter(
    (e) => e.tournament.status === "COMPLETE"
  );
  const totalBuyIns = completedEntries.length * 5000; // Default buy-in for calculation

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Profile header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{user.email}</p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Entries
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalEntries}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Winnings
            </p>
            <p className="mt-1 text-2xl font-bold text-green-700">
              {formatCurrency(totalWinnings)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Best Finish
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {(() => {
                const finishes = entries
                  .filter((e) => e.finishPosition !== null)
                  .map((e) => e.finishPosition!);
                if (finishes.length === 0) return "-";
                const best = Math.min(...finishes);
                return best === 1
                  ? "1st"
                  : best === 2
                    ? "2nd"
                    : best === 3
                      ? "3rd"
                      : `${best}th`;
              })()}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              ROI
            </p>
            <p className={cn(
              "mt-1 text-2xl font-bold",
              totalBuyIns > 0 && totalWinnings - totalBuyIns >= 0
                ? "text-green-700"
                : "text-red-600"
            )}>
              {totalBuyIns > 0
                ? `${(((totalWinnings - totalBuyIns) / totalBuyIns) * 100).toFixed(0)}%`
                : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Entry history */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Tournament History
        </h2>

        {entries.length === 0 ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-gray-500">
              You haven&apos;t entered any tournaments yet.
            </p>
            <Link
              href="/tournaments"
              className="mt-2 inline-block text-sm text-green-600 hover:text-green-700 hover:underline"
            >
              Browse Tournaments
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tournament
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Golfers
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Score
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Finish
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Payout
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/tournaments/${entry.tournament.id}`}
                          className="text-sm font-medium text-green-700 hover:underline"
                        >
                          {entry.tournament.name}
                        </Link>
                        <p className="text-xs text-gray-400">
                          {formatDate(entry.tournament.startDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.picks.length > 0
                          ? entry.picks
                              .map((p) => p.tournamentGolfer.golfer.name)
                              .join(", ")
                          : "---"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                        <span className={cn(
                          "font-medium",
                          entry.isDisqualified && "text-red-600",
                          entry.totalScore !== null && entry.totalScore < 0 && "text-red-600",
                          entry.totalScore !== null && entry.totalScore > 0 && "text-gray-500"
                        )}>
                          {entry.isDisqualified
                            ? "DQ"
                            : formatScore(entry.totalScore ?? null)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-gray-700">
                        {entry.finishPosition
                          ? entry.finishPosition === 1
                            ? "1st"
                            : entry.finishPosition === 2
                              ? "2nd"
                              : entry.finishPosition === 3
                                ? "3rd"
                                : `${entry.finishPosition}th`
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-green-700">
                        {entry.payout ? formatCurrency(entry.payout) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
