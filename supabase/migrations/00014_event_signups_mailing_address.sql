-- Lead Volunteer mailing address (only for role = 'Lead Volunteer'; only admins may see others' addresses)
alter table public.event_signups
  add column if not exists mailing_address text,
  add column if not exists mailing_address_lat double precision,
  add column if not exists mailing_address_lon double precision;

comment on column public.event_signups.mailing_address is 'Mailing address for Lead Volunteer; only admins may see other volunteers'' addresses';
comment on column public.event_signups.mailing_address_lat is 'Latitude from geocoding; used for map display';
comment on column public.event_signups.mailing_address_lon is 'Longitude from geocoding; used for map display';

-- Allow users to update their own signup (for edit-signup flow and address updates)
create policy "Users can update own signup"
  on public.event_signups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
