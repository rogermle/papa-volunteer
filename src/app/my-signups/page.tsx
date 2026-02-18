import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS, formatTimeLocal } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'
import { CancelSignupButton } from './CancelSignupButton'

export default async function MySignupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/my-signups')

  const { data: signups } = await supabase
    .from('event_signups')
    .select(`
      id, event_id, waitlist_position, created_at,
      events ( id, title, start_date, end_date, start_time, end_time, timezone, location )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const formatDate = (d: string) => new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const formatRange = (start: string, end: string) =>
    start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">
        My signups
      </h1>
      <p className="text-sm text-papa-muted">
        Events you’re signed up for. Click an event for details or cancel your registration below.
      </p>
      {!signups?.length ? (
        <div className="rounded-xl border border-papa-border bg-papa-card p-6 text-center text-papa-muted">
          <p>You’re not signed up for any events yet.</p>
          <Link href="/events" className="mt-2 inline-block text-sm text-papa-accent hover:underline">
            Browse events →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {signups.map((s) => {
            const raw = s.events
            const event = Array.isArray(raw) ? raw[0] : raw
            if (!event || typeof event !== 'object') return null
            const ev = event as { id: string; title: string; start_date: string; end_date: string; start_time: string | null; end_time: string | null; timezone: string; location: string | null }
            const tz = TIMEZONE_LABELS[ev.timezone as Timezone] ?? ev.timezone
            const timeStr = [formatTimeLocal(ev.start_time), formatTimeLocal(ev.end_time)].filter(Boolean).join(' – ') || null
            const onWaitlist = s.waitlist_position != null
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-papa-border bg-papa-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/events/${ev.id}`}
                    className="font-medium text-foreground hover:text-papa-accent hover:underline"
                  >
                    {ev.title}
                  </Link>
                  <div className="mt-1 text-sm text-papa-muted">
                    {formatRange(ev.start_date, ev.end_date)}
                    {timeStr && ` · ${timeStr} ${tz}`}
                    {ev.location && ` · ${ev.location}`}
                  </div>
                  {onWaitlist && (
                    <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      Waitlist #{s.waitlist_position}
                    </span>
                  )}
                </div>
                <CancelSignupButton eventId={ev.id} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
