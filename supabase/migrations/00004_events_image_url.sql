-- Optional photo per event (URL: Supabase Storage, Imgur, or any public image URL)
alter table public.events
  add column if not exists image_url text;

comment on column public.events.image_url is 'Optional hero/card image URL for the event';
