-- ============================================================================
-- UniVerse ICOS — Super Admin invitation flow — ROLLBACK (PROPOSAL, NOT RUN)
-- ============================================================================
-- Exact inverse of sql/proposals/super-admin-invitations.sql.
-- WARNING: rolling back DELETES the invitations table. Any ACCEPTED
-- invitations must first be recorded elsewhere (their audit-log rows in
-- admin.audit_log are append-only and survive, but the membership grants
-- they produced must be reviewed manually — revoke via admin_grant_role or
-- delete the admin.members rows if a granted admin is no longer wanted).
-- Run only if the feature must be withdrawn.
-- ============================================================================

begin;

drop function if exists public.admin_list_super_admin_invitations();
drop function if exists public.admin_accept_super_admin_invitation(text);
drop function if exists public.admin_revoke_super_admin_invitation(uuid);
drop function if exists public.admin_create_super_admin_invitation(text);
drop function if exists admin._invitation_rate_limit(uuid);
drop function if exists admin._is_active_super_admin(uuid);

drop table if exists admin.super_admin_invitations;

commit;

-- Note: audit rows written by the invitation RPCs are append-only and are
-- intentionally NOT removed. The rate_limit_counters bucket rows
-- ('create_invitation:<uid>') are inert without the helper function and can
-- be deleted manually if desired.
