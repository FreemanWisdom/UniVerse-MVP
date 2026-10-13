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
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
      <p style="font-size:18px;font-weight:bold;letter-spacing:0.05em;color:#22c55e;margin:0 0 16px;">
        UNIVERSE ICOS
      </p>
      <h1 style="font-size:20px;margin:0 0 12px;color:#f1f5f9;">Your password was changed</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
        The password for your UniVerse account (${email}) was just changed.
      </p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
        If this was you, no further action is needed. If you did NOT change your
        password, reset it again from the sign-in page and reach out to us so we
        can secure your account.
      </p>
      <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;">
        You received this email because a password change was completed on your
        UniVerse account. &copy; ${year} Universe ICOS
      </p>
    </div>
  </body>
</html>`;

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
