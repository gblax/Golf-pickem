"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  Alert,
  Spinner,
} from "@/components/ui";

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
  const { status: sessionStatus } = useSession();
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
      <div className="flex items-center justify-center py-24 text-emerald-600">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-stone-900">
          Tournament Not Found
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          This tournament doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/tournaments"
          className="mt-4 inline-block text-sm text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          Back to Tournaments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card accent="gold">
        <CardContent className="p-6">
          <h1 className="font-display text-2xl font-semibold text-stone-900">
            Confirm Entry
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            You are about to enter the following tournament.
          </p>

          <div className="mt-6 space-y-3 rounded-lg border border-stone-200 bg-cream-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">Tournament</span>
              <span className="text-sm font-semibold text-stone-900">
                {tournament.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">Dates</span>
              <span className="text-sm text-stone-700">
                {formatDate(tournament.startDate)} &ndash;{" "}
                {formatDate(tournament.endDate)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-stone-200 pt-3">
              <span className="text-sm font-medium text-stone-700">Buy-in</span>
              <span className="font-display text-xl font-bold text-gold-600">
                {formatCurrency(tournament.buyIn)}
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="error" className="mt-4">
              {error}
            </Alert>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link href={`/tournaments/${tournamentId}`}>
              <Button variant="secondary" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleConfirmEntry}
              loading={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? "Entering..." : "Confirm Entry"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
