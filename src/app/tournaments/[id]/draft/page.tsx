"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, Clock, Trophy, ArrowLeft, ListOrdered, Users, History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Button,
  Card,
  CardContent,
  Alert,
  Badge,
  Spinner,
  Avatar,
  EmptyState,
} from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DraftUser {
  userId: string;
  userName: string;
}

interface DraftPickEntry {
  id: string;
  userId: string;
  tournamentGolferId: string;
  overallPickNumber: number;
  round: number;
  pickedAt: string;
  user: { id: string; name: string };
  tournamentGolfer: {
    id: string;
    golfer: { name: string };
  };
}

interface PickSequenceItem {
  userId: string;
  round: number;
  overallPick: number;
}

interface CurrentPick {
  userId: string;
  round: number;
  overallPick: number;
}

interface DraftData {
  id: string;
  tournamentId: string;
  status: string; // PENDING | IN_PROGRESS | COMPLETE
  mode: string;
  currentRound: number;
  currentPickIndex: number;
  draftOrder: DraftUser[];
  pickTimeLimit: number;
  currentPickDeadline: string | null;
  startedAt: string | null;
  completedAt: string | null;
  picks: DraftPickEntry[];
  pickSequence: PickSequenceItem[];
  currentPick: CurrentPick | null;
  tournament: { id: string; name: string; status: string };
}

interface TournamentGolfer {
  id: string;
  tournamentId: string;
  golferId: string;
  odds: string | null;
  oddsProvider: string | null;
  golfer: { id: string; name: string; externalId: string | null };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function DraftPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params.id;
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id ?? null;

