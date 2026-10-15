"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acceptSuperAdminInvitation, invitationErrorCopy } from "@/services/admin/admin-schools-invitations.service";

/**
 * Public Super Admin invitation acceptance page. NOT part of the gated
 * /admin area: the recipient may not be signed in yet when they open the
 * emailed link. Every real authorization decision happens in the
 * admin_accept_super_admin_invitation RPC (session email must match the
 * invited address; token must be pending, unexpired, unrevoked, unused).
 */
export default function AcceptInvitationPage() {
  // SSR-safe initializer: the page is client-only, but the initializer runs
  // during prerender too, so guard window access.
  const [token] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URL(window.location.href).searchParams.get("token")
  );
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setSessionEmail(data.user.email);
    })());
  }, []);

  const accept = async () => {
    if (!token) return;
    setState("working");
    setMessage(null);
    try {
      const supabase = createClient();
      await acceptSuperAdminInvitation(supabase, token);
      setState("done");
      // Best-effort confirmation email to the caller's own address; the
      // acceptance itself already succeeded on the server.
      await fetch("/api/admin/invite-accepted", { method: "POST" }).catch(() => undefined);
    } catch (acceptError) {
      setState("error");
      setMessage(
        acceptError instanceof Error
          ? invitationErrorCopy(acceptError.message)
          : "Unable to accept this invitation."
      );
    }
  };

  if (!token) {
    return <Shell title="Invalid invitation link" body="This link is missing its invitation token. Ask an existing Super Admin to send you a new invitation." />;
  }

  if (state === "done") {
    return (
      <Shell
        title="You are now a UniVerse Super Admin"
        body="Your account holds Super Admin access. Sign in (or continue) at UniVerse and open the Admin area to get started. A confirmation email with sign-in instructions is on its way to your address."
        ctaHref="/"
        ctaLabel="Go to UniVerse"
      />
    );
  }

  if (state === "error") {
    return <Shell title="Invitation problem" body={message ?? "Unable to accept this invitation."} />;
  }

  return (
    <div className="max-w-lg mx-auto w-full">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
              Super Admin invitation
            </p>
            <h1 className="mt-1 font-display text-xl font-bold text-foreground">
              You were invited to become a UniVerse Super Admin
            </h1>
          </div>

          <p className="text-sm text-slate-400">
            Accepting grants this account Super Admin access to the UniVerse admin
            console. The invitation is single-use and bound to the email it was
            sent to.
          </p>

          {sessionEmail ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Signed in as <span className="font-semibold">{sessionEmail}</span>.
              </p>
              <p className="text-xs text-slate-400">
                You can only accept if this address is the one the invitation was sent to.
              </p>
              <Button onClick={() => void accept()} disabled={state === "working"} className="w-full">
                {state === "working" ? "Accepting…" : "Accept Super Admin invitation"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                To accept, you need to be signed in with the invited email address.
                Create an account or sign in first, then come back to this link.
              </p>
              <div className="flex gap-2">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full">Sign in</Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button className="w-full">Sign up</Button>
                </Link>
              </div>
              <p className="text-xs text-slate-400">
                Forgot your password? Use the recovery link on the sign-in page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Shell({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="max-w-lg mx-auto w-full">
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-slate-400">{body}</p>
          {ctaHref ? (
            <Link href={ctaHref}>
              <Button>{ctaLabel ?? "Continue"}</Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
