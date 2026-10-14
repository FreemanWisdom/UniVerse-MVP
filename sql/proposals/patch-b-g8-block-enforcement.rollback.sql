-- ============================================================================
-- PATCH B ROLLBACK (G8): restore pre-patch state exactly
-- Run only if patch-b-g8-block-enforcement.sql was applied.
-- Independently reversible: does not depend on any other patch.
-- ============================================================================

begin;  -- atomic swap

-- 1. restore the ORIGINAL messages INSERT policy (verbatim from live catalog,
--    captured Oct 14 2026 before the patch)
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
    select 1 from (
      public.blocks b
      join public.conversation_members cm
        on cm.conversation_id = messages.conversation_id)
    where cm.user_id <> auth.uid()
      and (
        (b.blocker_id = auth.uid() and b.blocked_id = cm.user_id)
        or
        (b.blocked_id = auth.uid() and b.blocker_id = cm.user_id)
      ))
);

-- 2. remove the helper and its grants
revoke execute on function public.blocks_pair_blocked(uuid, uuid) from authenticated;
drop function if exists public.blocks_pair_blocked(uuid, uuid);

commit;

-- Post-rollback verification:
--   R-1 select count(*) from pg_proc p join pg_namespace n on p.pronamespace=n.oid
--       where n.nspname='public' and p.proname='blocks_pair_blocked';  -- expect 0
--   R-2 policy text matches the original with_check:
--       select with_check from pg_policies where schemaname='public'
--       and tablename='messages' and cmd='INSERT';
--       -- expect the verbatim original expression above
