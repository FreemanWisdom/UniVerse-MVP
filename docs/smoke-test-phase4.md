# Phase 4 Smoke Test — Two-Account Browser Pass

Run on `my-new-feature` locally (`npm run dev`). Use two browser profiles:
**UNN account** (browser A) and **UAES / Umagwo account** (browser B).
Check items off as they pass; note the exact console/network error for any failure.

## Setup

- [ ] `git pull` — HEAD should be at or after `d69e6ff`
- [ ] tsc / lint / build pass locally
- [ ] Two logged-in sessions: UNN (A) + UAES (B)

## 1. Auth & Profile

- [ ] Logged-out visit to any student route redirects to `/login`
- [ ] Login works for both accounts; session survives a refresh
- [ ] Profile page shows correct name, university, department, level
- [ ] No cross-campus data bleed between the two profiles

## 2. Orbit

- [ ] Feed loads with posts from your own campus only
- [ ] Create post → appears without refresh (realtime)
- [ ] Comment on a post; edit/delete your own post; delete denied on others' posts
- [ ] Reports (post + comment) submit cleanly

## 3. Chat (both accounts together)

- [ ] Search/discover students — UNN account only finds UNN students
- [ ] Send chat request A → B; accept navigates to a conversation
- [ ] Decline path: declined stays declined, no navigation
- [ ] Messages send/receive in realtime
- [ ] A restricted user (if any) gets the gated error, not a crash

## 4. Whisper

- [ ] Feed loads; like toggles; comment count shows a real number
      (verifies the `d69e6ff` fix — no more `Error fetching comment count: {}`)
- [ ] Create a whisper → appears with an anon label; no identity leak in the DOM
- [ ] Delete own whisper works; report submits

## 5. Study

- [ ] UAES account: "CSC 104" resource is visible (closes the 4E-1 question)
- [ ] UNN account: sees UNN resources only (empty state is correct if none)
- [ ] Open + download a resource → signed URL works; download counter
      increments only on download
- [ ] Bookmark + enroll in a course; both persist after refresh
- [ ] Upload a resource (PDF/Word/PPT/txt ≤ 50MB) → appears immediately
      (moderation defaults to active); "My uploads" lists it; delete works
- [ ] Upload rejection: oversized or wrong-type file shows a clean error
- [ ] Tribes: create, join, leave; posts visible to members; own post shows
      delete, others' don't
- [ ] AI Tutor: ask a question → answer renders; empty question doesn't submit

## 6. Notifications

- [ ] Bell shows unread count after activity from the other account
      (allow up to 60s — polling by design, not realtime)
- [ ] Mark read / mark all read works
- [ ] Clicking a legacy-route notification lands on the right internal page,
      never a dead `.html` link
- [ ] Enable device push → no error; disable → clean

## 7. Admin console (super_admin account)

- [ ] Non-admin account visiting `/admin` → "Admin access required" panel
- [ ] Overview: live tiles + counts; refresh button works
- [ ] Users: search finds the other account; verify/unverify/suspend/unsuspend
      round-trip on a disposable account; restrictions save
- [ ] Content: each tab loads; hide → verify hidden on the student side; restore
- [ ] Reports: submit a report from a student account, dismiss it here
- [ ] Schools: table lists UNN + UAES; campus-admin assign doesn't error
- [ ] Settings: toggle a flag off → feature gated on the student side; toggle
      back. Lockdown toggle — test with care; it flips ALL flags
- [ ] Verification: schools list; CSV import of 2-3 dummy rows →
      processed/inserted counts shown

## 8. Cross-account security spot-checks

- [ ] UAES account cannot open a UNN resource (signed-URL attempt → 403)
- [ ] No other user's IDs visible in the DOM/network payloads anywhere
- [ ] A suspended account (via admin) is blocked server-side from gated actions

## Sign-off

- [ ] All items pass → Phase 4 reviewed and agreed; Phase 5 design audit begins
- [ ] Failures recorded with exact console/network errors for triage
