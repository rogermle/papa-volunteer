-- Allow Hawaii-Aleutian (Pacific/Honolulu) as event timezone.
alter table public.events
  drop constraint if exists events_timezone_check;

alter table public.events
  add constraint events_timezone_check check (
    timezone in (
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Pacific/Honolulu'
    )
  );
