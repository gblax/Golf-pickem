"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Tournament = {
  id: string;
  name: string;
  externalId: string | null;
  startDate: string;
  endDate: string;
  buyIn: number;
  status: string;
  cutLine: number | null;
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
  const [espnEvents, setEspnEvents] = useState<{ id: string; name: string; startDate: string; endDate: string }[]>([]);

  const id = params.id as string;

  const fetchTournament = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTournament(data);
    }
  }, [id]);

  const fetchField = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}/field`);
    if (res.ok) {
      const data = await res.json();
      setField(data);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchTournament(), fetchField()]).then(() => setLoading(false));
  }, [fetchTournament, fetchField]);

  if (!session?.user?.isAdmin) {
    return <div className="p-8 text-center">Access denied</div>;
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

      const importRes = await fetch(`/api/tournaments/${id}/field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golfers }),
      });

      if (importRes.ok) {
        const data = await importRes.json();
        setMessage(`Imported ${data.imported} golfers from ESPN`);
        fetchField();
      } else {
        throw new Error("Failed to import field");
      }
    } catch {
      setError("Failed to import from ESPN");
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

  async function finalize() {
    if (!confirm("Finalize this tournament? This will calculate final standings and payouts.")) return;
    setError("");
    const res = await fetch(`/api/tournaments/${id}/finalize`, { method: "POST" });
    if (res.ok) {
      setMessage("Tournament finalized!");
      fetchTournament();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to finalize");
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!tournament) {
    return <div className="p-8 text-center text-red-600">Tournament not found</div>;
  }

  const statusFlow = ["UPCOMING", "DRAFT_OPEN", "IN_PROGRESS", "COMPLETE"];
  const currentIdx = statusFlow.indexOf(tournament.status);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-green-600 hover:underline">&larr; Back to Admin</Link>
          <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
          <p className="text-sm text-gray-500">
            {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
          </p>
        </div>
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
          {tournament.status}
        </span>
      </div>

      {message && <div className="rounded bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* Status Management */}
      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Status Management</h2>
        <div className="flex flex-wrap gap-2">
          {statusFlow.map((status, i) => (
            <button
              key={status}
              onClick={() => updateStatus(status)}
              disabled={i === currentIdx}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                i === currentIdx
                  ? "bg-green-600 text-white"
                  : i < currentIdx
                    ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {status.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </section>

      {/* Field Management */}
      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">
          Field ({field.length} golfers)
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {tournament.externalId && (
            <button
              onClick={importFromEspn}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Import Field from ESPN
            </button>
          )}
          {!tournament.externalId && (
            <button
              onClick={fetchEspnEvents}
              className="rounded bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
            >
              Browse ESPN Events
            </button>
          )}
        </div>

        {espnEvents.length > 0 && (
          <div className="mb-4 max-h-48 overflow-y-auto rounded border p-2 space-y-1">
            {espnEvents.map((evt) => (
              <button
                key={evt.id}
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
                className="block w-full text-left rounded p-2 hover:bg-gray-100 text-sm"
              >
                {evt.name} ({new Date(evt.startDate).toLocaleDateString()})
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newGolferName}
            onChange={(e) => setNewGolferName(e.target.value)}
            placeholder="Add golfer name..."
            className="flex-1 rounded border px-3 py-1.5 text-sm"
            onKeyDown={(e) => e.key === "Enter" && addGolfer()}
          />
          <button
            onClick={addGolfer}
            className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
          >
            Add
          </button>
        </div>

        {field.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Golfer</th>
                  <th className="px-3 py-2 text-center">Score</th>
                  <th className="px-3 py-2 text-center">Position</th>
                  <th className="px-3 py-2 text-center">Cut</th>
                </tr>
              </thead>
              <tbody>
                {field.map((tg) => (
                  <tr key={tg.id} className="border-t">
                    <td className="px-3 py-1.5">{tg.golfer.name}</td>
                    <td className="px-3 py-1.5 text-center">
                      {tg.scoreToPar === null ? "-" : tg.scoreToPar === 0 ? "E" : tg.scoreToPar > 0 ? `+${tg.scoreToPar}` : tg.scoreToPar}
                    </td>
                    <td className="px-3 py-1.5 text-center">{tg.position || "-"}</td>
                    <td className="px-3 py-1.5 text-center">
                      {tg.madeTheCut === null ? "-" : tg.madeTheCut ? "Made" : "MC"}
                      {tg.isWithdrawn && " (WD)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Draft Management */}
      {["DRAFT_OPEN", "IN_PROGRESS", "COMPLETE"].includes(tournament.status) && (
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">
            Draft ({tournament._count.entries} players entered)
          </h2>
          {!tournament.draft ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Mode:</label>
                <select
                  value={draftMode}
                  onChange={(e) => setDraftMode(e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  <option value="LIVE">Live (everyone online)</option>
                  <option value="ASYNC">Async (pick when ready)</option>
                </select>
              </div>
              <button
                onClick={createDraft}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
              >
                Create Draft
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                Draft Status: <strong>{tournament.draft.status}</strong> ({tournament.draft.mode} mode)
              </p>
              {tournament.draft.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={randomizeOrder}
                    className="rounded bg-yellow-500 px-3 py-1.5 text-sm text-white hover:bg-yellow-600"
                  >
                    Randomize Order
                  </button>
                  <button
                    onClick={startDraft}
                    className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                  >
                    Start Draft
                  </button>
                </div>
              )}
              <Link
                href={`/tournaments/${id}/draft`}
                className="inline-block rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                Open Draft Room
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Score Management */}
      {tournament.status === "IN_PROGRESS" && (
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Scores</h2>
          <div className="flex flex-wrap gap-2">
            {tournament.externalId && (
              <button
                onClick={fetchScores}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                Fetch Scores from ESPN
              </button>
            )}
            <Link
              href={`/tournaments/${id}/leaderboard`}
              className="rounded bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
            >
              View Leaderboard
            </Link>
          </div>
        </section>
      )}

      {/* Finalize */}
      {tournament.status === "IN_PROGRESS" && (
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Finalize Tournament</h2>
          <p className="text-sm text-gray-600 mb-3">
            This will calculate final standings and payouts based on current scores.
          </p>
          <button
            onClick={finalize}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Finalize Tournament
          </button>
        </section>
      )}

      {/* Quick Links */}
      <div className="flex gap-3 text-sm">
        <Link href={`/tournaments/${id}`} className="text-green-600 hover:underline">
          View Tournament Page
        </Link>
        <Link href={`/tournaments/${id}/leaderboard`} className="text-green-600 hover:underline">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
