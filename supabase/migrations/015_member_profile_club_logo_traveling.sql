-- Member profile enhancements: club logo and traveling destination.

alter table public.member_profiles
  add column if not exists club_logo_url text;

alter table public.member_profiles
  add column if not exists traveling_to text not null default '';
