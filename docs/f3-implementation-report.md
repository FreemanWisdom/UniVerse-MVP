# F3 — Authentication session termination: implementation report

Date: 14 Nov 2026 · Branch: `my-new-feature` · HEAD: `a05ba3b` (unchanged)
Status: implemented and tested locally. **Not committed, not deployed.**

---

## 1. Summary of changes

Ordinary sign-out is now explicitly device-scoped, a separate global action
exists, and both password paths revoke the other sessions while keeping the
current one. Failure states no longer masquerade as success.

| Action | Before | After |
|---|---|---|
| Sign out (Settings) | implicit `global` — killed every device | `scope: "local"` — this device only |
| Sign out (waitlist gate) | same shared component, same global effect | unchanged component, now local |
| Change password (Settings) | revoked nothing | update, then `scope: "others"` |
| Password recovery/reset | revoked everything only as a side effect of the closing `signOut()` | explicit `scope: "others"`; the recovery session is kept and the user lands signed in |
| Sign out of all devices | did not exist | new action, `scope: "global"`, explicit confirmation |
| Failed sign-out | navigated to `/login`, which bounced authenticated users back to `/orbit` — looked like it worked | stays put, shows a `role="alert"` message, session intact |

## 2. Files modified

```
 M src/app/(student)/settings/page.tsx                  +15 -2
 M src/components/auth/logout-button.tsx                +51 -12
 M src/components/auth/logout-confirm-modal.tsx         +63 -14
 M src/components/auth/reset-password-form.tsx          +46 -8
 M src/features/settings/components/password-settings.tsx +16 -3
?? src/components/auth/sign-out-everywhere-button.tsx    +112 (new)
```

`git diff --numstat`: **+164 −27** across five tracked files, plus one new
file. No dependency changes, no schema, no SQL, no RLS, no edge functions.

## 3. What each change does

