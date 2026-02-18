-- PAPA Volunteer app: profiles, events, signups (with waitlist)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor) or via Supabase CLI.

-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

-- Profiles: one per auth user (linked to Discord via auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text,
  discord_username text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Events (FAPA-style: title, dates, timezone, location, capacity, etc.)
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  timezone text not null check (timezone in ('America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles')),
  location text,
  description text,
  external_link text,
  capacity int not null check (capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Signups: volunteer + event; position for waitlist order (null = confirmed, 1-based = waitlist position)
create table public.event_signups (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  waitlist_position int, -- null = confirmed; 1, 2, 3... = position on waitlist
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

-- Indexes
create index events_start_date_idx on public.events(start_date);
create index event_signups_event_id_idx on public.event_signups(event_id);
create index event_signups_user_id_idx on public.event_signups(user_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_signups enable row level security;

-- Profiles: users can read all (for display names), update own
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Events: everyone can read; only admins can insert/update/delete
create policy "Events are viewable by everyone"
  on public.events for select using (true);

create policy "Admins can manage events"
  on public.events for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Signups: users can read signups for events; users can insert/delete own signup; admins can manage all
create policy "Signups are viewable by everyone"
  on public.event_signups for select using (true);

create policy "Users can sign up (insert own)"
  on public.event_signups for insert with check (auth.uid() = user_id);

create policy "Users can remove own signup"
  on public.event_signups for delete using (auth.uid() = user_id);

create policy "Admins can manage all signups"
  on public.event_signups for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Trigger: create profile on signup (auth.users insert)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, discord_id, discord_username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    discord_username = excluded.discord_username,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Optional: updated_at trigger for events
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
