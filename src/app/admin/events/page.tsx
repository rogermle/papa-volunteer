import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'
import { setEventArchived } from '@/app/actions/events'
import { ArchiveEventButton, UnarchiveEventButton } from '@/app/admin/events/ArchiveButtons'

const today = () => new Date().toISOString().slice(0, 10)

function EventRow({
  event,
  counts,
  formatDate,
  tz,
  archiveAction,
}: {
  event: { id: string; title: string; start_date: string; end_date: string; timezone: string; capacity: number }
  counts: { confirmed: number; waitlist: number }
  formatDate: (d: string) => string
  tz: string
  archiveAction: 'archive' | 'unarchive'
}) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-papa-border bg-papa-card px-4 py-3 shadow-sm">
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
      <div className="flex items-center gap-2">
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
        {archiveAction === 'archive' ? (
          <ArchiveEventButton eventId={event.id} />
        ) : (
          <UnarchiveEventButton eventId={event.id} />
        )}
      </div>
    </li>
  )
}

export default async function AdminEventsPage() {
  const supabase = await createClient()
  const todayStr = today()

  const [
    { data: upcomingEvents },
    { data: archivedEvents },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, start_date, end_date, timezone, capacity')
      .gte('end_date', todayStr)
      .eq('archived', false)
      .order('start_date', { ascending: true }),
    supabase
      .from('events')
      .select('id, title, start_date, end_date, timezone, capacity')
      .eq('archived', true)
      .order('start_date', { ascending: false }),
  ])

  const eventIds = [...(upcomingEvents ?? []).map((e) => e.id), ...(archivedEvents ?? []).map((e) => e.id)]
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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Admin – Events
      </h1>

      <section>
        <h2 className="mb-2 text-base font-medium text-foreground">Upcoming</h2>
        {!upcomingEvents?.length ? (
          <p className="text-papa-muted">No upcoming events. Create one or unarchive an event.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(upcomingEvents ?? []).map((event) => {
              const counts = countByEvent[event.id] ?? { confirmed: 0, waitlist: 0 }
              const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone
              return (
                <EventRow
                  key={event.id}
                  event={event}
                  counts={counts}
                  formatDate={formatDate}
                  tz={tz}
                  archiveAction="archive"
                />
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-base font-medium text-papa-muted">Archived</h2>
        {!archivedEvents?.length ? (
          <p className="text-sm text-papa-muted">No archived events.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(archivedEvents ?? []).map((event) => {
              const counts = countByEvent[event.id] ?? { confirmed: 0, waitlist: 0 }
              const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone
              return (
                <EventRow
                  key={event.id}
                  event={event}
                  counts={counts}
                  formatDate={formatDate}
                  tz={tz}
                  archiveAction="unarchive"
                />
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
