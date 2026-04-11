"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, ConfirmDialog } from "@/components/ui";

export default function UserRowActions({
  userId,
  isAdmin,
  isSelf,
  entryCount,
}: {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
  entryCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function toggleAdmin() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !isAdmin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update admin status");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete user");
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleAdmin}
            disabled={busy || isSelf}
            title={isSelf ? "You cannot change your own admin status" : undefined}
          >
            {isAdmin ? "Remove Admin" : "Make Admin"}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={busy || isSelf || entryCount > 0}
            title={
              isSelf
                ? "You cannot delete yourself"
                : entryCount > 0
                  ? "Cannot delete user with tournament entries"
                  : undefined
            }
          >
            Delete
          </Button>
        </div>
        {error && (
          <Alert variant="error" className="mt-1 text-xs">
            {error}
          </Alert>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete user?"
        description="This cannot be undone. Users with tournament entries cannot be deleted."
        confirmLabel="Delete"
        variant="danger"
        loading={busy}
        onConfirm={deleteUser}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
