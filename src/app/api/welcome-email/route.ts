import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Welcome email (Phase 9: "email a welcome message when their email address
 * is successfully verified").
 *
 * Trigger: called fire-and-forget from the client right after the signup OTP
 * verify succeeds (or the email-link callback confirms the account). The
 * route re-checks everything server-side:
 *
 *   1. caller holds a valid session (httpOnly cookies);
 *   2. claim_welcome_email() is an ATOMIC, one-time claim keyed on user_id
 *      — it refuses unconfirmed accounts and returns false when a welcome
 *      email was already sent, so the route can never double-send even if
 *      the client fires it from both the OTP and the link paths at once;
 *   3. the recipient is ALWAYS the session holder's own confirmed address —
 *      this endpoint cannot be used to mail anyone else.
 *
 * Delivery is best-effort via Resend (RESEND_API_KEY). On failure the claim
 * is released so a later page load can retry.
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
    return NextResponse.json({ error: "email_not_configured" }, { status: 503 });
  }

  // Only brand-new accounts (verified within the last 24h) get a welcome;
  // long-existing accounts clicking an email link must not suddenly receive
  // a "welcome" email months after joining.
  const accountCreatedMs = Date.parse(user.created_at ?? "");
  if (!Number.isNaN(accountCreatedMs) && Date.now() - accountCreatedMs > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ sent: false, reason: "not_new" });
  }

  // Atomic one-time claim (also refuses unconfirmed accounts).
  const { data: claimed, error: claimError } = await supabase.rpc("claim_welcome_email");
  if (claimError || !claimed) {
    // Already sent (or not eligible): success-shaped so the client never
    // retries in a loop.
    return NextResponse.json({ sent: false, reason: "already_sent_or_ineligible" });
  }

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const greeting = firstName ? `Hi ${firstName},` : "Welcome aboard!";

  const html = `<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#00174a;padding:0;"><img src="https://www.universeicos.app/email-banner.png" alt="UniVerse ICOS - Connecting The Smartest Hustlers" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;"></td></tr>
<tr><td style="padding:28px 28px 8px;color:#0f172a;font-size:15px;line-height:1.6;">
<h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Welcome to UniVerse, ${
    firstName ?? "student"
  }!</h2>
<p style="margin:0 0 12px;">${greeting} Your email is verified and your campus account is officially active. You now have the smartest campus toolkit on the continent in your pocket:</p>
<ul style="margin:0 0 12px;padding-left:20px;color:#334155;">
<li><strong>Orbit</strong> — your campus feed for news, finds and everything happening around you.</li>
<li><strong>Whisper</strong> — anonymous confessions and real talk from your school.</li>
<li><strong>Study</strong> — share and discover course materials with coursemates.</li>
<li><strong>Campus Chat</strong> — connect with verified students across your campus.</li>
</ul>
<p style="margin:0 0 12px;">One more thing: we build UniVerse for you, so we want your honest first impressions. The feedback survey takes under a minute and it genuinely steers what we ship next.</p>
<p style="margin:0 0 20px;"><a href="https://www.universeicos.app/settings" style="background:#10b981;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Share your feedback</a></p>
<p style="margin:0 0 12px;color:#64748b;font-size:13px;">See you on campus,<br>The UniVerse Team</p></td></tr>
<tr><td style="padding:16px 28px 24px;color:#94a3b8;font-size:12px;line-height:1.5;border-top:1px solid #e2e8f0;">UniVerse ICOS &middot; Connecting The Smartest Hustlers<br>You received this email because you verified a UniVerse account.</td></tr>
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
        to: [user.email],
        subject: "Welcome to UniVerse — your campus awaits",
        html,
      }),
    });

    if (!response.ok) {
      // Release the claim so a future attempt can retry.
      await supabase.rpc("release_welcome_email");
      return NextResponse.json({ error: "send_failed" }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch {
    await supabase.rpc("release_welcome_email");
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
}
