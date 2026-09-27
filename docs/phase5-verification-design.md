# Phase 5 — Student Verification & Privacy: Design Audit

Status: LIVE-RE-AUDITED (Sept 27 2026) — fresh management-token audit complete.
No Phase 5 build until the two decision points in §7 are called by Freeman.
Evidence base: all findings below are live-verified against the production DB
(function definitions read via management API; edge-function sources extracted
from deployed eszip bundles).

## 1. Roadmap items → what already exists (live-verified)

| Roadmap item | Backend state |
|---|---|
| University verification | `schools` (id, name, slug, verification_enabled); `student_registry` FK to schools |
| Verification records | `student_registry`: matric_number + normalized variants, full_name + normalized, faculty/department/level/programme, source, status, school_id |
| Verification methods | RPC flow (below) + edge functions `verify-student`, `verify-student-public` (both ACTIVE, v7/v9, sources read) |
| Import pipeline | `student_import_jobs`; `admin_prepare_student_import` RPC; 4G admin console CSV import (10k cap) |
| Rate limiting | `consume_verification_rate_limit(p_bucket_key, …)`; `consume_verification_rate_limit_for_user(p_school_id, …)` (10/600s per user+school) |
| Verification on profile | `profiles.is_verified` — ⚠ semantics, see §4 |
| Anonymity separation | Whisper: separate `whisper_identities`, `get_or_create_whisper_identity`, `create_whisper` returns only anon_label |
| Moderation / abuse | `reports` table; moderation_status columns; `admin.user_allowed(uid, action)`; 4G admin console |
| Audit logging | `write_audit` on every admin write |

## 2. Live-verified verification contracts

### RPC `verify_student_identity(p_school_id, p_matric_number, p_full_name)`
The core registry check, SECURITY DEFINER:
- Validates inputs (normalized), requires school `verification_enabled`,
  looks up `student_registry` by normalized matric + status='active',
  compares normalized full name.
- Every attempt logged to `private.student_verification_attempts`
  (matric stored only as hash).
- Returns `{verified, result_code, school_id, student_id, faculty, department, level, programme}`.
- result_code ∈ invalid_input, school_unavailable, not_verified, verified.
- **Writes nothing to profiles** — pure identity proof.

### Edge fn `verify-student` (verify_jwt=true, v7) — LOGGED-IN flow
- POST `{school_id, full_name, matric_number}` + Bearer JWT.
- Server: auth check → user rate limit (10/600s per user+school) → `verify_student_identity`.
- 200 `{verified, status, student:{faculty,department,level,programme}}`;
  429 `{error, retry_after_seconds}`; 503 transient; 401; 405 non-POST.
- **No persistence** — confirms identity, sets nothing.

### Edge fn `verify-student-public` (verify_jwt=false, v9) — PRE-SIGNUP flow
- GET → `{schools:[{id,name,slug}]}` via `get_verification_schools()`.
- POST `{school_id, full_name, matric_number, email}` (email required):
  IP rate limit (8/600s, bucket `public-verify:<school>:<ip>`) →
  school check → `verify_student_identity` →
  service-role RPC `issue_student_verification_ticket(...)` →
  200 `{verified, status, school_id, verification_ticket, verification_expires_at (+10min), student:{...}}`.
- The ticket token is generated IN the edge fn and returned to the client;
  only its hash is stored (`private.student_verification_tickets`,
  `token_hash` column, 10-minute expiry).

### Ticket RPCs (private-schema backed, hash-only storage)
- `issue_student_verification_ticket(...)` — service-role only (raises 42501 otherwise).
- `create_student_verification_ticket(p_school_id, p_matric_number, p_full_name, p_email)`
  (authenticated) — self-service variant: rate-limited, registry-checked,
  generates + returns ticket (hash stored), logs attempt. Same checks as
  verify_student_identity plus email normalization.
- `consume_student_verification_ticket(p_ticket, p_school_id, p_matric_number, p_full_name, p_email)`
  — validates hash/expiry/context (school, matric hash, email, name-vs-registry),
  marks used, returns `{valid, result_code, student_id, faculty, department, level, programme}`.
  **Also writes nothing to profiles.**

## 3. Who can write `profiles.is_verified` (live-verified)

1. `sync_profile_from_auth()` — trigger on auth.users: sets
   `is_verified = (email_confirmed_at is not null)` on insert AND on every
   auth-users update (fires on sign-in).
2. `guard_profile_client_mutation()` — BEFORE trigger on profiles:
   clients cannot write `is_verified` (INSERT forces false, UPDATE keeps old).
   Admin RPCs and DB triggers bypass.
