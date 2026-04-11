export const dynamic = "force-dynamic";

import Link from "next/link";
import { Trophy, Target, ListOrdered } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOURNAMENT_STATUS } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, StatusBadge, Button, EmptyState } from "@/components/ui";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cream-50 via-cream-100 to-emerald-50" />
        <div
          aria-hidden
          className="absolute -top-24 right-[-80px] h-72 w-72 rounded-full bg-gold-200/50 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute bottom-[-120px] left-[-60px] h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl"
        />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem-88px)] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-100 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
            Weekly PGA Pick-em Pool
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
            Draft your four,{" "}
            <span className="text-emerald-700">take the pot.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-stone-600">
            A snake-draft golf pick&apos;em for friends. Pick wisely, sweat the
            cut line, and climb the leaderboard every single week.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" variant="primary" className="w-full sm:w-auto">
                Create Account
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
            <FeatureCard
              icon={<Target className="h-5 w-5" />}
              title="Draft four"
              body="Snake draft one pick per round, two rounds total."
            />
            <FeatureCard
              icon={<ListOrdered className="h-5 w-5" />}
              title="Live leaderboard"
              body="Scores refresh from ESPN throughout the weekend."
            />
            <FeatureCard
              icon={<Trophy className="h-5 w-5" />}
              title="Win the pot"
              body="Payouts stack up to the top finishers each week."
            />
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

  const accent: "emerald" | "gold" | "stone" =
    tournament?.status === TOURNAMENT_STATUS.IN_PROGRESS
      ? "emerald"
      : tournament?.status === TOURNAMENT_STATUS.DRAFT_OPEN
        ? "gold"
        : "stone";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">
          Clubhouse
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">
          Welcome back, {session.user.name}
        </h1>
      </div>

      {tournament ? (
        <Card accent={accent} interactive className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                  {tournament.status === TOURNAMENT_STATUS.UPCOMING
                    ? "Upcoming Tournament"
                    : tournament.status === TOURNAMENT_STATUS.IN_PROGRESS
                      ? "Live Now"
                      : tournament.status === TOURNAMENT_STATUS.DRAFT_OPEN
                        ? "Draft Open"
                        : "Current Tournament"}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-stone-900">
                  {tournament.name}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {formatDate(tournament.startDate)} &ndash;{" "}
                  {formatDate(tournament.endDate)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={tournament.status} />
                  <span className="text-stone-600">
                    Buy-in{" "}
                    <span className="font-semibold text-stone-900">
                      {formatCurrency(tournament.buyIn)}
                    </span>
                  </span>
                  <span className="text-stone-400">&middot;</span>
                  <span className="text-stone-600">
                    <span className="font-semibold text-stone-900">
                      {tournament.entries.length}
                    </span>{" "}
                    entered
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                {!userEntry && tournament.status === TOURNAMENT_STATUS.UPCOMING && (
                  <Link href={`/tournaments/${tournament.id}/enter`}>
                    <Button variant="primary" className="w-full sm:w-auto">
                      Enter Tournament
                    </Button>
                  </Link>
                )}
                {userEntry && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    You&apos;re entered
                  </span>
                )}
                {tournament.draft &&
                  tournament.draft.status !== "COMPLETE" &&
                  tournament.status === TOURNAMENT_STATUS.DRAFT_OPEN && (
                    <Link href={`/tournaments/${tournament.id}/draft`}>
                      <Button variant="gold" className="w-full sm:w-auto">
                        Go to Draft Room
                      </Button>
                    </Link>
                  )}
                {(tournament.status === TOURNAMENT_STATUS.IN_PROGRESS ||
                  tournament.status === TOURNAMENT_STATUS.COMPLETE) && (
                  <Link href={`/tournaments/${tournament.id}/leaderboard`}>
                    <Button variant="secondary" className="w-full sm:w-auto">
                      View Leaderboard
                    </Button>
                  </Link>
                )}
                <Link
                  href={`/tournaments/${tournament.id}`}
                  className="text-sm text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Tournament Details &rarr;
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Trophy className="h-6 w-6" />}
            title="No upcoming tournaments"
            description="Nothing on the schedule right now. Check back soon!"
          />
        </Card>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <QuickLink
          href="/tournaments"
          title="All Tournaments"
          description="Browse past and upcoming events"
          icon={<Trophy className="h-5 w-5" />}
        />
        <QuickLink
          href="/standings"
          title="Season Standings"
          description="See who's leading the year"
          icon={<ListOrdered className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-stone-900">
        {title}
      </h3>
      <p className="mt-1 text-sm text-stone-600">{body}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base font-semibold text-stone-900">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-stone-500">{description}</p>
      </div>
      <span
        aria-hidden
        className="text-stone-400 transition-colors group-hover:text-emerald-700"
      >
        &rarr;
      </span>
    </Link>
  );
}
