export const dynamic = "force-dynamic";

import Link from "next/link";
import { Trophy, Users, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatDate,
  sortTournamentsByRelevance,
} from "@/lib/utils";
import { TOURNAMENT_STATUS } from "@/types";
import {
  Card,
  CardContent,
  StatusBadge,
  PageHeader,
  EmptyState,
} from "@/components/ui";

export default async function TournamentsPage() {
  const all = await prisma.tournament.findMany({
    include: {
      _count: { select: { entries: true } },
    },
  });
  const tournaments = sortTournamentsByRelevance(all).slice(0, 20);

  const activeTournaments = tournaments.filter(
    (t) =>
      t.status === TOURNAMENT_STATUS.IN_PROGRESS ||
      t.status === TOURNAMENT_STATUS.DRAFT_OPEN ||
      t.status === TOURNAMENT_STATUS.UPCOMING
  );
  const completedTournaments = tournaments.filter(
    (t) => t.status === TOURNAMENT_STATUS.COMPLETE
  );

  return (
    <div className="animate-fade-in-up mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Schedule"
        title="Tournaments"
        subtitle="Browse upcoming, live, and past events"
      />

      {tournaments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy className="h-6 w-6" />}
            title="No tournaments yet"
            description="Check back soon — or ask your commissioner to create one."
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {activeTournaments.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                  Active &amp; Upcoming
                </h2>
                <span className="h-px flex-1 bg-stone-200" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            </section>
          )}

          {completedTournaments.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                  Completed
                </h2>
                <span className="h-px flex-1 bg-stone-200" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {completedTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TournamentCard({
  tournament,
}: {
  tournament: {
    id: string;
    name: string;
    status: string;
    startDate: Date | string;
    endDate: Date | string;
    buyIn: number;
    _count: { entries: number };
  };
}) {
  const isActive =
    tournament.status === TOURNAMENT_STATUS.IN_PROGRESS ||
    tournament.status === TOURNAMENT_STATUS.DRAFT_OPEN;
  const isLive = tournament.status === TOURNAMENT_STATUS.IN_PROGRESS;
  const isComplete = tournament.status === TOURNAMENT_STATUS.COMPLETE;
  const pool = tournament._count.entries * tournament.buyIn;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group block"
    >
      <Card
        interactive
        accent={isActive ? "gold" : "none"}
        className={isComplete ? "opacity-75 hover:opacity-100 transition-opacity" : ""}
      >
        <CardContent className="flex min-h-[140px] flex-col justify-between gap-4 p-5">
          <div>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="font-display text-xl font-semibold leading-tight text-stone-900 transition-colors group-hover:text-emerald-700">
                {tournament.name}
              </h2>
              <div className="flex items-center gap-1.5">
                {isLive && (
                  <span className="inline-block h-2 w-2 animate-live-pulse rounded-full bg-emerald-500" />
                )}
                <StatusBadge status={tournament.status} />
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-stone-500">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(tournament.startDate)} &ndash;{" "}
              {formatDate(tournament.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-4 border-t border-stone-100 pt-3 text-sm text-stone-600">
            <span className="font-medium text-stone-900">
              {formatCurrency(tournament.buyIn)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-stone-400" />
              {tournament._count.entries} entered
            </span>
            {pool > 0 && (
              <span className="ml-auto font-semibold text-gold-600">
                {formatCurrency(pool)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
