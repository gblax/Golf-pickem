"use client";

import { useEffect, useState } from "react";

interface StandingEntry {
  userId: string;
  userName: string;
  totalEntries: number;
  totalWinnings: number;
  bestFinish: number | null;
  wins: number;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function formatPlace(pos: number): string {
  if (pos === 1) return "1st";
  if (pos === 2) return "2nd";
  if (pos === 3) return "3rd";
  return `${pos}th`;
}

export default function StandingsPage() {
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStandings() {
      try {
        const res = await fetch("/api/standings");
        if (!res.ok) throw new Error("Failed to fetch standings");
        const data: StandingEntry[] = await res.json();
        setStandings(data);
      } catch {
        setError("Failed to load standings.");
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Season Standings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Overall rankings based on completed tournaments.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {standings.length === 0 && !error ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            No completed tournaments yet. Standings will appear after the first
            tournament finishes.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Rank
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Player
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Entries
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Wins
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Total Winnings
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Best Finish
                  </th>
                  <th className="hidden px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-4">
                    ROI
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standings.map((entry, index) => {
                  const buyInTotal = entry.totalEntries * 5000;
                  const roi =
                    buyInTotal > 0
                      ? ((entry.totalWinnings - buyInTotal) / buyInTotal) * 100
                      : 0;
                  return (
                    <tr
                      key={entry.userId}
                      className={cn(
                        index === 0 && "bg-yellow-50",
                        index === 1 && "bg-gray-50",
                        index === 2 && "bg-orange-50"
                      )}
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-gray-900 sm:px-4">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900 sm:px-4">
                        {entry.userName}
                        {entry.wins > 0 && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                            {entry.wins}W
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-sm text-gray-600 sm:px-4">
                        {entry.totalEntries}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-sm text-gray-600 sm:px-4">
                        {entry.wins}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-sm font-semibold text-green-700 sm:px-4">
                        {formatCurrency(entry.totalWinnings)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-sm text-gray-600 sm:px-4">
                        {entry.bestFinish !== null
                          ? formatPlace(entry.bestFinish)
                          : "-"}
                      </td>
                      <td className={cn(
                        "hidden whitespace-nowrap px-3 py-3 text-center text-sm font-medium sm:table-cell sm:px-4",
                        roi >= 0 ? "text-green-700" : "text-red-600"
                      )}>
                        {roi >= 0 ? "+" : ""}
                        {roi.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
