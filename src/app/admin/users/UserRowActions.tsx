"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  ConfirmDialog,
  Input,
  Label,
  Modal,
} from "@/components/ui";

export default function UserRowActions({
  userId,
  userName,
  isAdmin,
  isSelf,
  entryCount,
}: {
  userId: string;
  userName: string;
  isAdmin: boolean;
  isSelf: boolean;
  entryCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

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

  function openResetDialog() {
    setNewPassword("");
    setResetError(null);
    setResetSuccess(false);
    setResetOpen(true);
  }

  function closeResetDialog() {
    if (busy) return;
    setResetOpen(false);
  }

  async function submitReset() {
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    setResetError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResetError(data.error || "Failed to reset password");
        return;
      }
      setResetSuccess(true);
      setNewPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap justify-end gap-2">
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
            variant="ghost"
            size="sm"
            onClick={openResetDialog}
            disabled={busy}
          >
            Reset Password
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

      <Modal
        open={resetOpen}
        onClose={closeResetDialog}
        title="Reset password"
        description={`Set a new password for ${userName}.`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={closeResetDialog}
              disabled={busy}
            >
              {resetSuccess ? "Close" : "Cancel"}
            </Button>
            {!resetSuccess && (
              <Button
                variant="primary"
                size="sm"
                onClick={submitReset}
                loading={busy}
              >
                Reset
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3">
          {resetError && <Alert variant="error">{resetError}</Alert>}
          {resetSuccess && (
            <Alert variant="success">
              Password updated. Share the new password with {userName}{" "}
              securely.
            </Alert>
          )}
          {!resetSuccess && (
            <div>
              <Label htmlFor={`new-password-${userId}`}>New password</Label>
              <Input
                id={`new-password-${userId}`}
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
