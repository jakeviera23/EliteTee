-- Allow notify-admin-safety (service role) to read/update admin_safety_alerts.
-- Authenticated clients already have select/update via 080; service_role lacked table grants
-- on this sandbox, causing Edge Function lookups to fail with permission denied.

grant select, update on table public.admin_safety_alerts to service_role;