  const [draft, setDraft] = useState<DraftData | null>(null);
  const [golfers, setGolfers] = useState<TournamentGolfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDraft = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${tournamentId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("No draft found for this tournament.");
          setLoading(false);
          return;
        }
        throw new Error("Failed to load draft");
      }
      const data: DraftData = await res.json();
      setDraft(data);
      setError(null);
    } catch {
      setError("Failed to load draft data.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const fetchGolfers = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/field`);
      if (res.ok) {
        const data: TournamentGolfer[] = await res.json();
        setGolfers(data);
      }
    } catch {
      // Non-critical
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchDraft();
    fetchGolfers();
  }, [fetchDraft, fetchGolfers]);

  useEffect(() => {
    if (!draft) return;

    if (draft.status === "COMPLETE") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const interval = draft.status === "IN_PROGRESS" ? 3000 : 5000;
    pollingRef.current = setInterval(() => {
      fetchDraft();
    }, interval);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [draft?.status, draft, fetchDraft]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (draft?.status === "IN_PROGRESS" && draft.currentPickDeadline) {
      const updateTimer = () => {
        const deadline = new Date(draft.currentPickDeadline!).getTime();
        const remaining = Math.max(
          0,
          Math.floor((deadline - Date.now()) / 1000)
        );
        setTimerSeconds(remaining);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setTimerSeconds(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [draft?.status, draft?.currentPickDeadline]);

  async function handlePick(tournamentGolferId: string) {
    if (!currentUserId || pickingId) return;
    setPickingId(tournamentGolferId);
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${tournamentId}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentGolferId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to make pick");
      }

      await fetchDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPickingId(null);
    }
  }

  const pickedGolferIds = new Set(
    draft?.picks.map((p) => p.tournamentGolferId) ?? []
  );

  const availableGolfers = golfers.filter((g) => !pickedGolferIds.has(g.id));

  const filteredGolfers = searchQuery
    ? availableGolfers.filter((g) =>
        g.golfer.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableGolfers;

  const isMyTurn =
    draft?.status === "IN_PROGRESS" &&
    draft.currentPick?.userId === currentUserId;

  const currentPickUser = draft?.currentPick
    ? draft.draftOrder.find((u) => u.userId === draft.currentPick!.userId)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-emerald-600">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-stone-900">
          Draft Not Found
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          {error || "No draft exists for this tournament."}
        </p>
        <Link
          href={`/tournaments/${tournamentId}`}
          className="mt-4 inline-block text-sm text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          Back to Tournament
        </Link>
      </div>
    );
  }

  /* ================================================================ */
  /* PENDING STATE                                                     */
  /* ================================================================ */
  if (draft.status === "PENDING") {
    return (
      <div className="animate-fade-in-up mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Tournament Details
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold text-stone-900">
          {draft.tournament.name}
        </h1>
        <p className="text-sm text-stone-500">Draft Room</p>

        <Card accent="gold" className="mt-6">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-gold-600">
              <Clock className="h-7 w-7" />
            </div>
            <h2 className="font-display text-xl font-semibold text-stone-900">
              Waiting for Admin to Start
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              The draft order has been set. The commissioner will tee it off
              when everyone&apos;s ready.
            </p>
            <div className="mx-auto mt-4 flex items-center justify-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400" style={{ animationDelay: "0ms" }} />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400" style={{ animationDelay: "150ms" }} />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400" style={{ animationDelay: "300ms" }} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h3 className="font-display text-xl font-semibold text-stone-900">
            Snake Draft Order
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Round 1 goes in order, Round 2 snakes back in reverse.
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Round 1
                </h4>
                <ol className="space-y-2">
                  {draft.draftOrder.map((user, i) => (
                    <li
                      key={`r1-${user.userId}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                        user.userId === currentUserId &&
                          "bg-emerald-50 font-semibold text-emerald-800"
                      )}
                    >
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-700">
                        {i + 1}
                      </span>
                      <span className="truncate">{user.userName}</span>
                      {user.userId === currentUserId && (
                        <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-600">
                          You
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold-700">
                  Round 2 (Snake)
                </h4>
                <ol className="space-y-2">
                  {[...draft.draftOrder].reverse().map((user, i) => (
                    <li
                      key={`r2-${user.userId}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                        user.userId === currentUserId &&
                          "bg-emerald-50 font-semibold text-emerald-800"
                      )}
                    >
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-semibold text-gold-700">
                        {draft.draftOrder.length + i + 1}
                      </span>
                      <span className="truncate">{user.userName}</span>
                      {user.userId === currentUserId && (
                        <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-600">
                          You
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /* COMPLETE STATE                                                    */
  /* ================================================================ */
  if (draft.status === "COMPLETE") {
    const picksByUser = new Map<string, DraftPickEntry[]>();
    for (const pick of draft.picks) {
      const existing = picksByUser.get(pick.userId) ?? [];
      existing.push(pick);
      picksByUser.set(pick.userId, existing);
    }

    return (
      <div className="animate-fade-in-up mx-auto max-w-4xl px-4 py-8">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Tournament Details
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Draft Complete
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-stone-900">
              {draft.tournament.name}
            </h1>
            <p className="text-sm text-stone-500">
              All picks are in. Good luck out there.
            </p>
          </div>
          <Link href={`/tournaments/${tournamentId}/leaderboard`}>
            <Button variant="primary">View Leaderboard</Button>
          </Link>
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100 text-sm">
              <thead className="bg-cream-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  <th className="px-5 py-3">Player</th>
                  <th className="px-5 py-3">Pick 1 (R1)</th>
                  <th className="px-5 py-3">Pick 2 (R2)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {draft.draftOrder.map((user) => {
                  const userPicks = picksByUser.get(user.userId) ?? [];
                  const r1Pick = userPicks.find((p) => p.round === 1);
                  const r2Pick = userPicks.find((p) => p.round === 2);

                  return (
                    <tr
                      key={user.userId}
                      className={cn(
                        user.userId === currentUserId && "bg-emerald-50/50"
                      )}
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user.userName}
                            seed={user.userId}
                            size="sm"
                          />
                          <span className="font-medium text-stone-900">
                            {user.userName}
                          </span>
                          {user.userId === currentUserId && (
                            <span className="text-[10px] uppercase tracking-widest text-emerald-600">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-stone-700">
                        {r1Pick ? r1Pick.tournamentGolfer.golfer.name : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-stone-700">
                        {r2Pick ? r2Pick.tournamentGolfer.golfer.name : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  /* ================================================================ */
  /* IN_PROGRESS STATE                                                 */
  /* ================================================================ */
  const lowTime = timerSeconds !== null && timerSeconds <= 30;
  const [mobileTab, setMobileTab] = useState<"golfers" | "order" | "history">("golfers");

  return (
    <div className="animate-fade-in-up mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/tournaments/${tournamentId}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Tournament Details
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-stone-900 sm:text-3xl">
            {draft.tournament.name}
          </h1>
          <p className="text-sm text-stone-500">Draft Room</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="emerald">
            <span className="h-2 w-2 animate-live-pulse rounded-full bg-emerald-600" />
            Live
          </Badge>
          <span className="text-sm text-stone-500">
            Round {draft.currentRound} of 2
          </span>
        </div>
      </div>

      {/* On the clock banner - sticky on mobile */}
      <div
        className={cn(
          "sticky top-16 z-30 mt-4 overflow-hidden rounded-xl border shadow-sm transition-all",
          isMyTurn
            ? "border-gold-400 bg-gradient-to-r from-gold-50 to-cream-100"
            : "border-stone-200 bg-white",
          isMyTurn && lowTime && "animate-gold-pulse"
        )}
      >
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              On the Clock
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-stone-900 sm:text-3xl">
              {isMyTurn
                ? "It's your pick"
                : currentPickUser
                  ? `Waiting on ${currentPickUser.userName}`
                  : "—"}
            </p>
            {draft.currentPick && (
              <p className="mt-1 text-xs text-stone-500">
                Pick #{draft.currentPick.overallPick} · Round{" "}
                {draft.currentPick.round}
              </p>
            )}
          </div>
          {timerSeconds !== null && (
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <p className="text-xs uppercase tracking-widest text-stone-500">
                Time
              </p>
              <p
                className={cn(
                  "font-display font-bold tabular-nums text-3xl sm:text-5xl",
                  lowTime ? "text-rose-600" : "text-stone-900"
                )}
              >
                {Math.floor(timerSeconds / 60)}:
                {String(timerSeconds % 60).padStart(2, "0")}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      {/* Mobile tab navigation */}
      <div className="mt-4 flex gap-1 rounded-lg bg-stone-100 p-1 lg:hidden">
        {([
          { key: "golfers" as const, label: "Golfers", icon: Users },
          { key: "order" as const, label: "Order", icon: ListOrdered },
          { key: "history" as const, label: "History", icon: History },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMobileTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mobileTab === key
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:mt-6 lg:grid-cols-12">
        {/* Left: Draft Order */}
        <aside className={cn("lg:col-span-3", mobileTab !== "order" && "hidden lg:block")}>
          <Card className="overflow-hidden">
            <div className="border-b border-stone-100 px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-stone-900">
                Draft Order
              </h2>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {draft.pickSequence.map((seq, index) => {
                const user = draft.draftOrder.find(
                  (u) => u.userId === seq.userId
                );
                const picked = draft.picks.find(
                  (p) => p.overallPickNumber === seq.overallPick
                );
                const isCurrent =
                  draft.currentPick?.overallPick === seq.overallPick;
                const showRoundHeader =
                  index === 0 ||
                  draft.pickSequence[index - 1].round !== seq.round;

                return (
                  <div key={`${seq.round}-${seq.overallPick}`}>
                    {showRoundHeader && (
                      <div className="border-b border-stone-100 bg-cream-50 px-4 py-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                          Round {seq.round}
                          {seq.round === 2 && " — Snake"}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-2 border-b border-stone-50 px-4 py-2",
                        isCurrent && "bg-gold-50",
                        isCurrent &&
                          seq.userId === currentUserId &&
                          "bg-emerald-50",
                        picked && "opacity-60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          isCurrent
                            ? "bg-gold-400 text-stone-900"
                            : "bg-stone-100 text-stone-600"
                        )}
                      >
                        {seq.overallPick}
                      </span>
                      <span
                        className={cn(
                          "truncate text-sm",
                          isCurrent
                            ? "font-semibold text-stone-900"
                            : "text-stone-700",
                          seq.userId === currentUserId && "text-emerald-700"
                        )}
                      >
                        {user?.userName ?? "Unknown"}
                      </span>
                      {picked && (
                        <span className="ml-auto truncate text-xs text-stone-400">
                          {picked.tournamentGolfer.golfer.name}
                        </span>
                      )}
                      {isCurrent && !picked && (
                        <span className="ml-auto inline-block h-2 w-2 animate-pulse rounded-full bg-gold-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </aside>

        {/* Center: Available Golfers */}
        <section className={cn("lg:col-span-5", mobileTab !== "golfers" && "hidden lg:block")}>
          <Card className="overflow-hidden">
            <div className="border-b border-stone-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-stone-900">
                  Available Golfers
                </h2>
                <Badge variant="neutral" size="sm">
                  {availableGolfers.length}
                </Badge>
              </div>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search golfers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border border-stone-300 bg-white py-1.5 pl-9 pr-3 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {filteredGolfers.length === 0 ? (
                <div className="p-6 text-center text-sm text-stone-500">
                  {searchQuery
                    ? "No golfers match your search."
                    : "No golfers available."}
                </div>
              ) : (
                <ul className="divide-y divide-stone-50">
                  {filteredGolfers.map((golfer) => (
                    <li
                      key={golfer.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-cream-50"
                    >
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-sm font-medium text-stone-900 truncate">
                          {golfer.golfer.name}
                        </span>
                        <span
                          className="text-xs font-mono text-stone-500 tabular-nums"
                          title={
                            golfer.oddsProvider
                              ? `Odds via ${golfer.oddsProvider}`
                              : undefined
                          }
                        >
                          {golfer.odds ?? "—"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={isMyTurn ? "primary" : "ghost"}
                        onClick={() => handlePick(golfer.id)}
                        disabled={!isMyTurn || pickingId !== null}
                        loading={pickingId === golfer.id}
                      >
                        Pick
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </section>

        {/* Right: Pick History */}
        <aside className={cn("lg:col-span-4", mobileTab !== "history" && "hidden lg:block")}>
          <Card className="overflow-hidden">
            <div className="border-b border-stone-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-stone-900">
                  Pick History
                </h2>
                <Badge variant="neutral" size="sm">
                  {draft.picks.length}
                </Badge>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {draft.picks.length === 0 ? (
                <EmptyState
                  icon={<Trophy className="h-5 w-5" />}
                  title="No picks yet"
                  description="The first pick is on the clock."
                  className="py-8"
                />
              ) : (
                <ul className="divide-y divide-stone-50">
                  {[...draft.picks]
                    .sort(
                      (a, b) => b.overallPickNumber - a.overallPickNumber
                    )
                    .map((pick) => (
                      <li
                        key={pick.id}
                        className={cn(
                          "px-4 py-2.5",
                          pick.userId === currentUserId && "bg-emerald-50/60"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                            {pick.overallPickNumber}
                          </span>
                          <span className="text-sm font-medium text-stone-900">
                            {pick.user.name}
                          </span>
                          <span className="text-xs text-stone-400">
                            R{pick.round}
                          </span>
                        </div>
                        <p className="mt-0.5 pl-7 text-sm text-stone-600">
                          {pick.tournamentGolfer.golfer.name}
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
