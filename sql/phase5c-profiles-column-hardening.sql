-- Phase 5C privacy hardening (X3) — hide internal admin columns from clients
-- Date: Sept 29 2026. Owner-approved via "go ahead" on the 5C audit findings.
--
-- Context (live-verified before this change):
--  * profiles had a FULL table-level grant to `authenticated`, so every
--    student client could read admin_note, account_status, wallet_balance
--    on ALL rows via direct table queries (RLS policy qual:true).
--  * whisper_posts / whisper_comments were found ALREADY column-hardened:
--    `authenticated` has SELECT only on safe columns; author_id and
--    moderation_status were never granted to clients (X1/X2 false alarms).
--  * sync_profile_from_auth + guard_profile_client_mutation are
--    SECURITY DEFINER owned by postgres → unaffected.
--  * All client profile reads (legacy dashboard.html + new UI) use explicit
--    safe column lists; account_status/admin_note appear NOWHERE in either
--    UI (verified by grep).
--  * wallet_balance is KEPT readable: the live legacy dashboard displays
--    the user's own balance (12 references). Accepted residual until
--    legacy retirement/cutover. Revisit then.
--
-- Rollback: grant select on public.profiles to authenticated;

revoke select on public.profiles from authenticated;

grant select (
  id, full_name, avatar_url, university, reputation_stars, bio,
  wallet_balance, is_verified, department, level, interests, badges,
  onboarding_completed, student_verified
) on public.profiles to authenticated;
