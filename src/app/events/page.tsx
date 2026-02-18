import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS, formatTimeLocal } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'

export default async function EventsListPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, title, start_date, end_date, start_time, end_time, timezone, location, capacity, image_url')
    .order('start_date', { ascending: true })

  const eventIds = (events ?? []).map((e) => e.id)
  const { data: signups } = eventIds.length
    ? await supabase
        .from('event_signups')
        .select('event_id, waitlist_position')
        .in('event_id', eventIds)
    : { data: [] }

  const countByEvent: Record<string, { confirmed: number; waitlist: number }> = {}
  eventIds.forEach((id) => {
    countByEvent[id] = { confirmed: 0, waitlist: 0 }
  })
  signups?.forEach((s) => {
    if (countByEvent[s.event_id]) {
      if (s.waitlist_position == null) countByEvent[s.event_id].confirmed++
      else countByEvent[s.event_id].waitlist++
    }
  })

  const formatDate = (d: string) => new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const formatRange = (start: string, end: string) =>
    start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`

  return (
    <div className="flex flex-col gap-0">
      {/* Hero: aviation - use img so external Unsplash image loads reliably */}
      <section className="relative -mx-4 h-[min(45vh,340px)] min-h-[240px] overflow-hidden md:-mx-6 lg:-mx-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1578645510392-dcb64b1c2372?w=1200&q=80"
          alt="Airplane cockpit"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-papa-navy/40" />
        <div className="absolute inset-0 flex flex-col justify-end px-4 pb-8 text-white">
          <h1 className="text-2xl font-bold drop-shadow-md md:text-3xl">
            Events you can sign up for
          </h1>
          <p className="mt-1 text-sm drop-shadow-md text-white/90 md:text-base">
            Click an event for details, then sign up to show interest.
          </p>
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-6">
        {!events?.length ? (
          <p className="text-papa-muted">No events yet. Check back later.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {(events ?? []).map((event) => {
              const counts = countByEvent[event.id] ?? { confirmed: 0, waitlist: 0 }
              const full = counts.confirmed >= event.capacity
              const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone
              const timeStr = [formatTimeLocal(event.start_time), formatTimeLocal(event.end_time)].filter(Boolean).join(' – ') || null
              return (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="block overflow-hidden rounded-xl border border-papa-border bg-papa-card shadow-sm transition hover:border-papa-navy/30 hover:shadow"
                  >
                    <div className="aspect-[21/10] w-full shrink-0 overflow-hidden bg-papa-muted/20">
                      {event.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={event.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-papa-muted/60">
                          <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="font-medium text-foreground">{event.title}</div>
                      <div className="mt-1 text-sm text-papa-muted">
                        {formatRange(event.start_date, event.end_date)}
                        {timeStr && ` · ${timeStr} ${tz}`}
                        {event.location && ` · ${event.location}`}
                      </div>
                      <div className="mt-2 text-sm text-papa-muted">
                        {counts.confirmed} / {event.capacity} volunteers
                        {counts.waitlist > 0 && ` · ${counts.waitlist} on waitlist`}
                        {full && (
                          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                            Full
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
