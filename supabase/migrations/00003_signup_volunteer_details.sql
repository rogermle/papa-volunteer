-- Volunteer details per signup (from PAPA FAPA volunteer sign-up Excel)
alter table public.event_signups
  add column if not exists volunteer_status text,
  add column if not exists phone text,
  add column if not exists availability_notes text,
  add column if not exists travel_notes text;

comment on column public.event_signups.volunteer_status is 'e.g. student, CFI, job searching';
comment on column public.event_signups.availability_notes is 'When volunteer can staff the table; e.g. Times flexible, 9-11AM only';
comment on column public.event_signups.travel_notes is 'Arrival, departing, accommodations (free text)';
