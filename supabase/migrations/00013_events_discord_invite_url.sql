-- Optional Discord channel invite URL per event (shown to confirmed volunteers until event end).
alter table public.events
  add column if not exists discord_invite_url text;

comment on column public.events.discord_invite_url is 'Discord channel invite link; shown to confirmed (non-waitlist) volunteers until event end_date';
