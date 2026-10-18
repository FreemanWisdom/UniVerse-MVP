import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const workerKey = Deno.env.get("PUSH_WORKER_KEY");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@universeicos.app";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

/** Payload kept minimal + identical to the SW contract. NO absolute icon
 *  URL: the service worker uses its own origin-relative defaults, which are
 *  always correct for the deployed origin. */
function buildNotification(record: any) {
  return {
    title: record?.title || "UniVerse ICOS",
    body: record?.body || "You have a new campus update.",
    link: record?.link || "/",
    notificationId: record?.id || "",
    tag: `universeicos-${record?.id || crypto.randomUUID()}`,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function writeReceipt(row: {
  notification_id: string;
  user_id: string;
  subscription_id: string | null;
  status: string;
  status_code: number;
  attempts: number;
}) {
  if (!workerKey) return; // no receipts without the worker config
  await fetch(`${supabaseUrl}/rest/v1/push_delivery_log`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify([row]),
  }).catch(() => undefined);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Server-side callers only: the DB trigger (and the retry sweep) present
  // the shared worker secret. The public anon key used to be accepted here,
  // which let ANY client push arbitrary content to ANY user.
  if (!workerKey || req.headers.get("apikey") !== workerKey) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  const record = payload?.record || payload?.data?.record || payload?.new || payload;
  const userId = record?.user_id;
  const notificationId = String(record?.id || "");
  if (!userId) return Response.json({ ok: true, skipped: "no user_id" });

  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${
      encodeURIComponent(userId)
    }&select=id,endpoint,p256dh,auth,subscription`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  );
  if (!res.ok) throw new Error(`Could not load subscriptions: ${res.status}`);
  const subscriptions = await res.json();

  const notification = buildNotification(record);
  const MAX_ATTEMPTS = 2; // bounded retry: one immediate retry for temporary failures
  const staleIds: string[] = [];

  const results = await Promise.allSettled(
    subscriptions.map(async (row: any) => {
      const subscription = row.subscription || {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };

      let status = 0;
      let message = "";
      let attempts = 0;
      for (attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
        try {
          await webpush.sendNotification(subscription, JSON.stringify(notification), {
            TTL: 60 * 60 * 24,
          });
          await writeReceipt({
            notification_id: notificationId,
            user_id: userId,
            subscription_id: row.id,
            status: "sent",
            status_code: 201,
            attempts,
          });
          return { id: row.id, sent: true, attempts };
        } catch (error: any) {
          status = Number(error?.statusCode || 0);
          message = error?.message || String(error);
          // permanent (auth/gone) or unretryable client errors: stop now
          if (status === 403 || status === 404 || status === 410 || (status >= 400 && status < 500 && status !== 429)) {
            break;
          }
          if (attempts < MAX_ATTEMPTS) await sleep(1500); // 429/5xx/network: backoff briefly
        }
      }

      const permanent = status === 403 || status === 404 || status === 410;
      if (permanent) staleIds.push(row.id);
      await writeReceipt({
        notification_id: notificationId,
        user_id: userId,
        subscription_id: row.id,
        status: permanent ? "stale_removed" : "failed_temporary",
        status_code: status,
        attempts,
      });
      console.error("Push delivery failed", row.id, status, message);
      return { id: row.id, sent: false, status, attempts };
    }),
  );

  // Best-effort cleanup of subscriptions the push service says are gone.
  for (const id of staleIds) {
    await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
  }

  const flat = results.map((r) => (r.status === "fulfilled" ? r.value : { error: true }));
  return Response.json({
    ok: true,
    attempted: subscriptions.length,
    staleRemoved: staleIds.length,
    results: flat,
  });
});
