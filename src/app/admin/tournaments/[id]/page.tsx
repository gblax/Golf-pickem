"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
  PageHeader,
  Section,
  Select,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { formatDate, formatScore } from "@/lib/utils";

type Tournament = {
  id: string;
  name: string;
  externalId: string | null;
  startDate: string;
  endDate: string;
  buyIn: number;
  status: string;
  cutLine: number | null;
  pickTimeLimit: number;
  _count: { entries: number; golfers: number };
  draft: { id: string; status: string; mode: string } | null;
};

type TournamentGolfer = {
  id: string;
  scoreToPar: number | null;
  madeTheCut: boolean | null;
  position: string | null;
  isWithdrawn: boolean;
  golfer: { id: string; name: string };
};

type EntryRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
};

type AvailableUser = {
  id: string;
  name: string;
  email: string;
};

const STATUS_FLOW = ["UPCOMING", "DRAFT_OPEN", "IN_PROGRESS", "COMPLETE"];

export default function ManageTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [field, setField] = useState<TournamentGolfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newGolferName, setNewGolferName] = useState("");
  const [draftMode, setDraftMode] = useState("LIVE");
  const [espnEvents, setEspnEvents] = useState<
    { id: string; name: string; startDate: string; endDate: string }[]
  >([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [resetDraftOpen, setResetDraftOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [resettingDraft, setResettingDraft] = useState(false);
  const [removeEntry, setRemoveEntry] = useState<EntryRow | null>(null);
  const [removingEntry, setRemovingEntry] = useState(false);
  const [buyInInput, setBuyInInput] = useState("");
  const [savingBuyIn, setSavingBuyIn] = useState(false);
  const [pickTimeInput, setPickTimeInput] = useState("");
  const [savingPickTime, setSavingPickTime] = useState(false);

  const id = params.id as string;

  const fetchTournament = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTournament(data);
      setBuyInInput((data.buyIn / 100).toString());
      setPickTimeInput(String(data.pickTimeLimit ?? 120));
    }
  }, [id]);

  const fetchField = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}/field`);
    if (res.ok) {
      const data = await res.json();
      setField(data);
    }
  }, [id]);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/admin/tournaments/${id}/entries`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setAvailableUsers(data.availableUsers);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchTournament(), fetchField(), fetchEntries()]).then(() =>
      setLoading(false)
    );
  }, [fetchTournament, fetchField, fetchEntries]);

  if (!session?.user?.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-stone-900">
          Access denied
        </h1>
      </div>
    );
  }

  async function updateStatus(newStatus: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setMessage(`Status updated to ${newStatus}`);
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update status");
    }
  }

  async function addGolfer() {
    if (!newGolferName.trim()) return;
    setError("");
    const res = await fetch(`/api/tournaments/${id}/field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ golfers: [{ name: newGolferName.trim() }] }),
    });
    if (res.ok) {
      setNewGolferName("");
      setMessage("Golfer added");
      fetchField();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add golfer");
    }
  }

  async function importFromEspn() {
    if (!tournament?.externalId) return;
    setError("");
    setMessage("Importing field from ESPN...");
    try {
      const fieldRes = await fetch(`/api/espn/field/${tournament.externalId}`);
      if (!fieldRes.ok) throw new Error("Failed to fetch ESPN field");
      const espnField = await fieldRes.json();

      const golfers = espnField.map((g: { name: string; id: string }) => ({
        name: g.name,
        externalId: g.id,
      }));

      if (golfers.length === 0) {
        setMessage("");
        setError(
          "The field for this tournament isn't available on ESPN yet. Try again closer to the event."
        );
        return;
      }

      const importRes = await fetch(`/api/tournaments/${id}/field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golfers, replace: true }),
      });

      if (importRes.ok) {
        const data = await importRes.json();
        setMessage(`Imported ${data.imported} golfers from ESPN`);
        fetchField();
      } else {
        const data = await importRes.json();
        throw new Error(data.error || "Failed to import field");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import from ESPN"
      );
    }
  }

  async function fetchEspnEvents() {
    try {
      const res = await fetch("/api/espn/tournaments");
      if (res.ok) {
        const data = await res.json();
        setEspnEvents(data);
      }
    } catch {
      setError("Failed to fetch ESPN events");
    }
  }

  async function createDraft() {
    setError("");
    const res = await fetch(`/api/drafts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: draftMode }),
    });
    if (res.ok) {
      setMessage("Draft created");
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create draft");
    }
  }

  async function randomizeOrder() {
    setError("");
    const res = await fetch(`/api/drafts/${id}/order`, { method: "POST" });
    if (res.ok) {
      setMessage("Draft order randomized");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to randomize order");
    }
  }

  async function startDraft() {
    setError("");
    const res = await fetch(`/api/drafts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    if (res.ok) {
      setMessage("Draft started!");
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to start draft");
    }
  }

  async function resetDraft() {
    setResettingDraft(true);
    setError("");
    const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Draft reset. Create a new one to start over.");
      fetchTournament();
      fetchEntries();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to reset draft");
    }
    setResettingDraft(false);
    setResetDraftOpen(false);
  }

  async function fetchScores() {
    setError("");
    setMessage("Fetching scores from ESPN...");
    const res = await fetch(`/api/tournaments/${id}/scores`, { method: "POST" });
    if (res.ok) {
      setMessage("Scores updated from ESPN");
      fetchField();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to fetch scores");
    }
  }

  async function optInUser() {
    if (!selectedUserId) return;
    setError("");
    const res = await fetch(`/api/admin/tournaments/${id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    });
    if (res.ok) {
      setMessage("User opted in");
      setSelectedUserId("");
      fetchEntries();
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to opt in user");
    }
  }

  async function confirmRemoveEntry() {
    if (!removeEntry) return;
    setRemovingEntry(true);
    setError("");
    const res = await fetch(
      `/api/admin/tournaments/${id}/entries?userId=${encodeURIComponent(
        removeEntry.userId
      )}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMessage(`${removeEntry.userName} opted out`);
      setRemoveEntry(null);
      fetchEntries();
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to remove entry");
    }
    setRemovingEntry(false);
  }

  async function saveBuyIn() {
    const dollars = parseFloat(buyInInput);
    if (!Number.isFinite(dollars) || dollars < 0) {
      setError("Buy-in must be a non-negative number");
      return;
    }
    const cents = Math.round(dollars * 100);
    if (tournament && cents === tournament.buyIn) return;
    setSavingBuyIn(true);
    setError("");
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyIn: cents }),
    });
    if (res.ok) {
      setMessage("Buy-in updated");
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update buy-in");
    }
    setSavingBuyIn(false);
  }

  async function savePickTime() {
    const seconds = parseInt(pickTimeInput, 10);
    if (!Number.isFinite(seconds) || seconds < 10 || seconds > 86400) {
      setError("Pick time must be between 10 and 86400 seconds");
      return;
    }
    if (tournament && seconds === tournament.pickTimeLimit) return;
    setSavingPickTime(true);
    setError("");
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickTimeLimit: seconds }),
    });
    if (res.ok) {
      setMessage("Pick time updated");
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update pick time");
    }
    setSavingPickTime(false);
  }

  async function deleteTournament() {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete tournament");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function finalize() {
    setFinalizing(true);
    setError("");
    const res = await fetch(`/api/tournaments/${id}/finalize`, {
      method: "POST",
    });
    if (res.ok) {
      setMessage("Tournament finalized!");
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to finalize");
    }
    setFinalizing(false);
    setFinalizeOpen(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-emerald-600">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-stone-900">
          Tournament not found
        </h1>
      </div>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(tournament.status);
  const isUpcoming = tournament.status === "UPCOMING";
  const isDraftOpen = tournament.status === "DRAFT_OPEN";
  const isInProgress = tournament.status === "IN_PROGRESS";
  const isComplete = tournament.status === "COMPLETE";
  const canRemoveEntries =
    (isUpcoming || isDraftOpen) &&
    (!tournament.draft || tournament.draft.status === "PENDING");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow={<StatusBadge status={tournament.status} />}
        title={tournament.name}
        subtitle={`${formatDate(tournament.startDate)} – ${formatDate(
          tournament.endDate
        )}`}
        backHref="/admin"
        backLabel="Admin dashboard"
        actions={
          <>
            <Link href={`/tournaments/${id}`}>
              <Button variant="secondary" size="sm">
                View Page
              </Button>
            </Link>
            {(isInProgress || isComplete) && (
              <Link href={`/tournaments/${id}/leaderboard`}>
                <Button variant="secondary" size="sm">
                  Leaderboard
                </Button>
              </Link>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {message && (
          <Alert variant="success" onDismiss={() => setMessage("")}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert variant="error" onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        <Section title="Status">
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((status, i) => (
              <Button
                key={status}
                size="sm"
                variant={
                  i === currentIdx
                    ? "primary"
                    : i < currentIdx
                      ? "ghost"
                      : "secondary"
                }
                onClick={() => updateStatus(status)}
                disabled={i === currentIdx}
              >
                {status.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Settings">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 sm:max-w-xs">
                <Label htmlFor="buy-in">Buy-in ($)</Label>
                <Input
                  id="buy-in"
                  type="number"
                  min="0"
                  step="0.01"
                  value={buyInInput}
                  onChange={(e) => setBuyInInput(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={saveBuyIn}
                loading={savingBuyIn}
                disabled={
                  savingBuyIn ||
                  Math.round(parseFloat(buyInInput || "0") * 100) ===
                    tournament.buyIn
                }
              >
                {savingBuyIn ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="-mt-2 text-xs text-stone-500">
              Changing the buy-in recalculates the total pool and payouts
              shown across the app.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 sm:max-w-xs">
                <Label htmlFor="pick-time">Draft pick time (seconds)</Label>
                <Input
                  id="pick-time"
                  type="number"
                  min="10"
                  max="86400"
                  step="1"
                  value={pickTimeInput}
                  onChange={(e) => setPickTimeInput(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={savePickTime}
                loading={savingPickTime}
                disabled={
                  savingPickTime ||
                  parseInt(pickTimeInput || "0", 10) ===
                    tournament.pickTimeLimit
                }
              >
                {savingPickTime ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="-mt-2 text-xs text-stone-500">
              How long each player has to pick when on the clock. Defaults to
              120 (2 min) for live drafts; try 14400 (4 hr) for async.
              {tournament.draft &&
                tournament.draft.status === "IN_PROGRESS" &&
                " Applies to the next picker — the current deadline is unchanged."}
            </p>
          </div>
        </Section>

        <Section
          title="Entries"
          description={`${entries.length} ${entries.length === 1 ? "player" : "players"}`}
          defaultOpen={!isComplete}
        >
          {(isUpcoming || isDraftOpen) && (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="opt-in-user">Opt in an existing user</Label>
                <Select
                  id="opt-in-user"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Select a user…</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                onClick={optInUser}
                disabled={!selectedUserId}
                variant="primary"
              >
                Opt In
              </Button>
            </div>
          )}

          {entries.length === 0 ? (
            <p className="text-sm text-stone-500">No entries yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">
                      {e.userName}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {e.userEmail}
                    </p>
                  </div>
                  {canRemoveEntries && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoveEntry(e)}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {!isComplete && (
          <Section
            title="Field"
            description={`${field.length} golfers`}
            defaultOpen={!isInProgress}
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {tournament.externalId ? (
                <Button size="sm" variant="secondary" onClick={importFromEspn}>
                  Import Field from ESPN
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={fetchEspnEvents}>
                  Browse ESPN Events
                </Button>
              )}
            </div>

            {espnEvents.length > 0 && (
              <Card className="mb-4 max-h-48 overflow-y-auto">
                <div className="divide-y divide-stone-100">
                  {espnEvents.map((evt) => (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/tournaments/${id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ externalId: evt.id }),
                        });
                        setEspnEvents([]);
                        fetchTournament();
                        setMessage(`Linked to ESPN event: ${evt.name}`);
                      }}
                      className="block w-full cursor-pointer px-4 py-2 text-left text-sm hover:bg-cream-50"
                    >
                      <span className="font-medium text-stone-900">
                        {evt.name}
                      </span>
                      <span className="ml-2 text-stone-500">
                        {new Date(evt.startDate).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <div className="mb-4 flex gap-2">
              <Input
                type="text"
                value={newGolferName}
                onChange={(e) => setNewGolferName(e.target.value)}
                placeholder="Add golfer name…"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addGolfer()}
              />
              <Button onClick={addGolfer} variant="primary">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {field.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-100">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-cream-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      <th className="px-3 py-2">Golfer</th>
                      <th className="px-3 py-2 text-center">Score</th>
                      <th className="px-3 py-2 text-center">Position</th>
                      <th className="px-3 py-2 text-center">Cut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {field.map((tg) => (
                      <tr key={tg.id}>
                        <td className="px-3 py-1.5 text-stone-900">
                          {tg.golfer.name}
                          {tg.isWithdrawn && (
                            <span className="ml-2 text-xs text-rose-500">
                              WD
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center tabular-nums">
                          {formatScore(tg.scoreToPar)}
                        </td>
                        <td className="px-3 py-1.5 text-center text-stone-600">
                          {tg.position || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-center text-stone-600">
                          {tg.madeTheCut === null
                            ? "—"
                            : tg.madeTheCut
                              ? "Made"
                              : "MC"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {(isDraftOpen || isInProgress || isComplete) && (
          <Section
            title="Draft"
            description={`${tournament._count.entries} players entered`}
            defaultOpen={isDraftOpen}
          >
            {!tournament.draft ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="draft-mode">Mode</Label>
                  <Select
                    id="draft-mode"
                    value={draftMode}
                    onChange={(e) => setDraftMode(e.target.value)}
                  >
                    <option value="LIVE">Live (everyone online)</option>
                    <option value="ASYNC">Async (pick when ready)</option>
                  </Select>
                </div>
                <Button onClick={createDraft} variant="primary">
                  Create Draft
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stone-600">
                  Status:{" "}
                  <StatusBadge status={tournament.draft.status} />{" "}
                  <span className="ml-1 text-stone-400">
                    · {tournament.draft.mode} mode
                  </span>
                </p>
                {tournament.draft.status === "PENDING" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={randomizeOrder}
                    >
                      Randomize Order
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={startDraft}
                    >
                      Start Draft
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/tournaments/${id}/draft`}>
                    <Button size="sm" variant="secondary">
                      Open Draft Room
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setResetDraftOpen(true)}
                  >
                    Reset Draft
                  </Button>
                </div>
                {tournament.draft.status !== "PENDING" && (
                  <p className="text-xs text-stone-500">
                    Need to restart? Reset the draft to clear all picks and
                    start over from a clean slate.
                  </p>
                )}
              </div>
            )}
          </Section>
        )}

        {(isUpcoming || isDraftOpen || isInProgress) && (
          <Section title="Scores & Odds">
            <div className="flex flex-wrap gap-2">
              {tournament.externalId && (
                <Button variant="primary" onClick={fetchScores}>
                  Fetch Scores & Odds from ESPN
                </Button>
              )}
              {isInProgress && (
                <Link href={`/tournaments/${id}/leaderboard`}>
                  <Button variant="secondary">View Leaderboard</Button>
                </Link>
              )}
            </div>
            {(isUpcoming || isDraftOpen) && (
              <p className="mt-2 text-xs text-stone-500">
                Before the tournament starts, this pulls outright winner odds
                from ESPN so drafters can see pre-tournament favorites.
              </p>
            )}
          </Section>
        )}

        {isInProgress && (
          <Section title="Finalize Tournament">
            <p className="mb-3 text-sm text-stone-600">
              This calculates final standings and payouts based on current
              scores. It cannot be undone.
            </p>
            <Button variant="danger" onClick={() => setFinalizeOpen(true)}>
              Finalize Tournament
            </Button>
          </Section>
        )}

        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-display text-lg font-semibold text-rose-700">
            Danger Zone
          </h2>
          <p className="mt-1 text-sm text-rose-700">
            Deleting this tournament permanently removes all entries, picks, and
            draft data. This cannot be undone.
          </p>
          <div className="mt-3">
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete Tournament
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete tournament?"
        description={
          <>
            Delete <strong>{tournament.name}</strong>? This will permanently
            remove all entries, picks, and draft data. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={deleteTournament}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        open={finalizeOpen}
        title="Finalize tournament?"
        description="This will calculate final standings and payouts based on current scores. This cannot be undone."
        confirmLabel="Finalize"
        variant="danger"
        loading={finalizing}
        onConfirm={finalize}
        onCancel={() => setFinalizeOpen(false)}
      />

      <ConfirmDialog
        open={resetDraftOpen}
        title="Reset draft?"
        description={
          <>
            Reset the draft for <strong>{tournament.name}</strong>? This
            permanently deletes every pick made so far and returns the
            tournament to a pre-draft state. You can create a new draft
            afterwards. This cannot be undone.
          </>
        }
        confirmLabel="Reset Draft"
        variant="danger"
        loading={resettingDraft}
        onConfirm={resetDraft}
        onCancel={() => setResetDraftOpen(false)}
      />

      <ConfirmDialog
        open={removeEntry !== null}
        title="Remove entry?"
        description={
          removeEntry ? (
            <>
              Remove <strong>{removeEntry.userName}</strong> from this
              tournament? They can be opted in again before the draft starts.
            </>
          ) : null
        }
        confirmLabel="Remove"
        variant="danger"
        loading={removingEntry}
        onConfirm={confirmRemoveEntry}
        onCancel={() => setRemoveEntry(null)}
      />
    </div>
  );
}
