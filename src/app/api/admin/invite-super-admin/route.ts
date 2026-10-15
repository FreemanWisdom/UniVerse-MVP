import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rpc } from "@/services/admin/admin.service";

/**
 * Super Admin invitation (create + email).
 *
 * Security:
 *  - Caller must hold a valid Supabase session; the RPC enforces ACTIVE
 *    SUPER ADMIN server-side (UI hiding is convenience only).
 *  - The raw invitation token exists only inside this request: the RPC
 *    returns it once, it goes into the invitee email, and it is never
 *    logged or persisted. Only the sha256 hash is stored.
 *  - Honest delivery: if Resend fails, the response says so explicitly —
 *    the invitation row still exists (the admin can revoke and re-invite).
 *  - The email contains no passwords or secrets; it links to the public
 *    accept page and the existing sign-in / recovery flows.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Server-side gate + token generation in one atomic RPC call.
  let rawToken: string;
  try {
    rawToken = await rpc<string>(supabase, "admin_create_super_admin_invitation", {
      p_email: email,
    });
  } catch (rpcError) {
    const message = rpcError instanceof Error ? rpcError.message : "invitation_failed";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        invited: true,
        email_sent: false,
        warning:
          "Invitation created, but email delivery is not configured (RESEND_API_KEY missing). Revoke this invitation and re-invite once email is configured.",
      },
      { status: 200 }
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.universeicos.app";
  const acceptLink = `${origin}/admin-access/accept?token=${rawToken}`;

  const html = `<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#00174a;padding:0;"><img src="https://www.universeicos.app/email-banner.png" alt="UniVerse ICOS - Connecting The Smartest Hustlers" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;"></td></tr>
<tr><td style="padding:28px 28px 8px;color:#0f172a;font-size:15px;line-height:1.6;">
<h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">You are invited to become a UniVerse Super Admin</h2>
<p style="margin:0 0 12px;">An existing Super Admin of UniVerse ICOS has invited <strong>${email}</strong> to hold Super Admin access to the admin console.</p>
<p style="margin:0 0 12px;"><a href="${acceptLink}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Review and accept the invitation</a></p>
<p style="margin:0 0 12px;color:#64748b;font-size:13px;">The link is single-use and expires in 7 days. To accept, you must be signed in to UniVerse with this exact email address. If you do not have an account yet, sign up first, then open this link again.</p>
<p style="margin:0 0 12px;color:#64748b;font-size:13px;">If you were not expecting this invitation, you can safely ignore this email — nothing changes until the link is used while signed in as this address.</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;color:#94a3b8;font-size:12px;line-height:1.5;border-top:1px solid #e2e8f0;">UniVerse ICOS &middot; Connecting The Smartest Hustlers<br>You received this email because a Super Admin invited this address.</td></tr>
</table></div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UniVerse ICOS <noreply@universeicos.app>",
        to: [email],
        subject: "You are invited to become a UniVerse Super Admin",
        html,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          invited: true,
          email_sent: false,
          warning:
            "Invitation created, but the email could not be delivered. Revoke this invitation and try again in a few minutes.",
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ invited: true, email_sent: true });
  } catch {
    return NextResponse.json(
      {
        invited: true,
        email_sent: false,
        warning:
          "Invitation created, but the email could not be delivered. Revoke this invitation and try again in a few minutes.",
      },
      { status: 200 }
    );
  }
}
