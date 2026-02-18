-- Whether the volunteer is requesting a flight voucher for this event
alter table public.event_signups
  add column if not exists flight_voucher_requested boolean;

comment on column public.event_signups.flight_voucher_requested is 'Whether the volunteer is requesting a flight voucher for this event';
