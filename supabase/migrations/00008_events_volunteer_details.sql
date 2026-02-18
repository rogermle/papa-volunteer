-- Info for signed-up volunteers only: schedule, room, venue, shipping, meals, etc.
-- Update whenever the event coordinator sends new details.
alter table public.events
  add column if not exists volunteer_details text;

comment on column public.events.volunteer_details is 'Schedule, room, venue, and other info visible only to signed-up volunteers; paste from coordinator emails and update as needed.';
