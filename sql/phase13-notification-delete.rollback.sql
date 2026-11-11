-- Rollback for phase13-notification-delete.sql
drop policy if exists "users delete their own notifications" on public.notifications;
