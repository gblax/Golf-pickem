"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  PageHeader,
  Spinner,
} from "@/components/ui";

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
      <div className="flex items-center justify-center py-24 text-emerald-600">
        <Spinner size="lg" />
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Create Tournament"
        backHref="/admin"
        backLabel="Admin dashboard"
      />

      {/* Tournament form */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Tournament Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div>
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Masters"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="buyIn">Buy-in Amount ($)</Label>
              <Input
                id="buyIn"
                type="number"
                min="0"
                step="0.01"
                required
                value={buyIn}
                onChange={(e) => setBuyIn(e.target.value)}
                placeholder="50"
              />
            </div>

            <div>
              <Label htmlFor="externalId">
                ESPN Event ID{" "}
                <span className="font-normal text-stone-400">(optional)</span>
              </Label>
              <Input
                id="externalId"
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="e.g. 401580344"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" loading={submitting}>
                {submitting ? "Creating..." : "Create Tournament"}
              </Button>
              <Link href="/admin">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ESPN Import helper */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Import from ESPN
          </h2>
          <p className="mt-1 mb-4 text-sm text-stone-500">
            Fetch upcoming PGA Tour events to auto-fill tournament details.
          </p>

          <Button
            type="button"
            variant="secondary"
            onClick={handleImportFromESPN}
            loading={loadingEspn}
          >
            {loadingEspn ? "Loading..." : "Browse ESPN Events"}
          </Button>

          {espnError && (
            <Alert variant="error" className="mt-3">
              {espnError}
            </Alert>
          )}

          {espnEvents.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
              {espnEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => selectESPNEvent(event)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-cream-50"
                >
                  <span className="font-medium text-stone-900">
                    {event.name}
                  </span>
                  <span className="text-stone-500">
                    {event.startDate.split("T")[0]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
