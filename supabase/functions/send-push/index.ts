import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@universeicos.app";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});

  const payload = await req.json().catch(() => ({}));
  const record = payload?.record || payload?.data?.record || payload?.new || payload;
  const userId = record?.user_id;
  if (!userId) return Response.json({ok:true,skipped:"no user_id"});

  const res = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=id,endpoint,p256dh,auth,subscription`, {
    headers: {apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`}
  });
  if (!res.ok) throw new Error(`Could not load subscriptions: ${res.status}`);
  const subscriptions = await res.json();

  const notification = {
    title: record?.title || "UniVerse ICOS",
    body: record?.body || "You have a new campus update.",
    icon: record?.icon || "https://universeicos.app/favicon.ico",
    badge: record?.badge || "https://universeicos.app/favicon.ico",
    link: record?.link || "/",
    notificationId: record?.id || "",
    tag: `universeicos-${record?.id || crypto.randomUUID()}`
  };

  const staleIds: string[] = [];
  const results = await Promise.allSettled(subscriptions.map(async (row: any) => {
    const subscription = row.subscription || {
      endpoint: row.endpoint,
      keys: {p256dh: row.p256dh, auth: row.auth}
    };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(notification), {TTL: 60 * 60 * 24});
      return {id: row.id, sent:true};
    } catch (error: any) {
      const status = Number(error?.statusCode || 0);
      if (status === 403 || status === 404 || status === 410) staleIds.push(row.id);
      console.error("Push delivery failed", row.id, status, error?.message || error);
      return {id: row.id, sent:false, status};
    }
  }));

  for (const id of staleIds) {
    await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
      method:"DELETE",
      headers:{apikey:serviceRoleKey, Authorization:`Bearer ${serviceRoleKey}`}
    });
  }

  return Response.json({ok:true,attempted:subscriptions.length,staleRemoved:staleIds.length,results});
});
