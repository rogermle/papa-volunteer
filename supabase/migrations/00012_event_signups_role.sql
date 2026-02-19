-- Event role per signup: Volunteer, Lead Volunteer, Photographer
alter table public.event_signups
  add column if not exists role text;

alter table public.event_signups
  add constraint event_signups_role_check check (
    role is null or role in ('Volunteer', 'Lead Volunteer', 'Photographer')
  );

comment on column public.event_signups.role is 'Event role: Volunteer, Lead Volunteer, or Photographer';
