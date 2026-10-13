import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Password-change notification (spec §5: "Send a password-change
 * notification to the account's registered email address").
 *
 * Supabase/GoTrue has no native "password changed" email, so this uses the
 * Resend transactional email service (RESEND_API_KEY env var). Delivery is
 * best-effort: a failure here never blocks the password reset itself.
 *
 * Security: the caller must hold a valid Supabase session (checked via the
 * httpOnly auth cookies, server-side) and the email is ALWAYS the session
 * holder's own address — this endpoint can never be used to send mail to
 * anyone but the authenticated caller, so it cannot be weaponized for
 * spam or enumeration.
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
    // Notification infrastructure not configured — the reset already
    // succeeded on the client; this is a soft failure by design.
    return NextResponse.json({ error: "notification_not_configured" }, { status: 503 });
  }

  const email = user.email;

  const html = `<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#00174a;padding:0;"><img src="https://www.universeicos.app/email-banner.png" alt="UniVerse ICOS - Connecting The Smartest Hustlers" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;"></td></tr>
<tr><td style="padding:28px 28px 8px;color:#0f172a;font-size:15px;line-height:1.6;"><h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Your password was changed</h2><p style="margin:0 0 12px;">The password for your UniVerse account (${email}) was just changed.</p><p style="margin:0 0 12px;color:#64748b;font-size:13px;">If this was you, no further action is needed. If you did NOT change your password, reset it again from the sign-in page and reach out to us so we can secure your account.</p></td></tr>
<tr><td style="padding:16px 28px 24px;color:#94a3b8;font-size:12px;line-height:1.5;border-top:1px solid #e2e8f0;">UniVerse ICOS &middot; Connecting The Smartest Hustlers<br>You received this email because of activity on your UniVerse account.</td></tr>
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
        subject: "Your UniVerse password was changed",
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
