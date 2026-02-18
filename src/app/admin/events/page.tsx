import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'

export default async function AdminEventsPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, title, start_date, end_date, timezone, capacity')
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-foreground">
        Admin – Events
      </h1>
      {!events?.length ? (
        <p className="text-papa-muted">No events. Create one to get started.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(events ?? []).map((event) => {
            const counts = countByEvent[event.id] ?? { confirmed: 0, waitlist: 0 }
            const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone
            return (
              <li key={event.id} className="flex items-center justify-between rounded-xl border border-papa-border bg-papa-card px-4 py-3 shadow-sm">
                <div>
                  <Link href={`/events/${event.id}`} className="font-medium text-foreground hover:text-papa-navy hover:underline">
                    {event.title}
                  </Link>
                  <div className="text-sm text-papa-muted">
                    {formatDate(event.start_date)}
                    {event.start_date !== event.end_date && ` – ${formatDate(event.end_date)}`} · {tz} · {counts.confirmed}/{event.capacity}
                    {counts.waitlist > 0 && ` · ${counts.waitlist} waitlist`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/events/${event.id}/signups`}
                    className="text-sm text-papa-muted hover:text-papa-navy hover:underline"
                  >
                    Signups
                  </Link>
                  <Link
                    href={`/admin/events/${event.id}/edit`}
                    className="text-sm text-papa-muted hover:text-papa-navy hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
