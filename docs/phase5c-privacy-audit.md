# Phase 5C — Privacy Audit + X3 Hardening

Date: Sept 29 2026 · Status: COMPLETE. Audit was read-only; the single DB fix
(X3) was owner-approved ("go ahead") and is applied live.
Scope per Phase 5 plan: (1) discover/search RPC field minimization,
(2) whisper anonymity browser check.

## 1. Verified facts (live, via management API + code audit)

### Discover/search RPCs — fields returned are minimal and card-safe
- `campus_chat_discover_students`: id, full_name, avatar_url, university,
  department, level, bio, is_verified. Blocks-aware, campus-scoped, own row
  excluded. `p_limit` clamped 1..60 server-side.
- `campus_chat_search_students`: same + reputation_stars, limit 30,
  name/department ILIKE only.
- No email, phone, matric, or moderation fields. `id` is required to send
  chat requests (campus_chat_send_request takes the target uuid) — expected
  exposure, same as legacy.

### Whisper anonymity — VERIFIED SAFE at every layer
- Browser: the new UI reads ONLY the `whisper_posts_public` view
  (id, anon_label, content, like_count, created_at — no author_id) and calls
  only SECURITY DEFINER RPCs: create_whisper, get_or_create_whisper_identity,
  get_my_whisper_state (returns booleans only), toggle_whisper_like,
  delete_whisper (own-scoped), create_whisper_report.
- Grants: `authenticated` has SELECT only on safe columns of
  whisper_posts / whisper_comments; **author_id and moderation_status were
  never granted to clients** — X1/X2 from the first audit pass were false
  alarms (the RLS "exposure" was masked by column-level grants all along).
- `whisper_identities` (user_id ↔ anon_label map): SELECT policy `false`.
  Direct `select author_id from whisper_posts` as authenticated → 42501.

## 2. X3 — profiles over-exposure (FIXED, live-applied)

Finding: profiles had a FULL table-level grant to `authenticated`; the
SELECT RLS policy was `qual: true` — every student could read
`admin_note`, `account_status`, `wallet_balance` on ALL rows via direct
table queries (all client profile reads use explicit safe column lists,
verified by grep of both UIs).

Fix applied (`sql/phase5c-profiles-column-hardening.sql`):
`revoke select on public.profiles from authenticated` + column-level
grants for the 14 safe columns. **admin_note and account_status are now
permission-denied for all client roles.**

- Kept readable: wallet_balance (the LIVE legacy dashboard renders the
  user's own balance — 12 references in dashboard.html; revoking it would
  break production). ACCEPTED RESIDUAL: students can read other students'
  wallet_balance via a crafted query. Fix at legacy retirement/cutover:
  drop wallet_balance from the grant list.
- Safety checks before applying: sync_profile_from_auth and
  guard_profile_client_mutation are SECURITY DEFINER owned by postgres
  (unaffected); both auth.users triggers verified; auth flows unaffected.

## 3. Live verification (all passed)

As simulated authenticated user (management API `set local role`):
1. select full_name → OK; 2. select admin_note → 42501 DENIED;
3. select account_status → 42501 DENIED; 4. select wallet_balance → OK;
5. update own profile (no-op) → OK; 6. campus_chat_discover_students → OK;
7. whisper_posts_public view → OK; 8. get_my_whisper_state → OK;
9. direct whisper_posts author_id select → 42501 DENIED.

Browser end-to-end (throwaway cc-5f@universeicos.app, deleted after):
signup → login → profile page (university renders) → /whisper feed +
composer post via RPC (persisted) → /chat → /verify — zero console errors.

## 4. Notes

- NEVER add `select("*")` on profiles in client code — PostgREST would
  return permission-denied now that column grants are narrowed. All current
  reads use explicit column lists (safe).
- Rollback if ever needed: `grant select on public.profiles to authenticated;`
- Audit incident during verification: raw /auth/v1/signup tests 500'd with
  "Database error saving new user" — root cause was MY test harness using
  the wrong payload shape ({"options":{"data":...}} instead of top-level
  "data" → university metadata never reached the trigger → clean
  trigger-raise surfaced as opaque 500). Signup itself is healthy;
  correct-shape signup verified working. No platform outage.
