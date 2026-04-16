"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  EmptyState,
  MedalBadge,
  Spinner,
} from "@/components/ui";
import { cn, formatCurrency, formatScore } from "@/lib/utils";

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

function ScoreSpan({ score }: { score: number | null }) {
  if (score === null) return <span className="text-stone-400">—</span>;
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        score < 0 && "text-rose-600",
        score === 0 && "text-emerald-700",
        score > 0 && "text-stone-500"
      )}
    >
      {formatScore(score)}
    </span>
  );
}

function PickCell({ pick }: { pick: LeaderboardPick | undefined }) {
  if (!pick) return <span className="text-stone-400">—</span>;
  return (
    <span>
      <span className="text-stone-700">{pick.golferName}</span>{" "}
      <ScoreSpan score={pick.scoreToPar} />
    </span>
  );
}

export default function LeaderboardPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params.id;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [tournament, setTournament] = useState<{
    name: string;
    buyIn: number;
    status: string;
  } | null>(null);
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
        setTournament({
          name: data.name,
          buyIn: data.buyIn,
          status: data.status,
        });
      }
    } catch {
      // Non-critical
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchLeaderboard();
    fetchTournament();
  }, [fetchLeaderboard, fetchTournament]);

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
  const activeEntries = entries.filter((e) => !e.isDisqualified);
  const dqEntries = entries.filter((e) => e.isDisqualified);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-emerald-600">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Tournament Details
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Leaderboard
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">
              {tournament?.name ?? "Tournament"}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-stone-500">
              <span className="inline-block h-2 w-2 animate-live-pulse rounded-full bg-emerald-500" />
              Auto-refresh · {countdown}s
            </div>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-stone-200">
              <div
                key={countdown === REFRESH_INTERVAL ? Date.now() : "stable"}
                className="h-full rounded-full bg-emerald-500 animate-countdown"
                style={{ "--countdown-duration": `${REFRESH_INTERVAL}s` } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {entries.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={<Trophy className="h-6 w-6" />}
            title="No entries yet"
            description="Once players enter and picks are made, the leaderboard will update here."
          />
        </Card>
      ) : (
        <>
          {/* Desktop/tablet table */}
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100 text-sm">
                <thead className="bg-cream-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Golfer 1</th>
                    <th className="px-4 py-3">Golfer 2</th>
                    <th className="px-4 py-3 text-center">Combined</th>
                    <th className="px-4 py-3 text-center">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {activeEntries.map((entry) => {
                    const payout = entry.rank
                      ? payoutByRank.get(entry.rank)
                      : undefined;
                    const inMoney = (payout ?? 0) > 0;
                    const isTop3 =
                      entry.rank !== null && entry.rank >= 1 && entry.rank <= 3;
                    return (
                      <tr
                        key={entry.entryId}
                        className={cn(
                          "transition-colors hover:bg-cream-100/60",
                          isTop3 &&
                            "bg-gradient-to-r from-gold-50/80 to-transparent",
                          !isTop3 && inMoney && "bg-emerald-50/60"
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          {isTop3 ? (
                            <MedalBadge place={entry.rank!} />
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700">
                              {entry.rank ?? "—"}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-900">
                          {entry.userName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                          <PickCell pick={entry.picks[0]} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                          <PickCell pick={entry.picks[1]} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-display text-base font-bold">
                          <ScoreSpan score={entry.totalScore} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-emerald-700">
                          {payout ? formatCurrency(payout) : ""}
                        </td>
                      </tr>
                    );
                  })}

                  {dqEntries.length > 0 && (
                    <tr>
                      <td colSpan={6} className="bg-cream-100/50 px-4 py-2">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                          <span className="h-px flex-1 bg-gold-300" />
                          Disqualified
                          <span className="h-px flex-1 bg-gold-300" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {dqEntries.map((entry) => (
                    <tr key={entry.entryId} className="bg-rose-50/30">
                      <td className="whitespace-nowrap px-4 py-3 text-stone-400">
                        —
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="line-through text-stone-400">
                          {entry.userName}
                        </span>
                        <Badge variant="rose" size="sm" className="ml-2">
                          DQ
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-400 line-through">
                        {entry.picks[0]?.golferName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-400 line-through">
                        {entry.picks[1]?.golferName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-stone-400">
                        —
                      </td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile card list */}
          <div className="space-y-3 sm:hidden">
            {activeEntries.map((entry) => {
              const payout = entry.rank
                ? payoutByRank.get(entry.rank)
                : undefined;
              const isTop3 =
                entry.rank !== null && entry.rank >= 1 && entry.rank <= 3;
              return (
                <Card
                  key={entry.entryId}
                  accent={isTop3 ? "gold" : "none"}
                  className={cn((payout ?? 0) > 0 && !isTop3 && "bg-emerald-50/40")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {isTop3 ? (
                        <MedalBadge place={entry.rank!} />
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700">
                          {entry.rank ?? "—"}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-stone-900">
                          {entry.userName}
                        </p>
                        <p className="text-xs text-stone-500">
                          Combined{" "}
                          <span className="font-display text-base font-bold">
                            <ScoreSpan score={entry.totalScore} />
                          </span>
                          {payout ? (
                            <>
                              {" "}
                              &middot;{" "}
                              <span className="font-semibold text-emerald-700">
                                {formatCurrency(payout)}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3 text-sm">
                      {entry.picks.map((pick, i) => (
                        <div key={i} className="rounded-lg bg-cream-50 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                            Pick {i + 1}
                          </p>
                          <p className="font-medium text-stone-800">
                            {pick?.golferName ?? "—"}
                          </p>
                          {pick && (
                            <p className="mt-0.5 text-xs text-stone-500">
                              <ScoreSpan score={pick.scoreToPar} />
                              {pick.thru && <> · {pick.thru}</>}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {dqEntries.length > 0 && (
              <div className="pt-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                  <span className="h-px flex-1 bg-gold-300" />
                  Disqualified
                  <span className="h-px flex-1 bg-gold-300" />
                </div>
                {dqEntries.map((entry) => (
                  <Card key={entry.entryId} className="mb-2 bg-rose-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="line-through text-stone-500">
                          {entry.userName}
                        </span>
                        <Badge variant="rose" size="sm">
                          DQ
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
