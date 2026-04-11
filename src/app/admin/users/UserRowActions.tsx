"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  async function toggleAdmin() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !isAdmin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to update admin status");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (busy) return;
    if (
      !confirm(
        "Delete this user? This cannot be undone. Users with tournament entries cannot be deleted."
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete user");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={toggleAdmin}
        disabled={busy || isSelf}
        title={isSelf ? "You cannot change your own admin status" : undefined}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAdmin ? "Remove Admin" : "Make Admin"}
      </button>
      <button
        type="button"
        onClick={deleteUser}
        disabled={busy || isSelf || entryCount > 0}
        title={
          isSelf
            ? "You cannot delete yourself"
            : entryCount > 0
              ? "Cannot delete user with tournament entries"
              : undefined
        }
        className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
