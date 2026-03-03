-- Hide old events from default lists; keep in DB for reporting
alter table public.events
  add column if not exists archived boolean not null default false;

comment on column public.events.archived is 'When true, event is excluded from default event lists (admin and public); data kept for reporting.';
