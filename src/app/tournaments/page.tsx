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
  const tournaments = sortTournamentsByRelevance(all).slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
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
        <div className="grid gap-4 sm:grid-cols-2">
          {tournaments.map((tournament) => {
            const isActive =
              tournament.status === TOURNAMENT_STATUS.IN_PROGRESS ||
              tournament.status === TOURNAMENT_STATUS.DRAFT_OPEN;
            const isComplete =
              tournament.status === TOURNAMENT_STATUS.COMPLETE;
            return (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                className="group block"
              >
                <Card
                  interactive
                  accent={isActive ? "gold" : "none"}
                  className={isComplete ? "opacity-80" : ""}
                >
                  <CardContent className="flex min-h-[140px] flex-col justify-between gap-4 p-5">
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h2 className="font-display text-xl font-semibold leading-tight text-stone-900 group-hover:text-emerald-700">
                          {tournament.name}
                        </h2>
                        <StatusBadge status={tournament.status} />
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
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
