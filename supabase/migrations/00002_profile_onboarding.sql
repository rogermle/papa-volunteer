-- Optional profile fields and onboarding completion
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.display_name is 'Preferred display name (optional, falls back to discord_username)';
comment on column public.profiles.onboarding_completed_at is 'Set when user completes the post-login info flow';
