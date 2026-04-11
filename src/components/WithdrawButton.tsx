"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, ConfirmDialog } from "@/components/ui";

export default function WithdrawButton({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/enter`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to withdraw");
        setOpen(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={busy}
        >
          Withdraw
        </Button>
        {error && (
          <Alert variant="error" className="mt-1 text-xs">
            {error}
          </Alert>
        )}
      </div>

      <ConfirmDialog
        open={open}
        title="Withdraw from tournament?"
        description={`You will be removed from ${tournamentName}. You can re-enter anytime before the draft starts.`}
        confirmLabel="Withdraw"
        variant="danger"
        loading={busy}
        onConfirm={withdraw}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
