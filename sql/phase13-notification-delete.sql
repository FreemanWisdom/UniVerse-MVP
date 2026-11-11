-- Phase 13: notifications are consumed on view (delete-on-open).
--
-- Product decision (owner): a notification the user has viewed should be
-- GONE, not archived. The feed listed everything forever; the inbox hides
-- read rows; this makes viewing destructive instead.
--
-- Table-level DELETE was already granted to authenticated/anon by the
-- default Supabase grants, but no RLS DELETE policy existed, so deletes
-- were silently blocked. This adds exactly one, scoped to the owner.
--
-- No other behavior changes: the INSERT trigger (message fan-out), the push
-- trigger, unread counts, and announcement read-state all keep working.
-- push_delivery_log has no FK to notifications, so receipts survive a
-- notification delete (diagnostics stay intact).

drop policy if exists "users delete their own notifications" on public.notifications;
create policy "users delete their own notifications"
  on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());
