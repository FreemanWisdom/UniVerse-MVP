# UniVerse ICOS Cutover Plan — new Next.js app → universeicos.app

Status: PLAN ONLY. No cutover step is executed by this document. The switch
remains a deliberate owner-approved event. `my-new-feature` stays the working
branch; `main` + `inject-mobile-css.yml` keep serving the live legacy site
until that day.

## 1. Current state (verified Sept 29 2026)

### Legacy (live at universeicos.app)
- 18 static files on `main` (`index.html`, `dashboard.html`,
  `non-mvp-campus.html`, `mobile-app.css`, `notifications-sw.js`, …).
- GitHub workflow `inject-mobile-css.yml` re-injects the mobile CSS link and
  VAPID public key into `dashboard.html` on every push to `main` (bot commit).
- Apex `universeicos.app` 308-redirects to `www.universeicos.app` (observed).
- Legacy `manifest.json` exists but has EMPTY icons — the live site is not
  installable either. Not worth fixing; the cutover replaces it.
- Hosting provider behind the domain: NOT verifiable from the repo (no CNAME
  file, no deploy config). **Owner to confirm** where DNS currently points
  (GitHub Pages / Netlify / other) before step 3.

### New app (branch `my-new-feature`, synced to origin)
- 27 routes: auth (login/signup), landing, 9 student routes, 14 admin routes,
  /verify. PWA-installable since 5G (manifest + icons + auto-registered SW).
- Shares the SAME Supabase project as legacy — no data migration is needed at
  cutover; both stacks read/write the same tables today.
- Runtime env needed by the deployed app: just the two public vars in
  `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
  Everything privileged lives in Supabase (RPCs, RLS, edge-function secrets) —
  verified across Phases 4–5.
- Legacy notification links are already neutralized client-side: the UI maps
  `type → route` and never trusts the `link` column (DB audit: links are
  `/dashboard.html` and `#orbit-post-*` anchors). The SW also maps any `.html`
  link to `/`.

## 2. Decision points (owner)

1. **Host for the Next app — DECIDED: Vercel** (owner, Sept 29 2026).
   Import from GitHub with production branch set to `my-new-feature` — NOT
   main (main is the legacy static site). Vercel-specific setup:
   - Framework preset: Next.js (auto-detected). Root directory: repo root
     (`my-new-feature` holds the Next app at the root of the same repo).
   - Environment variables (Production + Preview):
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (values in
     `.env.local`, never committed).
   - Supabase dashboard → Auth → URL Configuration: add the Vercel domain(s)
     and `https://www.universeicos.app` to the allowed redirect URLs so the
     signup email-confirmation links resolve to the right host.
   - Free tier is enough to start; every PR gets a preview deployment for the
     dress rehearsal.
2. **Domain strategy.** Recommended: point `www` (and the apex redirect) at the
   new host only after the dress rehearsal passes. Keep the legacy host
   untouched as the rollback target until post-cutover stability is confirmed.
3. **Timing + user comms.** Pick a low-traffic window. Use the admin
   Announcements page to tell users a new app is arriving (optional but
   friendly). Existing sessions survive cutover: auth lives in Supabase.

## 3. Cutover steps (each gated by the owner)

1. Freeze: agree a window; no pushes to `main` or DB changes during it.
2. Dress rehearsal: deploy the Next app to the chosen host with a preview URL;
   run the smoke checklist (below) against it — including a REAL device:
     - login (existing account), orbit post, chat send, study upload,
       tribe post, whisper, notifications list, admin console overview
     - Settings → Enable Push Notifications → pill flips to "Enabled"
       (the one thing headless testing could not cover)
3. DNS: point the domain at the new host (owner action, ~minutes of TTL
   propagation; keep TTL low beforehand, e.g. 300s).
4. Verify live: rerun the smoke checklist on universeicos.app.
5. Announce (optional): post a campus announcement welcoming users to the new
   app.
6. Rollback plan: flip DNS back to the legacy host. Legacy keeps working —
   nothing on `main` is modified by the cutover. Cost of rollback ≈ DNS TTL.

## 4. Route mapping (legacy → new)

| Legacy URL | New route | Notes |
| --- | --- | --- |
| `/` (index.html) | `/` | landing redirects to login/orbit as appropriate |
| `/dashboard.html` | `/orbit` | the dashboard's main view is Orbit; deep links are type-mapped |
| `/non-mvp-campus.html` | — | no equivalent; let it 404 (was a non-MVP stub) |
| `#orbit-post-*` anchors | type-mapped routes | handled by `mapNotificationRoute` + SW fallback |

Optional nicety (only if desired): host-level redirects for `/dashboard.html`
→ `/` on the new host. Not required — no known inbound traffic uses it beyond
old notification links, which are already neutralized.

## 5. Pre-cutover checklist

- [ ] Owner confirms current DNS/hosting provider behind universeicos.app
- [ ] Choose host + create project (decision point 1)
- [ ] Set the two env vars on the host
- [ ] On-device push check (Settings → Enable → "Enabled" pill)
- [ ] Delete orphaned `sweep-test.pdf` from the study-resources bucket
      (Supabase dashboard → Storage; blocked from SQL by platform guard)
- [ ] Dress-rehearsal smoke pass on preview URL (step 2 list)
- [ ] Owner picks the cutover window

## 6. Post-cutover cleanup (after stability, all optional)

- Retire the legacy host config once DNS points at the new host and stays.
- Consider removing `inject-mobile-css.yml` only when `main` is retired or
  repurposed; until then it is harmless (it only self-commits on main pushes).
- Repo hygiene: make `my-new-feature` the default branch, or merge to `main`
  deliberately as the first post-cutover act — owner's call.

## 7. Known limitations / open items

- Real-device push subscribe→DB-row link is code-reviewed and
  legacy-mirrored but not yet observed live (headless Chrome cannot create
  push subscriptions).
- Legacy site remains non-installable (empty manifest icons) until cutover.
- `study_hub` legacy table and any legacy-only features were audited and are
  intentionally not ported (documented in Phase 4E-0 audit).
