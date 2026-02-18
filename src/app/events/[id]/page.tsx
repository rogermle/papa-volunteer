import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'
import { EventSignupButtons } from './EventSignupButtons'

function profileName(profiles: unknown): string | null {
  if (profiles && typeof profiles === 'object' && 'discord_username' in profiles)
    return (profiles as { discord_username: string | null }).discord_username
  return null
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: signups } = await supabase
    .from('event_signups')
    .select(`
      id, user_id, waitlist_position, created_at,
      profiles:user_id ( discord_username )
    `)
    .eq('event_id', id)
    .order('waitlist_position', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()
  const mySignup = user ? signups?.find((s) => s.user_id === user.id) : null

  const confirmed = signups?.filter((s) => s.waitlist_position == null) ?? []
  const waitlist = signups?.filter((s) => s.waitlist_position != null) ?? []
  const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone

  const formatDate = (d: string) => new Date(d + 'Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const formatTime = (t: string | null) =>
    t ? new Date(`1970-01-01T${t}Z`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null
  const timeStr = [formatTime(event.start_time), formatTime(event.end_time)].filter(Boolean).join(' – ') || null

  return (
    <div className="flex flex-col gap-6">
      <Link href="/calendar" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Back to calendar
      </Link>
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</h1>
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {formatDate(event.start_date)}
          {event.start_date !== event.end_date && ` – ${formatDate(event.end_date)}`}
          {timeStr && ` · ${timeStr} ${tz}`}
        </div>
        {event.location && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Location: {event.location}</p>
        )}
        {event.external_link && (
          <a
            href={event.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-[#5865F2] hover:underline"
          >
            Event details / Register →
          </a>
        )}
        {event.description && (
          <div className="mt-4 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {event.description}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <EventSignupButtons
            eventId={event.id}
            capacity={event.capacity}
            confirmedCount={confirmed.length}
            mySignup={mySignup ? { waitlist_position: mySignup.waitlist_position } : null}
          />
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
          Volunteers ({confirmed.length} / {event.capacity})
          {waitlist.length > 0 && ` · ${waitlist.length} on waitlist`}
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {confirmed.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className="text-zinc-500 dark:text-zinc-500">{i + 1}.</span>
              {profileName(s.profiles) ?? 'Volunteer'}
              {s.user_id === user?.id && (
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">You</span>
              )}
            </li>
          ))}
          {waitlist.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500">
              <span>Waitlist #{s.waitlist_position}</span>
              {profileName(s.profiles) ?? 'Volunteer'}
              {s.user_id === user?.id && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  You
                </span>
              )}
            </li>
          ))}
          {signups?.length === 0 && (
            <li className="text-zinc-500 dark:text-zinc-500">No signups yet.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
