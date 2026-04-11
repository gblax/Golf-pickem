"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

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
      <Button
        type="button"
        variant="secondary"
        onClick={handleSync}
        loading={loading}
      >
        {!loading && <RefreshCw className="h-4 w-4" />}
        {loading ? "Syncing..." : "Sync PGA Schedule"}
      </Button>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
