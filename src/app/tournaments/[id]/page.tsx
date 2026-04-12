export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOURNAMENT_STATUS } from "@/types";
import { formatCurrency, formatDate, formatScore, cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  PageHeader,
  StatusBadge,
  Button,
  Badge,
  Avatar,
  EmptyState,
} from "@/components/ui";
import WithdrawButton from "@/components/WithdrawButton";

function getPayoutStructure(
  entryCount: number,
  buyIn: number
): { place: number; payout: number }[] {
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

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
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
  const canWithdraw =
    !!userEntry &&
    (tournament.status === TOURNAMENT_STATUS.UPCOMING ||
      tournament.status === TOURNAMENT_STATUS.DRAFT_OPEN) &&
    (!tournament.draft || tournament.draft.status === "PENDING");

  const payouts = getPayoutStructure(
    tournament.entries.length,
    tournament.buyIn
  );
  const pool = tournament.entries.length * tournament.buyIn;

  return (
    <div className="animate-fade-in-up mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow={<StatusBadge status={tournament.status} />}
        title={tournament.name}
        subtitle={`${formatDate(tournament.startDate)} – ${formatDate(
          tournament.endDate
        )}`}
        backHref="/tournaments"
        backLabel="All tournaments"
        actions={
          <>
            {session &&
              !userEntry &&
              tournament.status === TOURNAMENT_STATUS.UPCOMING && (
                <Link href={`/tournaments/${id}/enter`}>
                  <Button variant="primary">Enter Tournament</Button>
                </Link>
              )}
            {userEntry && (
              <Badge variant="emerald" size="md">
                Entered
              </Badge>
            )}
            {canWithdraw && (
              <WithdrawButton
                tournamentId={id}
                tournamentName={tournament.name}
              />
            )}
            {tournament.draft && (
              <Link href={`/tournaments/${id}/draft`}>
                <Button variant="secondary">Draft Room</Button>
              </Link>
            )}
            {(tournament.status === TOURNAMENT_STATUS.IN_PROGRESS ||
              tournament.status === TOURNAMENT_STATUS.COMPLETE) && (
              <Link href={`/tournaments/${id}/leaderboard`}>
                <Button variant="secondary">Leaderboard</Button>
              </Link>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Buy-in
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-stone-900">
              {formatCurrency(tournament.buyIn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Entries
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-stone-900">
              {tournament.entries.length}
            </p>
          </CardContent>
        </Card>
        <Card accent="gold">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Total Pool
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-gold-600">
              {formatCurrency(pool)}
            </p>
          </CardContent>
        </Card>
      </div>

      {tournament.entries.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-semibold text-stone-900">
            Payout Structure
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {payouts.map((p) => (
              <Card
                key={p.place}
                accent={p.place === 1 ? "gold" : "none"}
                className="text-center"
              >
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {ordinal(p.place)}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display text-xl font-bold",
                      p.place === 1 ? "text-gold-600" : "text-emerald-700"
                    )}
                  >
                    {formatCurrency(p.payout)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold text-stone-900">
            Entered Players
          </h2>
          <Badge variant="neutral" size="sm">
            {tournament.entries.length}
          </Badge>
        </div>
        {tournament.entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No one has entered yet"
              description="Be the first to join."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100">
                <thead className="bg-cream-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-5 py-3">Player</th>
                    <th className="px-5 py-3">Picks</th>
                    <th className="px-5 py-3 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {tournament.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={cn(
                        "transition-colors hover:bg-cream-50",
                        entry.userId === userId && "bg-emerald-50/50"
                      )}
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={entry.user.name}
                            seed={entry.user.id}
                            size="sm"
                          />
                          <div>
                            <span className="font-medium text-stone-900">
                              {entry.user.name}
                            </span>
                            {entry.isDisqualified && (
                              <Badge
                                variant="rose"
                                size="sm"
                                className="ml-2"
                              >
                                DQ
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-stone-600">
                        {entry.picks.length > 0
                          ? entry.picks
                              .sort((a, b) => a.pickOrder - b.pickOrder)
                              .map((p) => p.tournamentGolfer.golfer.name)
                              .join(", ")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-center font-medium text-stone-900">
                        {entry.totalScore !== null
                          ? formatScore(entry.totalScore)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {tournament.golfers.length > 0 && (
        <section>
          <details className="group rounded-xl border border-stone-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 font-display text-lg font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-4 w-4 text-stone-500 transition-transform group-open:rotate-0 [details:not([open])_&]:-rotate-90" />
              Tournament Field
              <Badge variant="neutral" size="sm">
                {tournament.golfers.length}
              </Badge>
            </summary>
            <div className="overflow-x-auto border-t border-stone-100">
              <table className="min-w-full divide-y divide-stone-100">
                <thead className="bg-cream-50">
                  <tr className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-5 py-3 text-left">Golfer</th>
                    <th className="px-5 py-3 text-center">Position</th>
                    <th className="px-5 py-3 text-center">Score</th>
                    <th className="px-5 py-3 text-center">Thru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {tournament.golfers.map((tg) => (
                    <tr
                      key={tg.id}
                      className={cn(
                        "transition-colors hover:bg-cream-50",
                        (tg.isWithdrawn || tg.madeTheCut === false) &&
                          "bg-stone-50 text-stone-400"
                      )}
                    >
                      <td className="whitespace-nowrap px-5 py-2 font-medium">
                        <span
                          className={cn(tg.isWithdrawn && "line-through")}
                        >
                          {tg.golfer.name}
                        </span>
                        {tg.isWithdrawn && (
                          <span className="ml-2 text-xs text-rose-500">
                            WD
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-center">
                        {tg.position || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-center">
                        {formatScore(tg.scoreToPar ?? null)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-center">
                        {tg.thru || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
