# UniVerse ICOS — Rebuild Roadmap (owner's master plan, Sept 29 2026)

Principles: Database-first • Security-first • Mobile-first • Scalable •
PWA now → Native mobile later.

> RULE: do not code the next phase until the current phase is designed,
> reviewed and agreed.

## Phase 0 — Discovery & Audit ✓
- Audit current Universe ✓
- Inventory every page and feature ✓
- Audit existing Supabase database ✓ (live-verified via management API)
- Identify existing functionality and data ✓
- Document what must be preserved ✓

## Phase 1 — Technical Architecture ✓
- Choose framework and stack ✓ (Next.js + TypeScript + Supabase)
- Define application structure ✓
- Define frontend/backend relationship ✓ (RLS + RPCs, no invented contracts)
- Define database architecture ✓
- Define Authentication, Storage, realtime ✓
- Define PWA Architecture & Deployment strategy ✓ (host: Vercel)

## Phase 2 — Database & Security ✓
- Schema, relationships, constraints, indexes, RLS ✓ (preserved legacy Supabase)
- Storage security ✓ (private buckets, campus-scoped)
- User roles and permissions ✓ (admin roster + guards)
- Audit logging ✓
- Protect existing data ✓ (existing backend/RLS preserved, not redesigned)

## Phase 3 — Application Foundations ✓
- Next.js + TypeScript + Supabase integration ✓
- Authentication, user sessions ✓
- App layout / navigation ✓
- Error / loading handling ✓
- Environment configuration ✓ (only .env.example ever committed)
- PWA foundation ✓

## Phase 4 — Core Universe Features ✓
Build feature by feature — Profile ✓, Orbit ✓, Chat ✓, Whisper ✓,
Study ✓ (resources, bookmarks, tribes, AI tutor), Notifications ✓,
Admin ✓ (14-page console), and more (market/hustles/lodges backend-ready).

## Phase 5 — Student Verification & Privacy ✓
- University verification ✓ (5A badge admin-granted, 5B school gating,
  verification methods/records designed in docs/phase5-verification-design.md)
- Sensitive-data separation ✓ (5C column hardening)
- Privacy controls ✓ • Data minimization ✓
- Moderation ✓ (5E loop incl. whisper removal)
- Abuse prevention ✓ • Rate limiting ✓ (5D write-path limits)

## Phase 6 — PWA & Mobile Experience (in progress)
- Web manifest ✓, service worker ✓ (5G, auto-registered)
- Install experience — installable since 5G; prompt UX REMAINING
- Offline strategy / caching — REMAINING (SW fetch handler deliberately inert)
- Push notifications ✓ real wiring (on-device check pending)
- Mobile-first optimization — responsive drawer done; audit pass REMAINING

## Phase 7 — Testing & Hardening (pending)
Auth/authz, RLS, file-upload, chat/realtime, whisper anonymity,
verification, mobile, PWA installation, performance, security.
Much verified ad hoc during 4–5; needs a consolidated matrix + gap sweep.

## Phase 8 — Deployment & Growth (cutover plan drafted)
- Local / staging / production environments (Vercel previews = staging)
- Database migrations (SQL records in sql/, applied live with approval)
- Production deployment (docs/cutover-plan.md)
- Closed student testing / bug fixing
- Public PWA launch
- Play Store / App Store later
- Native mobile client later
