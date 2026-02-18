-- Backfill profiles for any auth.users that don't have one (e.g. after DB reset or re-running migrations).
-- The trigger only runs on INSERT into auth.users, so existing users are left without a profile otherwise.
insert into public.profiles (id, discord_id, discord_username, avatar_url)
select
  id,
  raw_user_meta_data->>'provider_id',
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do update set
  discord_username = coalesce(public.profiles.discord_username, excluded.discord_username),
  avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
  updated_at = now();
