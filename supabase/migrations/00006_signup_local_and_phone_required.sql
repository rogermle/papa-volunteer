-- Local to event flag; phone remains optional in DB (enforced in app)
alter table public.event_signups
  add column if not exists is_local boolean;

comment on column public.event_signups.is_local is 'Whether the volunteer is local to the event location';