**`logout-button.tsx`** — `supabase.auth.signOut({ scope: "local" })`. The
confirmation now states the actual blast radius ("Your other devices will stay
signed in."). A failure sets an error surfaced inside the dialog; the old
catch-all `router.push("/login")` is gone, because `/login` redirects an
authenticated user straight back to `/orbit` and the failure became invisible.

**`sign-out-everywhere-button.tsx`** (new) — separate control, separate copy,
`scope: "global"`. Confirmation names every device; success shows the existing
`AuthTransition` overlay ("Signed out everywhere") then returns to the public
site; failure shows an alert and leaves the session alone. Deliberately not the
default: it sits below the ordinary sign-out in the same Security section.

**`logout-confirm-modal.tsx`** — the modal now takes optional
`title`/`description`/`warning`/`confirmLabel`/`busyLabel`/`error`, so both
actions share one implementation (defaults reproduce the old "Leave Orbit?"
dialog). The accessible name is the visible heading via `aria-labelledby`
instead of a hardcoded `aria-label`, and the error renders as `role="alert"`.

**`password-settings.tsx`** — after a successful `updateUser({ password })`,
`signOut({ scope: "others" })`. On success: "Password updated. Your other
devices have been signed out." On a failed revocation: "Password updated, but
we couldn't sign out your other devices. Use "Sign out of all devices" below to
be sure." The password change is not rolled back and is not described as
complete enforcement.

**`reset-password-form.tsx`** — the same `scope: "others"` call after a
successful reset, while the recovery session survives; the closing sign-out is
now explicit `scope: "local"`. A failed revocation renders a persistent
"password updated, other devices may still be signed in" screen with an explicit
continue button rather than the 900 ms transition, so the warning cannot be
missed.

**`settings/page.tsx`** — Security section carries both rows; the ordinary row's
description changed from the inaccurate "End your current session" to "End this
device's session. Other devices stay signed in."

## 4. Scope semantics (verified before implementing)

From the installed client (`@supabase/auth-js@2.109.0`,
`GoTrueClient.js:3319`):

```js
async signOut(options = { scope: 'global' }) { … }
exports.SIGN_OUT_SCOPES = ['global', 'local', 'others'];
```

- `local` — server call is made, then `_removeSession()` clears this browser's token; other sessions untouched.
- `others` — server call is made; `_removeSession()` is **skipped**, so this browser stays signed in (the `scope !== 'others'` guard).
- `global` — server call is made and this browser's session is cleared too.

Confirmed at runtime: after `scope: "others"`, the calling context still
returned **200** from `/auth/v1/user` and could keep navigating
(`afterChange.userA = 200`, `canNavigateA = true`).

## 5. Playwright results

```
f3-local         10 passed (1.2m)
f3-global-local  1 passed (10.8s)
f1-local + f2-local   19 passed, 3 skipped (1.9m)   ← F1/F2 unchanged
```

`f3-local` covers Tests A, B, C, E, F, G; `f3-global-local` is Test D only and
declares `dependencies: ["f3-local"]`, so the destructive global logout runs
last. New files: `tests/_f3.ts` (helpers), `tests/f3-sessions.spec.ts`,
`tests/f3-password.spec.ts`, `tests/f3-recovery.spec.ts`,
`tests/f3-global.spec.ts`, `tests/f3-regression.spec.ts`.

Tests B and C create and delete their own throwaway identity through the admin
API (`cc-f3-pwd-*`, `cc-f3-rst-*`), so no shared credential is mutated.
Fixtures are deleted in `finally`; zero `cc-f3*` users remain (63 users total).

## 6. Two-context evidence

Measured on the local build against the same Supabase project, disposable
identity, statuses only (no token ever printed):

| Point in time | device A `/auth/v1/user` | device B `/auth/v1/user` | device B refresh |
|---|---|---|---|
| both signed in | 200 | 200 | not probed (would rotate B) |
| after password change **from A** | 200 | **403** | **400** |
| control: fresh session after the change | — | — | **200** |

The control matters: the same endpoint returns 200 for a healthy session, so the
400 is a revocation signal, not a broken probe. Note B answers **403**
(`session_not_found`), not 401, on `/user` after revocation.

Per-test evidence:

- **A** — captured logout request contains `scope=local`; A lands signed out
  (`/settings` → `/login`); B stays 200 and can navigate `/settings`.
- **B** — success copy shown; A alive; B 403 + refresh 400; fresh login with the
  new password works.
- **C** — reset revokes B; captured logout calls are `scope=local` only, no
  `scope=global`, proving the flow no longer relies on incidental global revoke.
- **D** — captured logout request contains `scope=global`; A signed out, B 403 +
  refresh 400; "Signed out everywhere" overlay observed.
- **F** — `/auth/v1/logout` aborted at the network layer: dialog stays open,
  `role="alert"` shown, URL still `/settings`, session still 200, `/orbit` still
  reachable.

Screenshots: `audit-results/screenshots/F3-B-password.png`,
`F3-C-recovery.png`, `F3-D-global-logout.png`.

## 7. Unresolved issues and limitations

1. *(Superseded by §11.2 — the real emailed link is now covered.)* **Recovery was originally exercised without an emailed link.** No mailbox and no
   working admin link generator were available, so Test C enters
   `/reset-password` through an existing session (the component treats a live
   session as "ready"). The submit, revocation, success and closing sign-out are
   the same code path, but the emailed `token_hash` exchange is not covered.
2. *(Superseded by §11.3 — the gate is now driven with real clicks.)* **The launch gate was originally verified statically only.** Identity A belongs
   to a launch campus, so the gate cannot render for it. The test asserts the
   gate renders `<LogoutButton />`, has no sign-out call of its own, and that the
   shared control uses `scope: "local"` (comments stripped before matching).
   Behaviourally it is covered by Test A — same component.
3. **Incident during the first attempt, disclosed for the record.** Test B
   originally changed identity A's password (the audit identity) and its restore
   step failed, leaving A on an unknown temporary value. I restored it via the
   Supabase admin API and moved Tests B and C onto throwaway identities so this
   cannot recur. Identity A's password is the original value from
   the agent's secret store (verified by a successful login).
4. **Rate limits.** Supabase rate-limits password sign-ins per IP; running the
   suite repeatedly in quick succession can trip it. Each test logs in 2–3 times.
5. *(Resolved — the product decision is applied, §11.1.)* **Interpretation of the recovery UX.** I kept the existing "sign out and sign
   in with your new password" ending (now `scope: "local"`) rather than leaving
   the user signed in. Revocation happens *before* that, so the recovery window
   is protected. Flagged because "preserve the current session" could also be
   read as "stay signed in afterwards".
6. `tests/logout.spec.ts` (the older production audit spec) still matches the
   new labels via its `/yes|sign out|log out/i` regex, but its header comment
   about global scope is now stale. Not changed, to keep this diff to F3.

## 8. Git diff summary

```
 M src/app/(student)/settings/page.tsx                   +15  -2
 M src/components/auth/logout-button.tsx                 +51  -12
 M src/components/auth/logout-confirm-modal.tsx          +63  -14
 M src/components/auth/reset-password-form.tsx           +46  -8
 M src/features/settings/components/password-settings.tsx +16 -3
?? src/components/auth/sign-out-everywhere-button.tsx    +112
```
`tsc --noEmit` clean · `eslint` 0 errors (6 warnings, pre-existing) ·
`npm run build` exit 0.

## 9. Untouched (confirmed)

- `sql/**` — untouched, including `phase5a-student-verified.sql`; **R2 not started**.
- Push subscription creation, deletion, delivery and `send-push` — untouched; no notification was sent to any user.
- F1 tour (`welcome-carousel.tsx`) and F2 install prompt (`post-tour-install-prompt.tsx`, `floating-install-button.tsx`) — not in the diff; their suites still pass (19 passed, 3 skipped).
- No RLS, schema, database function, policy or Supabase setting changed.
- Test data: only `cc-f3-*` throwaway identities were created, and all were deleted (63 users, 0 `cc-f3*` remaining).

## 10. Deployment status

Nothing was committed, pushed or deployed. `HEAD` is still `a05ba3b`; the six
files above are uncommitted working-tree changes awaiting review.

Local verification ran on a production build served at `http://localhost:3299`
against the existing Supabase project (the app's `TEST ENVIRONMENT` badge is
expected on any non-production host).

---

## 11. Revision 2 — recovery session preservation and added coverage

### 11.1 Recovery correction (product decision applied)

Successful password recovery now **leaves the current device signed in**.
`reset-password-form.tsx` still calls `signOut({ scope: "others" })` after
`updateUser` — that step is untouched — but the closing `signOut({ scope:
"local" })` and the redirect to `/login` are gone. `handleDone` now routes to
`/orbit`.

| Stage | Behaviour |
|---|---|
| password updated | `updateUser({ password })` |
| other devices | `signOut({ scope: "others" })` — revoked |
| this device | session kept, user continues into `/orbit` |
| revocation failed | persistent warning screen, still signed in, points at "Sign out of all devices" |

This reverses the earlier "sign out, then log in with the new password" ending
recorded in §3 and §7 of revision 1.

### 11.2 Email recovery — real message, real token

`tests/f3-recovery-email.spec.ts` creates a throwaway `cc-f3-mail-*` identity,
requests a reset from the app's own `/forgot-password` form, and then reads the
message that Supabase actually generated.

How the mail is obtained: this deployment sends auth mail through
`smtp.resend.com`, and Resend retains the message. The test lists
`GET /emails` for the fixture address, matches the subject `Reset Your Password`,
pulls the body with `GET /emails/{id}`, and extracts the
`/auth/v1/verify?token=…&type=recovery` link.

**What that proves:** the message was generated by GoTrue, submitted through the
provider, and carries a real single-use token. The token is then exchanged in a
clean browser context, which is the actual recovery path.

**What it does not prove:** delivery into a human mailbox. The fixture domain
has no inbox (no inbound MX), so a message to it is retained by the provider
rather than delivered — `last_event` observed on this run was `sent`, and a
neighbouring message showed `delivery_delayed`. Mailbox delivery remains
**UNVERIFIED**; the content is read from the provider's sent-mail record, not
from an inbox.

Observed assertions in the passing run:

| Check | Result |
|---|---|
| recovery email generated, subject matched | pass |
| verify link present with `type=recovery` | pass |
| link opened in a clean context → reset form appears | pass |
| password updated | pass |
| "Your other devices have been signed out" shown | pass |
| recovery session still valid (`GET /user` 200) | pass |
| recovery session reaches `/orbit` (stays signed in) | pass |
| older device's session revoked | pass |
| used link replayed in a new context | rejected, no password form |
| tampered token (`token_hash=invalid-token-for-f3`) | "expired or is invalid", no form |

### 11.3 Launch-gate interaction — real clicks

`tests/f3-launch-gate.spec.ts` creates a disposable **gated** identity on Abia
State University (outside the five launch campuses; the annotation records the
campus it used). Two sessions are opened for that identity, then the gate's own
logout flow is driven:

1. the gate renders (`/waitlist|launching soon/i` visible) — the app shell does not,
2. the confirmation dialog opens from the gate's "Sign out" and states that other
   devices stay signed in,
3. confirming ends **this** session (lands on `/`, `/settings` bounces to `/login`),
4. the second session for the same identity is still valid (`GET /user` 200) and
   still sees the gate.

The earlier static assertion (F3-E) is kept, but it is no longer the only
evidence.

### 11.4 Updated run

```
f3-local          10 passed (1.2m)     A B C G(2) H(2) I E F
f3-global-local    1 passed (10.8s)    D — dependencies: ["f3-local"], runs last
f1-local + f2-local  19 passed, 3 skipped (1.9m)
tsc clean · eslint clean · next build exit 0
```

Runs use `AUDIT_LOCAL_URL=http://localhost:3000` because `localhost:3000/**` is
the only localhost entry in the Supabase redirect allow-list; the email test
needs the redirect target to be accepted. Port references inside the specs are
now derived from `LOCAL_BASE` rather than hardcoded.

Screenshots: `F3-B-password.png`, `F3-C-recovery.png`, `F3-D-global-logout.png`,
`F3-H-email-recovery.png`, `F3-I-launch-gate-logout.png`.

Fixtures: every `cc-f3-*` identity is deleted in `finally`; verified after the
run — 59 users, **0** `cc-f3` accounts remaining.

### 11.5 Final git diff

```
 M src/app/(student)/settings/page.tsx                   +14 -1
 M src/components/auth/logout-button.tsx                 +40 -11
 M src/components/auth/logout-confirm-modal.tsx          +53 -10
 M src/components/auth/reset-password-form.tsx           +43 -11
 M src/features/settings/components/password-settings.tsx +15 -1
?? src/components/auth/sign-out-everywhere-button.tsx     +112 (new)
```

**+165 −34 tracked, plus one new 112-line file.** HEAD unchanged at
`a05ba3b`. No commit, no push, no deploy. R2, push subscriptions, F1 and F2 were
not touched; their suites still pass.

---

## 12. Final code review (pre-merge)

Reviewer: technical review pass over the full diff from `a05ba3b`, the Playwright
configuration and the harness. No commit, push or deploy was performed.

### 12.1 Files reviewed

Application (`git diff a05ba3b`, `my-new-feature`, uncommitted):

| File | Δ | Result |
|---|---|---|
| `src/components/auth/logout-button.tsx` | +40 −11 | `scope: "local"`, honest failure, no bounce redirect |
| `src/components/auth/sign-out-everywhere-button.tsx` | +112 new | `scope: "global"`, explicit confirmation, honest failure |
| `src/components/auth/logout-confirm-modal.tsx` | +53 −10 | optional copy + `role="alert"` error slot, a11y name improved |
| `src/features/settings/components/password-settings.tsx` | +15 −1 | `scope: "others"` after update, partial-failure copy |
| `src/components/auth/reset-password-form.tsx` | +43 −11 | `scope: "others"` after reset, session preserved, no local sign-out |
| `src/app/(student)/settings/page.tsx` | +14 −1 | both session actions, "Sign out everywhere" wired |

Harness: `playwright.config.ts`, `tests/_f3.ts`, `tests/f3-teardown.ts` (new),
`tests/f3-sessions.spec.ts`, `tests/f3-password.spec.ts`,
`tests/f3-recovery.spec.ts`, `tests/f3-recovery-email.spec.ts`,
`tests/f3-launch-gate.spec.ts`, `tests/f3-regression.spec.ts`,
`tests/f3-global.spec.ts`.

Behaviour verified against the requirements: local / global / others scopes are
each used in exactly one place, per flow, with no double termination; recovery
performs no local sign-out; both failure paths state failure.

### 12.2 Findings and severity

| # | Finding | Severity | Action |
|---|---|---|---|
| 1 | F3 projects defaulted to `localhost:3299` while the email-recovery test needs the allow-listed `localhost:3000` origin — the suite passed only because the port was exported by hand | **Medium** (silent test failure for the next runner) | **Corrected** |
| 2 | A killed worker could leak a `cc-f3-*` identity; individual `finally` blocks cannot run after a hard timeout | **Low** | **Corrected** |
| 3 | Both session buttons repeat ~30 lines of modal wiring (state, open/close, error) | Low (duplication, not logic) | Accepted as-is; scopes and copy differ, a shared hook is optional debt |
| 4 | `LogoutConfirmModal` has no focus trap or focus restore (the F1 tour does) | Low, **pre-existing** | Out of F3 scope; recorded for the F1/a11y pass |
| 5 | `serviceRoleKey()` gives the harness admin create/delete over production users | Low, test-only | Accepted: needed for disposable identities, token stays in the agent env, never written to disk or git, matching only `cc-f3-*` |
| 6 | Success copy ("Your other devices have been signed out") asserts the server accepted the revocation, not a per-device proof | Info | Accurate: the claim is made only when `signOut({scope:"others"})` returns no error; the failure path says the opposite |

No finding is a blocker; 1 and 2 are corrected and re-verified below.

### 12.3 Corrections made

1. `playwright.config.ts` — `f3-local` and `f3-global-local` now default to
   `http://localhost:3000` with a comment stating why (redirect allow-list) and
   that `AUDIT_LOCAL_URL` overrides it. `tests/_f3.ts` `LOCAL_BASE` matches, so
   the helper and the projects cannot drift apart. F1/F2 keep 3299.
2. `tests/f3-teardown.ts` (new, wired as `globalTeardown`) — after any run,
   lists and deletes every remaining `cc-f3-*` identity. Skips silently when no
   management token is present. Proven: a deliberate `cc-f3-leak-*` fixture was
   planted before the run and the teardown reported
   `removed 1 leftover fixture(s)`.

### 12.4 Test results (after corrections)

Run with **no** `AUDIT_LOCAL_URL` set, exercising the new defaults:

```
f3-local          10 passed
f3-global-local    1 passed     (deps: ["f3-local"] — destructive test still last)
[f3-teardown] removed 1 leftover fixture(s)
11 passed (1.4m)
f1-local + f2-local   19 passed, 3 skipped   (unchanged by this review)
SUPABASE users: 59 | cc-f3 remaining: 0
```

Evidence artifacts: `audit-results/screenshots/F3-{B,C,D,H,I}-*.png`.

### 12.5 Git diff summary

```
 M src/app/(student)/settings/page.tsx                    +14  -1
 M src/components/auth/logout-button.tsx                  +40 -11
 M src/components/auth/logout-confirm-modal.tsx           +53 -10
 M src/components/auth/reset-password-form.tsx            +43 -11
 M src/features/settings/components/password-settings.tsx +15  -1
?? src/components/auth/sign-out-everywhere-button.tsx    +112 (new)
```

`+165 −34` across five tracked files, plus one new 112-line file. `HEAD` is
still `a05ba3b`. `tsc --noEmit` clean. Nothing staged.

### 12.6 Security review conclusion

- **No credential or token exposure.** No token, password or cookie value is
  logged, rendered or written to disk by the changed code. The harness reads
  session tokens from the browser's own cookies in memory and asserts only HTTP
  statuses. `.auth/`, `audit-results/` and `node_modules/` are covered by
  `audit-pw/.gitignore`; `git check-ignore` confirms. The app repo tracks only
  `.env.example` (`.env*.local` ignored).
- **Error handling is honest.** Neither button redirects on failure; both keep
  the dialog open with a `role="alert"` message and leave the session intact.
  Neither password path claims full enforcement when the revocation call fails.
- **Redirects are correct.** The old failure path pushed to `/login`, which
  bounces authenticated users back to `/orbit` and read as success. That path is
  gone.
- **No duplicate termination.** One `signOut` call per action, each with an
  explicit scope; ordinary sign-out cannot revoke another device by accident.
- **No repeated submissions.** Both confirm buttons disable while the request is
  in flight and show a busy label; the password form disables on `isSubmitting`.
- **Accessibility.** The dialog's accessible name is now its visible heading
  (`aria-labelledby` + `aria-describedby`) instead of a fixed "Confirm logout",
  and errors are announced. No regression; the missing focus trap is
  pre-existing (finding 4).

### 12.7 Approval recommendation

**Approved for commit** on `my-new-feature`, on the basis of the diff above,
11/11 F3 tests passing on the corrected defaults, F1/F2 unchanged and passing,
fixtures clean, and no credential exposure.

Conditions attached to that approval:

- Commit to `my-new-feature` only. A push to `main` deploys, and deploy remains a
  separate owner decision.
- Mailbox delivery of the recovery email stays **UNVERIFIED** (no inbox exists for
  the fixture domain; `last_event: sent`). Everything up to and after the token
  exchange is verified.
- Findings 3, 4 and 5 are accepted debt, not fixed.
