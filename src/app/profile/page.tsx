export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatScore, cn } from "@/lib/utils";
import {
  Avatar,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  Button,
} from "@/components/ui";
import ChangePasswordCard from "@/components/ChangePasswordCard";

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

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      entries: {
        include: {
          tournament: {
            select: { id: true, name: true, status: true, startDate: true },
          },
          picks: {
            include: {
              tournamentGolfer: {
                include: { golfer: { select: { name: true } } },
              },
            },
            orderBy: { pickOrder: "asc" },
          },
        },
        orderBy: { tournament: { startDate: "desc" } },
      },
    },
  });

  if (!user) redirect("/login");

  const entries = user.entries as ProfileEntry[];
  const totalEntries = entries.length;
  const totalWinnings = entries.reduce((sum, e) => sum + (e.payout ?? 0), 0);
  const completedEntries = entries.filter(
    (e) => e.tournament.status === "COMPLETE"
  );
  const totalBuyIns = completedEntries.length * 5000; // default $50

  const bestFinish = (() => {
    const finishes = entries
      .filter((e) => e.finishPosition !== null)
      .map((e) => e.finishPosition!);
    if (finishes.length === 0) return "—";
    const best = Math.min(...finishes);
    return ordinal(best);
  })();

  const roiNumerator = totalWinnings - totalBuyIns;
  const roiLabel =
    totalBuyIns > 0 ? `${((roiNumerator / totalBuyIns) * 100).toFixed(0)}%` : "—";
  const roiPositive = totalBuyIns > 0 && roiNumerator >= 0;

  return (
    <div className="animate-fade-in-up mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PageHeader eyebrow="Profile" title="Your Clubhouse" />

      <Card className="mb-6">
        <CardContent className="flex items-center gap-5 p-6">
          <Avatar name={user.name} seed={user.id} size="lg" />
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold text-stone-900">
              {user.name}
            </h2>
            <p className="text-sm text-stone-500">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <div className="grid grid-cols-2 divide-x divide-y divide-stone-100 sm:grid-cols-4 sm:divide-y-0">
          <StatCell label="Entries" value={totalEntries} />
          <StatCell
            label="Winnings"
            value={formatCurrency(totalWinnings)}
            accent="emerald"
          />
          <StatCell label="Best Finish" value={bestFinish} />
          <StatCell
            label="ROI"
            value={roiLabel}
            accent={totalBuyIns > 0 ? (roiPositive ? "emerald" : "rose") : "default"}
          />
        </div>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-stone-900">
          Tournament History
        </h2>

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Trophy className="h-6 w-6" />}
              title="No tournaments yet"
              description="Enter your first tournament to start tracking results."
              action={
                <Link href="/tournaments">
                  <Button variant="primary">Browse Tournaments</Button>
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
                    <th className="px-4 py-3">Golfers</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Finish</th>
                    <th className="px-4 py-3 text-center">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-cream-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/tournaments/${entry.tournament.id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {entry.tournament.name}
                        </Link>
                        <p className="text-xs text-stone-400">
                          {formatDate(entry.tournament.startDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {entry.picks.length > 0
                          ? entry.picks
                              .map((p) => p.tournamentGolfer.golfer.name)
                              .join(", ")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            entry.isDisqualified && "text-rose-600",
                            !entry.isDisqualified &&
                              entry.totalScore !== null &&
                              entry.totalScore < 0 &&
                              "text-rose-600",
                            !entry.isDisqualified &&
                              entry.totalScore === 0 &&
                              "text-emerald-700",
                            !entry.isDisqualified &&
                              entry.totalScore !== null &&
                              entry.totalScore > 0 &&
                              "text-stone-500"
                          )}
                        >
                          {entry.isDisqualified
                            ? "DQ"
                            : formatScore(entry.totalScore ?? null)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-stone-700">
                        {entry.finishPosition ? ordinal(entry.finishPosition) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-emerald-700">
                        {entry.payout ? formatCurrency(entry.payout) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="mt-8">
        <ChangePasswordCard />
      </section>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: React.ReactNode;
  accent?: "default" | "emerald" | "rose";
}) {
  return (
    <div className="px-5 py-5 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-semibold",
          accent === "emerald" && "text-emerald-700",
          accent === "rose" && "text-rose-600",
          accent === "default" && "text-stone-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
