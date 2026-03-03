-- Whether the volunteer has been contacted about their flight voucher request
alter table public.event_signups
  add column if not exists flight_voucher_contacted boolean;

comment on column public.event_signups.flight_voucher_contacted is 'Whether the volunteer has been contacted about their flight voucher request (null = not set, true = contacted, false = not contacted)';
