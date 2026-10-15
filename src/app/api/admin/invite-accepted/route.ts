import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Post-acceptance confirmation email (sent to the caller's OWN verified
 * address — the same self-email-only security property as
 * notify-password-change: this endpoint can never send mail to anyone but
 * the authenticated caller).
 *
 * The client calls this only AFTER admin_accept_super_admin_invitation
 * succeeded, so a 403 from acceptance means no email is ever sent.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "notification_not_configured" }, { status: 503 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.universeicos.app";
  const email = user.email;

  const html = `<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#00174a;padding:0;"><img src="https://www.universeicos.app/email-banner.png" alt="UniVerse ICOS - Connecting The Smartest Hustlers" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;"></td></tr>
<tr><td style="padding:28px 28px 8px;color:#0f172a;font-size:15px;line-height:1.6;">
<h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">You are now a UniVerse Super Admin</h2>
<p style="margin:0 0 12px;">You accepted the Super Admin invitation for <strong>${email}</strong>. Your account now holds Super Admin access to the UniVerse ICOS admin console.</p>
<p style="margin:0 0 12px;"><a href="${origin}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Open UniVerse</a></p>
<p style="margin:0 0 12px;color:#64748b;font-size:13px;">Getting started:</p>
<ul style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.7;">
<li>Sign in at ${origin} with this email address.</li>
<li>Open <strong>Admin → Overview</strong> in the sidebar (the admin area at /admin).</li>
<li>Review the admin sections: Users, Content moderation, Reports, Schools, Announcements, and Admin Access (for managing other Super Admin invitations).</li>
<li>If you ever lose access to this account, use the standard password recovery on the sign-in page — admins never receive passwords by email.</li>
</ul>
</td></tr>
<tr><td style="padding:16px 28px 24px;color:#94a3b8;font-size:12px;line-height:1.5;border-top:1px solid #e2e8f0;">UniVerse ICOS &middot; Connecting The Smartest Hustlers<br>You received this email because you accepted a Super Admin invitation.</td></tr>
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
        subject: "Your UniVerse Super Admin access is active",
        html,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "send_failed" }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
}
