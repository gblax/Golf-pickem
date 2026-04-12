"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardContent,
  EmptyState,
  MedalBadge,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";

interface StandingEntry {
  userId: string;
  userName: string;
  totalEntries: number;
  totalWinnings: number;
  bestFinish: number | null;
  wins: number;
}

function formatPlace(pos: number): string {
  if (pos === 1) return "1st";
  if (pos === 2) return "2nd";
  if (pos === 3) return "3rd";
  return `${pos}th`;
}

function calcRoi(totalWinnings: number, totalEntries: number) {
  const buyInTotal = totalEntries * 5000;
  if (buyInTotal === 0) return null;
  return ((totalWinnings - buyInTotal) / buyInTotal) * 100;
}

function RoiLabel({ value }: { value: number | null }) {
  if (value === null) return <span className="text-stone-400">—</span>;
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        positive ? "text-emerald-700" : "text-rose-600"
      )}
    >
      {positive ? "+" : ""}
      {value.toFixed(0)}%
    </span>
  );
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
      <div className="flex items-center justify-center py-24 text-emerald-600">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Season"
        title="Standings"
        subtitle="Overall rankings based on completed tournaments."
      />

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {standings.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={<Trophy className="h-6 w-6" />}
            title="No standings yet"
            description="Standings will appear once the first tournament finishes."
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100 text-sm">
                <thead className="bg-cream-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 text-center">Entries</th>
                    <th className="px-4 py-3 text-center">Wins</th>
                    <th className="px-4 py-3 text-center">Winnings</th>
                    <th className="px-4 py-3 text-center">Best</th>
                    <th className="px-4 py-3 text-center">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {standings.map((entry, index) => {
                    const rank = index + 1;
                    const isTop3 = rank <= 3;
                    const roi = calcRoi(entry.totalWinnings, entry.totalEntries);
                    return (
                      <tr
                        key={entry.userId}
                        className={cn(
                          "transition-colors hover:bg-cream-100/60",
                          isTop3 &&
                            "bg-gradient-to-r from-gold-50/80 to-transparent"
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          {isTop3 ? (
                            <MedalBadge place={rank} />
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700">
                              {rank}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={entry.userName} seed={entry.userId} size="sm" />
                            <span className="font-semibold text-stone-900">
                              {entry.userName}
                            </span>
                            {entry.wins > 0 && (
                              <Badge variant="gold" size="sm">
                                {entry.wins}W
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-stone-600 tabular-nums">
                          {entry.totalEntries}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-stone-600 tabular-nums">
                          {entry.wins}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-emerald-700 tabular-nums">
                          {formatCurrency(entry.totalWinnings)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-stone-600">
                          {entry.bestFinish !== null
                            ? formatPlace(entry.bestFinish)
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <RoiLabel value={roi} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile card list */}
          <div className="space-y-3 sm:hidden">
            {standings.map((entry, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const roi = calcRoi(entry.totalWinnings, entry.totalEntries);
              return (
                <Card key={entry.userId} accent={isTop3 ? "gold" : "none"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {isTop3 ? (
                        <MedalBadge place={rank} />
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700">
                          {rank}
                        </span>
                      )}
                      <Avatar name={entry.userName} seed={entry.userId} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate font-semibold text-stone-900">
                          {entry.userName}
                          {entry.wins > 0 && (
                            <Badge variant="gold" size="sm">
                              {entry.wins}W
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-stone-500">
                          {entry.totalEntries}{" "}
                          {entry.totalEntries === 1 ? "entry" : "entries"}
                          {entry.bestFinish !== null && (
                            <> &middot; Best {formatPlace(entry.bestFinish)}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-stone-100 pt-3 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                          Winnings
                        </p>
                        <p className="font-semibold text-emerald-700 tabular-nums">
                          {formatCurrency(entry.totalWinnings)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                          ROI
                        </p>
                        <p>
                          <RoiLabel value={roi} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
