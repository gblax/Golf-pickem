"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface LeaderboardPick {
  golferName: string;
  scoreToPar: number | null;
  position: string | null;
  thru: string | null;
  madeTheCut: boolean | null;
  isWithdrawn: boolean;
}

interface LeaderboardEntry {
  entryId: string;
  userId: string;
  userName: string;
  picks: LeaderboardPick[];
  totalScore: number | null;
  isDisqualified: boolean;
  rank: number | null;
}

interface PayoutSlot {
  place: number;
  payout: number;
}

function formatScore(scoreToPar: number | null): string {
  if (scoreToPar === null) return "-";
  if (scoreToPar === 0) return "E";
  if (scoreToPar > 0) return `+${scoreToPar}`;
  return String(scoreToPar);
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function getPayoutStructure(entryCount: number, buyIn: number): PayoutSlot[] {
  const pool = entryCount * buyIn;
  if (entryCount <= 1) return [{ place: 1, payout: pool }];
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

const REFRESH_INTERVAL = 60;

export default function LeaderboardPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params.id;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [tournament, setTournament] = useState<{ name: string; buyIn: number; status: string } | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const data: LeaderboardEntry[] = await res.json();
      setEntries(data);
      setError(null);
    } catch {
      setError("Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      if (res.ok) {
        const data = await res.json();
        setTournament({ name: data.name, buyIn: data.buyIn, status: data.status });
      }
    } catch {
      // Non-critical
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchLeaderboard();
    fetchTournament();
  }, [fetchLeaderboard, fetchTournament]);

  // Countdown + auto-refresh
  useEffect(() => {
    setCountdown(REFRESH_INTERVAL);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLeaderboard();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchLeaderboard]);

  const payouts = tournament
    ? getPayoutStructure(entries.length, tournament.buyIn)
    : [];

  const payoutByRank = new Map(payouts.map((p) => [p.place, p.payout]));

  // Split active and DQ entries
  const activeEntries = entries.filter((e) => !e.isDisqualified);
  const dqEntries = entries.filter((e) => e.isDisqualified);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/tournaments/${tournamentId}`}
            className="text-sm text-green-600 hover:text-green-700 hover:underline"
          >
            &larr; Tournament Details
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {tournament?.name ? `${tournament.name} - Leaderboard` : "Leaderboard"}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          Refreshing in {countdown}s
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {entries.length === 0 && !error ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No entries yet for this tournament.</p>
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
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Golfer 1
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Golfer 2
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Combined
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Payout
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeEntries.map((entry) => {
                  const payout = entry.rank ? payoutByRank.get(entry.rank) : undefined;
                  return (
                    <tr
                      key={entry.entryId}
                      className={cn(
                        payout !== undefined && payout > 0 && "bg-green-50"
                      )}
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-gray-900 sm:px-4">
                        {entry.rank ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900 sm:px-4">
                        {entry.userName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 sm:px-4">
                        {entry.picks[0] ? (
                          <span>
                            {entry.picks[0].golferName}{" "}
                            <span className={cn(
                              "font-medium",
                              entry.picks[0].scoreToPar !== null && entry.picks[0].scoreToPar < 0 && "text-red-600",
                              entry.picks[0].scoreToPar !== null && entry.picks[0].scoreToPar > 0 && "text-gray-500",
                              entry.picks[0].scoreToPar === 0 && "text-green-700"
                            )}>
                              ({formatScore(entry.picks[0].scoreToPar)})
                            </span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 sm:px-4">
                        {entry.picks[1] ? (
                          <span>
                            {entry.picks[1].golferName}{" "}
                            <span className={cn(
                              "font-medium",
                              entry.picks[1].scoreToPar !== null && entry.picks[1].scoreToPar < 0 && "text-red-600",
                              entry.picks[1].scoreToPar !== null && entry.picks[1].scoreToPar > 0 && "text-gray-500",
                              entry.picks[1].scoreToPar === 0 && "text-green-700"
                            )}>
                              ({formatScore(entry.picks[1].scoreToPar)})
                            </span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-sm font-bold sm:px-4">
                        <span className={cn(
                          entry.totalScore !== null && entry.totalScore < 0 && "text-red-600",
                          entry.totalScore !== null && entry.totalScore > 0 && "text-gray-500",
                          entry.totalScore === 0 && "text-green-700"
                        )}>
                          {formatScore(entry.totalScore)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-sm font-semibold text-green-700 sm:px-4">
                        {payout ? formatCurrency(payout) : ""}
                      </td>
                    </tr>
                  );
                })}

                {/* DQ'd entries at the bottom */}
                {dqEntries.map((entry) => (
                  <tr key={entry.entryId} className="bg-red-50/50">
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-400 sm:px-4">
                      -
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-400 sm:px-4">
                      <span className="line-through">{entry.userName}</span>
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                        DQ
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-400 line-through sm:px-4">
                      {entry.picks[0] ? (
                        <span>
                          {entry.picks[0].golferName}{" "}
                          ({formatScore(entry.picks[0].scoreToPar)})
                          {entry.picks[0].isWithdrawn && (
                            <span className="ml-1 text-xs text-red-500">WD</span>
                          )}
                          {entry.picks[0].madeTheCut === false && (
                            <span className="ml-1 text-xs text-red-500">MC</span>
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-400 line-through sm:px-4">
                      {entry.picks[1] ? (
                        <span>
                          {entry.picks[1].golferName}{" "}
                          ({formatScore(entry.picks[1].scoreToPar)})
                          {entry.picks[1].isWithdrawn && (
                            <span className="ml-1 text-xs text-red-500">WD</span>
                          )}
                          {entry.picks[1].madeTheCut === false && (
                            <span className="ml-1 text-xs text-red-500">MC</span>
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-sm text-gray-400 sm:px-4">
                      -
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-sm sm:px-4">
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
