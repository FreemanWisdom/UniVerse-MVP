"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminInput,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
} from "@/components/admin/ui";
import {
  invitationErrorCopy,
  SuperAdminInvitation,
  listSuperAdminInvitations,
  revokeSuperAdminInvitation,
} from "@/services/admin/admin-schools-invitations.service";

const STATUS_TONES: Record<string, "info" | "success" | "warning" | "danger" | "neutral"> = {
  pending: "info",
  accepted: "success",
  expired: "warning",
  revoked: "danger",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminAccessPage() {
  const [invitations, setInvitations] = useState<SuperAdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const load = async () => {
    try {
      setInvitations(await listSuperAdminInvitations(createClient()));
    } catch (loadError) {
      setError(loadError instanceof Error ? invitationErrorCopy(loadError.message) : "Unable to load invitations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = email.trim();
    if (!target || confirmText !== target) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/invite-super-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(invitationErrorCopy(String(result.error ?? "invitation_failed")));
      } else if (result.email_sent) {
        setMessage(`Invitation created and emailed to ${target}. It expires in 7 days and is single-use.`);
        setEmail("");
        setConfirmText("");
        await load();
      } else {
        setError(String(result.warning ?? "Invitation created, but email delivery failed."));
        await load();
      }
    } catch (inviteError) {
      setError(inviteError instanceof Error ? invitationErrorCopy(inviteError.message) : "The invitation failed.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (invitation: SuperAdminInvitation) => {
    if (!window.confirm(`Revoke the invitation for ${invitation.invitee_email}? The link they received will stop working.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await revokeSuperAdminInvitation(createClient(), invitation.id);
      setMessage(`Invitation for ${invitation.invitee_email} revoked.`);
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? invitationErrorCopy(revokeError.message) : "Could not revoke the invitation.");
    } finally {
      setBusy(false);
    }
  };

  const pending = invitations.filter((i) => i.effective_status === "pending");
  const settled = invitations.filter((i) => i.effective_status !== "pending");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Access"
        description="Invite and manage Super Admins. Every action is restricted to active Super Admins and is audited."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      <AdminCard>
        <AdminCardHeader
          title="Invite a Super Admin"
          description="Creates a single-use invitation link, expires in 7 days, and emails it to the address below. The recipient must be signed in with that exact email to accept."
        />
        <form className="space-y-3 p-5" onSubmit={invite}>
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="text-xs font-medium text-slate-600">
              Invitee email
            </label>
            <AdminInput
              id="invite-email"
              aria-label="Invitee email"
              type="email"
              placeholder="person@example.com"
              value={email}
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invite-confirm" className="text-xs font-medium text-slate-600">
              Confirm — type the email address again
            </label>
            <AdminInput
              id="invite-confirm"
              aria-label="Confirm invitee email"
              type="email"
              placeholder="Type the same email to confirm"
              value={confirmText}
              maxLength={254}
              onChange={(event) => setConfirmText(event.target.value)}
            />
          </div>
          <AdminButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={busy || !email.trim() || confirmText !== email.trim()}
          >
            {busy ? "Working…" : "Send invitation"}
          </AdminButton>
          <p className="text-[11px] text-slate-400">
            Super Admin invitations are limited to 3 per hour. Invitation tokens are
            never shown here — only the invitee receives the link by email.
          </p>
        </form>
      </AdminCard>

      {loading ? (
        <AdminLoadingRows rows={3} />
      ) : (
        <>
          <AdminCard>
            <AdminCardHeader
              title={`Pending (${pending.length})`}
              description="Sent, not yet accepted. Revoke to invalidate the link immediately."
            />
            <div className="space-y-3 p-5">
              {pending.length === 0 ? (
                <p className="text-sm text-slate-400">No pending invitations.</p>
              ) : (
                pending.map((invitation) => (
                  <InvitationRow key={invitation.id} invitation={invitation} busy={busy} onRevoke={() => void revoke(invitation)} />
                ))
              )}
            </div>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader
              title={`History (${settled.length})`}
              description="Accepted, expired, and revoked invitations."
            />
            <div className="space-y-3 p-5">
              {settled.length === 0 ? (
                <p className="text-sm text-slate-400">No past invitations yet.</p>
              ) : (
                settled.map((invitation) => (
                  <InvitationRow key={invitation.id} invitation={invitation} busy={busy} onRevoke={null} />
                ))
              )}
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}

function InvitationRow({
  invitation,
  busy,
  onRevoke,
}: {
  invitation: SuperAdminInvitation;
  busy: boolean;
  onRevoke: (() => void) | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{invitation.invitee_email}</p>
        <p className="text-xs text-slate-500">
          Invited by {invitation.inviter_name} · {formatDate(invitation.created_at)} · expires{" "}
          {formatDate(invitation.expires_at)}
          {invitation.accepted_at ? ` · accepted ${formatDate(invitation.accepted_at)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AdminPill tone={STATUS_TONES[invitation.effective_status] ?? "neutral"}>
          {invitation.effective_status}
        </AdminPill>
        {onRevoke ? (
          <AdminButton variant="ghost" size="sm" disabled={busy} onClick={onRevoke}>
            Revoke
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}
