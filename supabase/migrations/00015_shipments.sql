-- Shipments: track USPS (and future carrier) packages, admin-managed
create table public.shipments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete set null,
  to_signup_id uuid references public.event_signups(id) on delete set null,
  from_profile_id uuid references public.profiles(id) on delete set null,
  carrier text not null,
  tracking_number text not null,
  status text,
  status_raw jsonb,
  expected_delivery_date date,
  last_checked_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shipments is 'Packages shipped between volunteers/admins; admin-managed tracking information.';
comment on column public.shipments.event_id is 'Optional event this shipment is associated with.';
comment on column public.shipments.to_signup_id is 'Recipient volunteer signup (often a Lead Volunteer for the event).';
comment on column public.shipments.from_profile_id is 'Profile of the sender (volunteer/admin).';
comment on column public.shipments.carrier is 'Shipping carrier, e.g. USPS.';
comment on column public.shipments.tracking_number is 'Carrier-provided tracking number.';
comment on column public.shipments.status is 'Normalized shipment status label (e.g. In Transit, Delivered).';
comment on column public.shipments.status_raw is 'Raw carrier response payload for debugging/future parsing.';

-- Indexes & constraints
create unique index shipments_tracking_number_key on public.shipments(tracking_number);
create index shipments_event_id_idx on public.shipments(event_id);
create index shipments_to_signup_id_idx on public.shipments(to_signup_id);
create index shipments_status_idx on public.shipments(status);

-- RLS: admin-only for V1
alter table public.shipments enable row level security;

create policy "Admins can manage shipments"
  on public.shipments for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Reuse updated_at trigger helper
create trigger shipments_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

