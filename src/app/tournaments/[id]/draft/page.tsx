"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

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
  golfer: { id: string; name: string; externalId: string | null };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
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

  /* ---- Fetch draft ---- */
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

  /* ---- Fetch golfer field ---- */
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

  /* ---- Initial load ---- */
  useEffect(() => {
    fetchDraft();
    fetchGolfers();
  }, [fetchDraft, fetchGolfers]);

  /* ---- Polling ---- */
  useEffect(() => {
    if (!draft) return;

    // Only poll during PENDING or IN_PROGRESS
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
  }, [draft?.status, fetchDraft]);

  /* ---- Timer ---- */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (
      draft?.status === "IN_PROGRESS" &&
      draft.currentPickDeadline
    ) {
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

  /* ---- Make a pick ---- */
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

      // Refresh immediately
      await fetchDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPickingId(null);
    }
  }

  /* ---- Derived state ---- */
  const pickedGolferIds = new Set(
    draft?.picks.map((p) => p.tournamentGolferId) ?? []
  );

  const availableGolfers = golfers.filter(
    (g) => !pickedGolferIds.has(g.id)
  );

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

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Draft Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">{error || "No draft exists for this tournament."}</p>
        <Link
          href={`/tournaments/${tournamentId}`}
          className="mt-4 inline-block text-sm text-green-600 hover:text-green-700 hover:underline"
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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="text-sm text-green-600 hover:text-green-700 hover:underline"
        >
          &larr; Tournament Details
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {draft.tournament.name} - Draft Room
        </h1>

        <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <div className="text-3xl">&#9203;</div>
          <h2 className="mt-2 text-lg font-semibold text-yellow-800">
            Waiting for Admin to Start Draft
          </h2>
          <p className="mt-1 text-sm text-yellow-700">
            The draft order has been set. The admin will start the draft when
            everyone is ready.
          </p>
        </div>

        {/* Draft Order Preview */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900">Draft Order</h3>
          <p className="mt-1 text-xs text-gray-500">
            Snake draft: Round 1 picks in order, Round 2 picks in reverse
          </p>
          <div className="mt-3 space-y-2">
            {draft.draftOrder.map((user, index) => (
              <div
                key={user.userId}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-4 py-3",
                  user.userId === currentUserId
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200 bg-white"
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {user.userName}
                  {user.userId === currentUserId && (
                    <span className="ml-2 text-xs text-green-600">(You)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Snake draft visualization */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700">
              Round 1 Order
            </h4>
            <div className="mt-2 space-y-1">
              {draft.draftOrder.map((user, i) => (
                <div
                  key={`r1-${user.userId}`}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span className="text-xs text-gray-400">Pick {i + 1}</span>
                  <span className={cn(user.userId === currentUserId && "font-semibold text-green-700")}>
                    {user.userName}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700">
              Round 2 Order (reversed)
            </h4>
            <div className="mt-2 space-y-1">
              {[...draft.draftOrder].reverse().map((user, i) => (
                <div
                  key={`r2-${user.userId}`}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span className="text-xs text-gray-400">
                    Pick {draft.draftOrder.length + i + 1}
                  </span>
                  <span className={cn(user.userId === currentUserId && "font-semibold text-green-700")}>
                    {user.userName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /* COMPLETE STATE                                                    */
  /* ================================================================ */
  if (draft.status === "COMPLETE") {
    // Group picks by user
    const picksByUser = new Map<string, DraftPickEntry[]>();
    for (const pick of draft.picks) {
      const existing = picksByUser.get(pick.userId) ?? [];
      existing.push(pick);
      picksByUser.set(pick.userId, existing);
    }

    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="text-sm text-green-600 hover:text-green-700 hover:underline"
        >
          &larr; Tournament Details
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {draft.tournament.name} - Draft Complete
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          All picks have been made. Good luck!
        </p>

        <div className="mt-4 flex gap-3">
          <Link
            href={`/tournaments/${tournamentId}/leaderboard`}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            View Leaderboard
          </Link>
        </div>

        {/* Final picks table */}
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Player
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Pick 1 (Round 1)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Pick 2 (Round 2)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {draft.draftOrder.map((user) => {
                const userPicks = picksByUser.get(user.userId) ?? [];
                const r1Pick = userPicks.find((p) => p.round === 1);
                const r2Pick = userPicks.find((p) => p.round === 2);

                return (
                  <tr
                    key={user.userId}
                    className={cn(
                      user.userId === currentUserId && "bg-green-50"
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {user.userName}
                      {user.userId === currentUserId && (
                        <span className="ml-2 text-xs text-green-600">(You)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {r1Pick
                        ? r1Pick.tournamentGolfer.golfer.name
                        : "---"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {r2Pick
                        ? r2Pick.tournamentGolfer.golfer.name
                        : "---"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Full pick history */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Pick History
          </h2>
          <div className="mt-3 space-y-2">
            {draft.picks.map((pick) => (
              <div
                key={pick.id}
                className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                  {pick.overallPickNumber}
                </span>
                <span className="text-sm text-gray-500">
                  Rd {pick.round}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {pick.user.name}
                </span>
                <span className="text-sm text-gray-400">&rarr;</span>
                <span className="text-sm text-gray-700">
                  {pick.tournamentGolfer.golfer.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /* IN_PROGRESS STATE                                                 */
  /* ================================================================ */
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/tournaments/${tournamentId}`}
            className="text-sm text-green-600 hover:text-green-700 hover:underline"
          >
            &larr; Tournament Details
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
            {draft.tournament.name} - Draft Room
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Live
          </span>
          <span className="text-sm text-gray-500">
            Round {draft.currentRound} of 2
          </span>
        </div>
      </div>

      {/* On the clock banner */}
      <div
        className={cn(
          "mt-4 rounded-lg p-4",
          isMyTurn
            ? "border-2 border-green-500 bg-green-50"
            : "border border-gray-200 bg-white"
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              On the Clock
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {isMyTurn
                ? "Your turn to pick!"
                : currentPickUser
                  ? `Waiting for ${currentPickUser.userName} to pick...`
                  : "---"}
            </p>
            {draft.currentPick && (
              <p className="text-xs text-gray-500">
                Overall pick #{draft.currentPick.overallPick} (Round{" "}
                {draft.currentPick.round})
              </p>
            )}
          </div>
          {timerSeconds !== null && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Time remaining</p>
              <p
                className={cn(
                  "text-2xl font-mono font-bold",
                  timerSeconds <= 30 ? "text-red-600" : "text-gray-900"
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
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left sidebar: Draft Order */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
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
                const isCurrent = draft.currentPick?.overallPick === seq.overallPick;

                // Detect round boundary
                const showRoundHeader =
                  index === 0 ||
                  draft.pickSequence[index - 1].round !== seq.round;

                return (
                  <div key={`${seq.round}-${seq.overallPick}`}>
                    {showRoundHeader && (
                      <div className="border-b border-gray-100 bg-gray-50 px-4 py-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Round {seq.round}
                          {seq.round === 2 && " (Snake)"}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-2 border-b border-gray-50 px-4 py-2",
                        isCurrent && "bg-yellow-50 border-yellow-200",
                        isCurrent &&
                          seq.userId === currentUserId &&
                          "bg-green-50 border-green-200",
                        picked && "opacity-60"
                      )}
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
                        {seq.overallPick}
                      </span>
                      <span
                        className={cn(
                          "text-sm truncate",
                          isCurrent ? "font-bold text-gray-900" : "text-gray-700",
                          seq.userId === currentUserId && "text-green-700"
                        )}
                      >
                        {user?.userName ?? "Unknown"}
                      </span>
                      {picked && (
                        <span className="ml-auto truncate text-xs text-gray-400">
                          {picked.tournamentGolfer.golfer.name}
                        </span>
                      )}
                      {isCurrent && !picked && (
                        <span className="ml-auto">
                          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Available Golfers */}
        <div className="lg:col-span-5">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Available Golfers ({availableGolfers.length})
              </h2>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Search golfers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {filteredGolfers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {searchQuery
                    ? "No golfers match your search."
                    : "No golfers available."}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredGolfers.map((golfer) => (
                    <div
                      key={golfer.id}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {golfer.golfer.name}
                      </span>
                      <button
                        onClick={() => handlePick(golfer.id)}
                        disabled={!isMyTurn || pickingId !== null}
                        className={cn(
                          "rounded-md px-3 py-1 text-xs font-semibold transition",
                          isMyTurn
                            ? "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        {pickingId === golfer.id ? "Picking..." : "Pick"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pick History */}
        <div className="lg:col-span-4">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Pick History ({draft.picks.length})
              </h2>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {draft.picks.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No picks yet. The draft is just getting started!
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {[...draft.picks]
                    .sort(
                      (a, b) => b.overallPickNumber - a.overallPickNumber
                    )
                    .map((pick) => (
                      <div
                        key={pick.id}
                        className={cn(
                          "px-4 py-2.5",
                          pick.userId === currentUserId && "bg-green-50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
                            {pick.overallPickNumber}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {pick.user.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            Rd {pick.round}
                          </span>
                        </div>
                        <p className="mt-0.5 pl-7 text-sm text-gray-600">
                          {pick.tournamentGolfer.golfer.name}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
