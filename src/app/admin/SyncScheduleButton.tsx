"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncScheduleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/sync-schedule", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync schedule");
      }
      setMessage(
        `Sync complete: ${data.created} created, ${data.skipped} already existed`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Syncing..." : "Sync PGA Schedule"}
      </button>
      {message && (
        <p className="text-xs text-green-700">{message}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
