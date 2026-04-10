"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface ESPNTournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function NewTournamentPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [buyIn, setBuyIn] = useState("50");
  const [externalId, setExternalId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [espnEvents, setEspnEvents] = useState<ESPNTournament[]>([]);
  const [loadingEspn, setLoadingEspn] = useState(false);
  const [espnError, setEspnError] = useState("");

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    router.push("/");
    return null;
  }

  async function handleImportFromESPN() {
    setLoadingEspn(true);
    setEspnError("");
    try {
      const res = await fetch("/api/espn/tournaments");
      if (!res.ok) throw new Error("Failed to fetch ESPN events");
      const data = await res.json();
      setEspnEvents(data);
    } catch (err) {
      setEspnError(
        err instanceof Error ? err.message : "Failed to load ESPN events"
      );
    } finally {
      setLoadingEspn(false);
    }
  }

  function selectESPNEvent(event: ESPNTournament) {
    setName(event.name);
    setStartDate(event.startDate.split("T")[0]);
    setEndDate(event.endDate.split("T")[0]);
    setExternalId(event.id);
    setEspnEvents([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          buyIn: Math.round(parseFloat(buyIn) * 100),
          externalId: externalId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tournament");
      }

      const tournament = await res.json();
      router.push(`/admin/tournaments/${tournament.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create tournament"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-green-600 hover:text-green-700 hover:underline"
        >
          &larr; Back to Admin
        </Link>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-gray-900">
        Create Tournament
      </h1>

      {/* ESPN Import */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Import from ESPN
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Fetch upcoming PGA Tour events to auto-fill tournament details.
        </p>
        <button
          type="button"
          onClick={handleImportFromESPN}
          disabled={loadingEspn}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loadingEspn ? "Loading..." : "Import from ESPN"}
        </button>

        {espnError && (
          <p className="mt-3 text-sm text-red-600">{espnError}</p>
        )}

        {espnEvents.length > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto rounded border border-gray-200">
            {espnEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => selectESPNEvent(event)}
                className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-sm hover:bg-green-50 last:border-b-0"
              >
                <span className="font-medium text-gray-900">{event.name}</span>
                <span className="text-gray-500">
                  {event.startDate.split("T")[0]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tournament form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-5 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Tournament Details
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Tournament Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="e.g. The Masters"
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="startDate"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="buyIn"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Buy-in Amount ($)
          </label>
          <input
            id="buyIn"
            type="number"
            min="0"
            step="0.01"
            required
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="50"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="externalId"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            ESPN Event ID{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="externalId"
            type="text"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="e.g. 401580344"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Tournament"}
          </button>
          <Link
            href="/admin"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
