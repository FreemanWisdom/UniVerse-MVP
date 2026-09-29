# Phase 5C — Privacy Audit (read-only)

Date: Sept 29 2026 · Status: READ-ONLY AUDIT COMPLETE. No code or DB changes made.
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
- is_verified is still returned (5B-3 removed the misleading UI badge; field
  is harmless and may be reused for the real verified badge later).

### Whisper frontend — anonymity-safe in the browser
- The new UI reads ONLY the `whisper_posts_public` view
  (id, anon_label, content, like_count, created_at — no author_id) and calls
  only SECURITY DEFINER RPCs: create_whisper, get_or_create_whisper_identity,
  get_my_whisper_state, toggle_whisper_like, delete_whisper,
  create_whisper_report.
- `get_my_whisper_state` returns only booleans (is_mine/liked) — no author
  ids ever reach the client. `delete_whisper` is own-scoped server-side.
- `src/features/whisper/whisper.types.ts` carries an explicit rule:
  "Never add `author_id` to these models."
- `whisper_identities` (user_id ↔ anon_label map) is fully locked:
  SELECT policy `false` — properly private.

## 2. ⚠ Server-side residual exposures (DB layer — any authenticated user
can query directly with the anon key; UI minimization does NOT protect these)

- **X1 — whisper_posts exposes author_id to campus peers.** RLS policy
  "whisper campus safe select" filters rows (active, not deleted, same
  campus) but returns ALL columns — `select author_id, anon_label from
  whisper_posts` links every anonymous post to its author uuid. Combined
  with X2 this de-anonymizes whispers outright.
- **X2 — whisper_comments exposes author_id** the same way (table unused by
  the new UI but still client-selectable).
- **X3 — profiles SELECT policy is `qual: true`**: every authenticated user
  can read ALL profiles rows in full, including `admin_note` (internal
  moderation notes), `account_status`, `wallet_balance`,
  `onboarding_completed`. The discover/search RPC minimization is cosmetic
  against direct table reads. No email/phone/matric columns exist in
  profiles (verified) — the sensitive set is admin_note + account_status +
  wallet_balance.

## 3. Remediation options (ALL are DB changes — require Freeman's approval;
none implemented)

- R-X1/X2: Revoke direct client access to whisper_posts/whisper_comments
  tables (or column-level SELECT grants hiding author_id) and route all
  reads through the existing view + RPCs. Must re-check the whisper_likes
  INSERT policy (its WITH CHECK subquery reads whisper_posts) and
  moderation flows (admin_moderate_report touches whisper rows as
  SECURITY DEFINER, unaffected).
- R-X3: Column-level grants: revoke SELECT(admin_note, account_status,
  wallet_balance) from authenticated; or move admin-only fields to a
  separate admin schema. Legacy dashboard.html reads profiles too — its
  column usage must be checked before revoking (it may render
  wallet_balance; admin_note unlikely).
- Cheapest hardening with zero functional risk: none of X1–X3 are
  exploitable by the shipped UI; they require a deliberate crafted query.
  Risk is privacy-by-obscurity only, but the whisper feature's core promise
  is anonymity, so X1 is the priority.

## 4. Verdict

- Frontend: PASS — no changes needed; browser payloads contain no private
  ids or admin fields.
- Backend: 3 findings (X1–X3) awaiting a fix/no-fix decision; fixes are
  small, surgical SQL (policy/grant tightening), but each needs owner
  approval per project rules.
