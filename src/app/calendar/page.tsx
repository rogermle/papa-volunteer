import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, title, start_date, end_date, start_time, end_time, timezone, location, capacity')
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
  const formatTime = (t: string | null) =>
    t ? new Date(`1970-01-01T${t}Z`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Event calendar
      </h1>
      {!events?.length ? (
        <p className="text-zinc-600 dark:text-zinc-400">No events yet. Check back later.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {(events ?? []).map((event) => {
            const counts = countByEvent[event.id] ?? { confirmed: 0, waitlist: 0 }
            const full = counts.confirmed >= event.capacity
            const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone
            const timeStr = [formatTime(event.start_time), formatTime(event.end_time)].filter(Boolean).join(' – ') || null
            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{event.title}</div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatRange(event.start_date, event.end_date)}
                    {timeStr && ` · ${timeStr} ${tz}`}
                    {event.location && ` · ${event.location}`}
                  </div>
                  <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                    {counts.confirmed} / {event.capacity} volunteers
                    {counts.waitlist > 0 && ` · ${counts.waitlist} on waitlist`}
                    {full && (
                      <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        Full
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
