# Phase 5B — School-Gating UX Design Review

Status: READ-ONLY AUDIT (no code or DB changes made). Sept 29 2026.
Scope per phase5-verification-design.md §5.2: verification status UX + school
gating messaging, under the standing Phase 5 decisions (verification OPTIONAL,
badge admin-granted, no new workflow RPCs without approval).

## 1. Verified facts (live audit)

### F1 — New-UI signups get NO campus, permanently
- `signup-form.tsx` collects email + password only and sends **no metadata**;
  after signup it routes to `/verify`.
- `sync_profile_from_auth` maps `profiles.university` from
  `raw_user_meta_data->>'university'` (legacy school picker used this).
- `guard_profile_client_mutation` **locks `university` to its old value on every
  client UPDATE** — a user can never set or change their campus themselves.
- The profile edit form has no university field at all.
- Consequence chain: a user who signs up on the new build has
  `university = NULL` forever → chat discovery returns same-university only
  (empty), study resources are campus-scoped (empty), tribes INSERT requires
  `university = profile.university` (blocked). **All campus features are
  silently empty with no explanation.** This is the school-gating UX bug.

### F2 — Badge semantics are split and misleading
- Profile shows two badges: "Verified" (`is_verified` = **email confirmed**,
  set automatically by the sync trigger) and "Verified Student"
  (`student_verified` = the real 5A registry badge, admin-granted).
- Chat discovery cards badge `is_verified` ("Verified") — a merely
  email-confirmed user is presented as if student-verified.
- `/verify` page statically renders a "Verified Student" badge in its header
  to **every visitor regardless of status**, and sits in the (auth)/public
  route group so it shows logged-out with the public layout.

### F3 — School picker source already exists, publicly
- `verify-student-public` GET: `verify_jwt=false`, anon-callable, 8/600s per IP.
  Returns the full school list `{id, name, slug}` — 142 schools. Confirmed
  working with the anon key only.

### F4 — Registry reality
- `student_registry` has rows for exactly **one** school: UAES Umagwo (1 row).
  Registry-based checks can only succeed for that campus today.
- `verify-student` edge fn (JWT, 10/600s per user+school) is a pure read-only
  registry check returning verified / not_verified / school_unavailable — it
  persists nothing (5A audit), so it can power a "check my status" action
  without touching the admin-granted badge model.

### F5 — Current data
- All 47 existing profiles have a university set (legacy-era or metadata
  signups), so F1 has not been observed in production yet — it only hits the
  first genuinely new signup.

## 2. Backend capabilities available (no new RPCs needed)

| Capability | Source | Auth |
|---|---|---|
| School list for picker | `verify-student-public` GET | public (anon) |
| Registry status check | `verify-student` | logged-in, rate-limited |
| Badge grant/revoke | `admin_update_user` (5A) | admin-only, audited |
| Campus immutability | `guard_profile_client_mutation` | DB-enforced |

## 3. Proposed design (all frontend-only, zero DB changes)

**5B-1 — School picker at signup (fixes F1).** Required select populated
from `verify-student-public` GET; chosen school name passed as
`options.data.university` on signup → existing sync trigger stores it →
guard makes it immutable. "My school isn't listed" submits with no campus and
lands the user in a *visible* "no campus set" state (see 5B-4), never a silent
one.

**5B-2 — Honest `/verify` status page.** Gated to signed-in students. Shows:
your campus, your actual badge state, email-confirmed state. A
"Check my registry status" button calls `verify-student` (read-only) and
renders verified / not_found / school_unavailable with honest copy:
verification is optional, badges are granted by campus admins, and your
school's registry must be imported first. Static decorative badge removed.

**5B-3 — Badge cleanup.** Remove the email-based "Verified" badge from
profile and chat discovery cards (it misrepresents email confirmation as
student verification). Reintroduce in chat only if/when discovery RPCs expose
`student_verified` (RPC change → separate approval).

**5B-4 — Empty-campus/empty-gating states.** Where campus scoping yields
nothing (study resources, chat discovery, tribes), say *why*: "Nothing for
your campus yet" + what fills it. A user with no campus set gets an explicit
"Set up your campus" prompt (future: admin-assisted; signup is the only
self-service moment).

## 4. Decision points for Freeman

- **DP-1** Signup picker: required (recommend) or optional? Allow unlisted
  schools as a visible no-campus state (recommend) or force a choice from 142?
- **DP-2** Email "Verified" badge: remove from profile + chat (recommend),
  rename to "Email verified", or keep as-is?
- **DP-3** `/verify` "Check my registry status" via existing read-only edge
  fn (recommend), or keep the page fully static?
- **DP-4** For schools without registries (all but UAES today): show
  school_unavailable + "contact your campus admin" copy (recommend) — no
  promise of self-service verification anywhere.

## 5. Known limitations / open items (out of 5B scope)

- University is stored as free text; picker values must match the names the
  gates compare against (`lower()` equality in E1; exact-ish elsewhere).
- Tribes cross-campus join (RISK 2) still pending owner approval.
- Changing campus later = admin-assisted operation by design (guard enforces);
  no admin UI for it yet — candidate for a future admin batch.

## 6. Next step

Freeman rules on DP-1…DP-4 → implement 5B-1…5B-4 (frontend-only) →
tsc/lint/build + browser verification with a throwaway account per campus
state (no campus / campus without registry / UAES registry hit).
