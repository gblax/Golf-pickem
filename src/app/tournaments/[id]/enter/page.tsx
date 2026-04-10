"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Tournament {
  id: string;
  name: string;
  buyIn: number;
  status: string;
  startDate: string;
  endDate: string;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EnterTournamentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tournamentId = params.id;

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    async function fetchTournament() {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}`);
        if (!res.ok) throw new Error("Tournament not found");
        const data = await res.json();
        setTournament(data);
      } catch {
        setError("Failed to load tournament details.");
      } finally {
        setLoading(false);
      }
    }

    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId, sessionStatus, router]);

  async function handleConfirmEntry() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/enter`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enter tournament");
      }

      router.push(`/tournaments/${tournamentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Tournament Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This tournament doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/tournaments"
          className="mt-4 inline-block text-sm text-green-600 hover:text-green-700 hover:underline"
        >
          Back to Tournaments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          Confirm Entry
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          You are about to enter the following tournament.
        </p>

        <div className="mt-6 space-y-3 rounded-md bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Tournament</span>
            <span className="text-sm font-semibold text-gray-900">
              {tournament.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Dates</span>
            <span className="text-sm text-gray-700">
              {formatDate(tournament.startDate)} &ndash;{" "}
              {formatDate(tournament.endDate)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-sm font-medium text-gray-700">Buy-in</span>
            <span className="text-lg font-bold text-green-700">
              {formatCurrency(tournament.buyIn)}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/tournaments/${tournamentId}`}
            className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            onClick={handleConfirmEntry}
            disabled={submitting}
            className="rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Entering..." : "Confirm Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
