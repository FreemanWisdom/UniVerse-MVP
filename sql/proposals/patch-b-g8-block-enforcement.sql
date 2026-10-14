-- ============================================================================
-- PATCH B (G8): Enforce message blocking across users
-- Status: PROPOSAL — REVIEW ONLY. DO NOT APPLY TO PRODUCTION WITHOUT APPROVAL.
-- Repo: my-new-feature @ 7ed4b1f · Prepared Oct 14 2026
-- ----------------------------------------------------------------------------
-- BUG (verified live Oct 13 2026, fixture regression DM-3b):
--   The messages INSERT policy checks the `blocks` table directly:
--       NOT EXISTS (SELECT 1 FROM blocks b JOIN conversation_members cm ...)
--   Under RLS, that subquery runs as the sender, and the `blocks` policy
--   ("users manage their own blocks": blocker_id = auth.uid()) hides the
--   OTHER party's block rows. Result: a user who has been blocked (or who
--   blocked the recipient) can still send messages. Blocking is decorative.
--
-- FIX (smallest, no data exposure):
--   A SECURITY DEFINER existence helper that only answers for pairs
--   involving the caller, plus a policy that uses it. No block rows are
--   ever exposed; callers cannot use it to probe other users' block
--   relationships (it raises unless auth.uid() is one of the two inputs).
--
-- Preflight assertions (run BEFORE applying; abort if any fails):
--   P-1  policy exists exactly once:
--        select count(*) from pg_policies
--        where schemaname='public' and tablename='messages'
--          and policyname='members can send messages, not to blocked/blocking users';
--        -- expect 1
--   P-2  helper does not already exist:
--        select count(*) from pg_proc p join pg_namespace n on p.pronamespace=n.oid
--        where n.nspname='public' and p.proname='blocks_pair_blocked';
--        -- expect 0
--   P-3  blocks RLS enabled and policy is blocker_id = auth.uid():
--        select relrowsecurity from pg_class c join pg_namespace n on c.relnamespace=n.oid
--        where n.nspname='public' and c.relname='blocks';   -- expect true
--
-- ============================================================================

begin;  -- atomic swap per release-package recommendation (no deny window between policy drop/create)

-- Step 1: helper function (SECURITY DEFINER, caller-scoped, boolean only)
create or replace function public.blocks_pair_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public', 'pg_catalog'
as $$
begin
  -- The caller must be one of the two users, so this cannot be used as an
  -- oracle for other people's block relationships.
  if auth.uid() is distinct from p_user_a and auth.uid() is distinct from p_user_b then
    raise exception 'invalid_block_query';
  end if;
  return exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
end;
$$;

comment on function public.blocks_pair_blocked(uuid, uuid) is
  'G8 fix: caller-scoped existence check for blocks, used by the messages INSERT policy';

-- Step 2: execute only for authenticated clients (revoke PUBLIC default)
revoke all on function public.blocks_pair_blocked(uuid, uuid) from public;
revoke all on function public.blocks_pair_blocked(uuid, uuid) from anon;
grant execute on function public.blocks_pair_blocked(uuid, uuid) to authenticated;

-- Step 3: swap the messages INSERT policy (same name, block check via helper)
drop policy "members can send messages, not to blocked/blocking users" on public.messages;

create policy "members can send messages, not to blocked/blocking users"
on public.messages
for insert to authenticated
with check (
  (sender_id = auth.uid())
  and admin.user_allowed(auth.uid(), 'message')
  and conversation_id in (
    select cm.conversation_id from public.conversation_members cm
    where cm.user_id = auth.uid())
  and not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id <> auth.uid()
      and public.blocks_pair_blocked(auth.uid(), cm.user_id))
);

commit;

-- ============================================================================
-- Post-migration verification (read-only, run AFTER applying):
--   V-1 (positive) as a member with no blocks: INSERT succeeds.
--   V-2 (blocked sender) other party has a block row: INSERT fails with
--       "new row violates row-level security policy".
--   V-3 (blocking sender) sender holds the block row: INSERT fails likewise.
--   V-4 (read path unchanged) members can still read their conversation.
--   V-5 (helper abuse) calling blocks_pair_blocked(uuid, uuid) for two
--       unrelated users raises invalid_block_query.
--   V-6 (anon) calling the helper as anon: permission denied.
-- Regression risk notes:
--   * Performance: the helper runs once per OTHER member of the target
--     conversation (conversations are 2-member today; tribes use a
--     separate table). Cost is a single indexed lookup per member.
--   * audit/log triggers on messages are untouched.
-- ============================================================================
