-- Structured volunteer schedule: day, time, event, room, notes per row.
-- Rendered as a table for quick scan; use volunteer_details for full coordinator email.
alter table public.events
  add column if not exists volunteer_schedule jsonb not null default '[]';

comment on column public.events.volunteer_schedule is 'Array of { day, time, event, room, notes? } for volunteer schedule table; e.g. [{"day":"Fri","time":"0800-1200","event":"Pilot Job Fair","room":"St. Petersburg 1&2","notes":""}]';