3. `admin_update_user` — admin-only RPC (verify/unverify actions).

**Net: there is NO self-service server path from "registry identity match"
to a persistent verified badge.** All three ticket/verify paths end at a
non-persistent result. Only an admin RPC can set the badge durably —
and see §4 for what the badge currently means.

## 4. ⚠ CRITICAL: `is_verified` semantic collision

The auth-sync trigger sets `is_verified = email_confirmed_at is not null`.
In the live data 36/47 users are "verified" — i.e. the badge currently
means **email confirmed**, not registry-verified student. Consequences:

- If Phase 5 makes `is_verified` mean registry-verified, the sync trigger
  will overwrite it back to email-status on the user's next sign-in
  (any auth.users UPDATE re-fires it).
- If we keep the trigger as-is, the badge stays "email confirmed" and
  registry verification has no durable representation.

This is a product decision, not a frontend one — see §7 DP-2.

## 5. Gap analysis — what Phase 5 actually needs

1. **5A Student verification UI**
   - Current `/verify` page is a placeholder (route exists, no flow).
   - Logged-in flow: `verify-student` edge fn (contract above).
   - Pre-signup flow: `verify-student-public` (school picker + ticket).
   - Result states: verified, not_verified (registry miss / name mismatch),
     school_unavailable, rate-limited (surface retry_after_seconds),
     expired ticket (re-issue).
   - **Persistence gap**: needs §7 DP-1 resolved or the badge must be
     granted by admin (Option A).
2. **5B Verification status UX** — school gating messaging (school_unavailable).
3. **5C Privacy audit** — discover/search RPC field minimization;
   Whisper anonymity browser check; blocks wiring.
4. **5D Rate limits** — verification paths fully covered (live-verified);
   chat/whisper/orbit write paths have NO rate limits (only admin.user_allowed
   gates) — any addition is a DB change needing approval.
5. **5E Moderation** — delivered by 4G; close in smoke test.

## 6. Decisions already made by Freeman (Sept 27 2026)

1. Verification is OPTIONAL — unverified users can use all campus features;
   verified status is a badge/benefit.
2. Legacy flow READ: legacy signup "OTP" is just Supabase email confirmation
   (auth.verifyOtp type signup); `verify-student-public` GET only served the
   legacy school picker; the matric-ticket RPCs were called NOWHERE in the
   legacy UI — `is_verified` was shown in profile/chat discovery and set
   server-side/admin. Phase 5 ticket UI is NEW design, not a port.
3. Rate limits acceptable as long as they don't affect backend logic;
   DB-level changes still need explicit approval.

## 7. Decision points blocking 5A build (need Freeman's call)

**DP-1 — Persistence: how does a successful registry check become a durable badge?**
- Option A (no DB change): /verify UI does the registry check and shows the
  result + student info, but the badge is only granted via admin console
  (admin_update_user). Simple, zero risk, but self-service verification has
  no lasting effect.
- Option B (DB change, needs approval): new RPC
  `complete_student_verification(p_ticket, …)` — consumes a valid ticket
  (from either create_ path) and sets the verified flag + academic fields
  server-side. Requires choosing the flag (DP-2) and a trigger/RPC change.
- Option C (edge fn + admin RPC reuse, no DB change): the /verify page
  performs the check via `verify-student`, and on success the client... has
  no way to persist — equivalent to A. (Listed to show it was considered.)

**DP-2 — What should the verified badge MEAN?**
- Option 1 (DB change): repurpose `profiles.is_verified` = registry-verified;
  requires modifying `sync_profile_from_auth` (stop overwriting with email
  status) and a migration plan for existing 36 "email-verified" users.
- Option 2 (DB change, additive): new column `profiles.student_verified`
  (or similar); keep `is_verified` as email-confirmation; UI badge prefers
  student_verified. No existing behavior changes.
- Option 3 (no DB change): keep is_verified = email confirmed; the registry
  check remains an ephemeral "your details match the registry" confirmation
  with no badge. Verification has no user-visible durable benefit.

## 8. Known limitations

- Edge function sources read from deployed eszip bundles (v7/v9 at audit
  time) — authoritative but not diffable against any repo copy.
- `private` schema tables (tickets/attempts) not directly enumerable from
  public snapshot; behavior inferred from SECURITY DEFINER definitions
  (which embed the private-schema logic).
- RISK 1 (study_courses UPDATE policy) and RISK 2 (tribe_members cross-campus
  INSERT) remain open pending owner approval — unrelated to Phase 5.
