# Phase 5 — Student Verification & Privacy: Design Audit

Status: DRAFT — awaiting review and agreement. No Phase 5 code until agreed.
Evidence base: live-schema snapshot (`types_live.ts`, introspected from the live
DB during Phase 0/4 audits) plus live-verified edge-function contracts from the
Phase 4 audits. A fresh live re-audit is blocked until the Supabase management
access token is refreshed — see "Known limitations".

## 1. Roadmap items → what already exists (verified)

| Roadmap item | Backend state (verified) |
|---|---|
| University verification | `schools` (id, name, slug, **verification_enabled**); `student_registry` FK to schools |
| Verification records | `student_registry`: matric_number + **normalized** variants, full_name + normalized, faculty/department/level/programme, `source`, `status`, school_id |
| Verification methods | RPC ticket flow (below) + edge functions `verify-student`, `verify-student-public`, `import-students` (all ACTIVE, live-verified) |
| Import pipeline | `student_import_jobs` (job tracking); `admin_prepare_student_import` RPC; 4G admin console already ships CSV import (10k row cap) |
| Rate limiting | `consume_verification_rate_limit(p_bucket_key, p_limit, p_window_seconds)` → {allowed, remaining, retry_after_seconds}; `consume_verification_rate_limit_for_user(p_school_id, …)` |
| Verification on profile | `profiles.is_verified` (boolean, nullable) |
| Anonymity separation | Whisper: separate `whisper_identities` table, `get_or_create_whisper_identity(p_school_tag)` RPC, `create_whisper` returns only `anon_label` — identity never mixed into post rows |
| Moderation / abuse | `reports` table; `moderation_status` columns across content tables; `admin.user_allowed(uid, action)` capability gate; 4G admin console (hide/restore, reports queue) |
| Audit logging | `write_audit` on every admin write (4G, live-verified) |

## 2. Verified ticket-flow contract (RPCs)

- `create_student_verification_ticket(p_email, p_full_name, p_matric_number, p_school_id)`
  → { verification_ticket, expires_at, verified, result_code, student_id,
      department, faculty, level, programme, school_id }
- `consume_student_verification_ticket(p_ticket, p_email, p_full_name, p_matric_number, p_school_id)`
  → { valid, result_code, student_id, department, faculty, level, programme, school_id }
- `get_verification_schools()` → { id, name, slug } — public school picker.

Tickets have **no public relation** in the schema snapshot — they live outside
client-visible storage (private schema or RPC-managed). This is the
sensitive-data separation the roadmap asks for, already done server-side.

## 3. Gap analysis — what Phase 5 actually needs (frontend/scope)

The backend is nearly complete. Phase 5 is therefore mostly **flows, UI,
and hardening**, not schema work:

1. **Student verification UI (5A)**
   - Pre-signup/public flow using `verify-student-public` edge function
     (school picker via `get_verification_schools()`, ticket flow).
   - Logged-in verification flow (account already created, verify now).
   - Result states: verified, not-found (registry miss), rate-limited
     (surface retry_after_seconds), ticket expired (re-issue).
   - Profile: visible verified badge (uses existing `is_verified`).
2. **Verification status UX (5B)**
   - Gate messaging when `verification_enabled = false` for a school.
   - Admin side already exists (4G verification page + CSV import).
3. **Privacy controls (5C)**
   - Audit what profile fields are exposed in discover/search RPCs
     (`campus_chat_discover_students` / `campus_chat_search_students` —
     already return is_verified; confirm field minimization).
   - Whisper anonymity re-check in browser (smoke test §4).
   - Blocks (`blocks` table) — verify the block list is wired end-to-end
     and enforced server-side.
4. **Abuse prevention & rate limiting (5D)**
   - Confirm frontend uses the rate-limit RPC responses (no silent 500s).
   - Review: do chat/whisper/orbit write paths have rate limits, or only
     verification? (Verification-only is the current assumption — verify.)
5. **Moderation (5E)** — largely delivered by 4G; close the loop in the
   smoke test rather than new build work.

## 4. Proposed Phase 5 order

5A Verification UI → 5B Status/gating UX → 5C Privacy audit + fixes →
5D Rate-limit coverage audit + fixes → 5E carried by Phase 7 testing.

## 5. Open questions (need Freeman's call)

1. Should verification be **required before** using campus features, or
   optional with a "verified badge" benefit model? (Backend supports both;
   `verification_enabled` per school suggests optional-by-default.)
2. Email in `create_student_verification_ticket` — does the legacy flow send
   the ticket by email (via verify-student edge fn) or show it in-app?
   Legacy behavior must be matched; needs a read of the legacy frontend.
3. Any new rate limits wanted for whisper/chat/orbit writes (DB change —
   needs explicit approval, none will be made otherwise)?
4. Confirm the smoke-test result for Whisper anonymity before 5C design.

## 6. Known limitations

- `SUPABASE_ACCESS_TOKEN` (management API) expired during this audit —
  all findings above come from the previously introspected live snapshot and
  Phase 4 live verification, not a fresh live query. Refresh the token for
  a re-run before signing off on 5C/5D specifics.
- No tickets/verification tables in the public snapshot implies private
  schema — confirm the private schema's tables during the token-refresh audit.
- RISK 1 (study_courses UPDATE policy) and RISK 2 (tribe_members cross-campus
  INSERT) remain open, pending owner approval — unrelated to Phase 5 but
  still on the book.
