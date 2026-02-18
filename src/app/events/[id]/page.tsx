import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS, formatTimeLocal } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'
import { EventActionBanner } from './EventActionBanner'
import { EventSignupButtons } from './EventSignupButtons'

export const dynamic = 'force-dynamic'

function profileName(profiles: unknown): string | null {
  if (profiles && typeof profiles === 'object' && 'discord_username' in profiles)
    return (profiles as { discord_username: string | null }).discord_username
  return null
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  noStore()
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: signups } = await supabase
    .from('event_signups')
    .select(`
      id, user_id, waitlist_position, volunteer_status, phone, is_local, flight_voucher_requested, availability_notes, travel_notes, created_at,
      profiles:user_id ( discord_username )
    `)
    .eq('event_id', id)
    .order('waitlist_position', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  type SignupRow = NonNullable<typeof signups> extends (infer R)[] ? R : never
  let mySignup: SignupRow | null = null
  if (user) {
    const mine = signups?.find((s) => String(s.user_id).toLowerCase() === String(user.id).toLowerCase())
    if (mine) {
      mySignup = mine
    } else {
      const { data: direct } = await supabase
        .from('event_signups')
        .select('id, user_id, waitlist_position, volunteer_status, phone, is_local, flight_voucher_requested, availability_notes, travel_notes, created_at')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (direct) {
        mySignup = { ...direct, profiles: null } as unknown as SignupRow
      }
    }
  }

  const signupsForList = (() => {
    const list = signups ?? []
    if (!mySignup) return list
    const alreadyInList = list.some((s) => String(s.user_id).toLowerCase() === String(mySignup!.user_id).toLowerCase())
    if (alreadyInList) return list
    return [mySignup, ...list]
  })()

  const confirmed = signupsForList.filter((s) => s.waitlist_position == null)
  const waitlist = signupsForList.filter((s) => s.waitlist_position != null)
  const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone

  const formatDate = (d: string) => new Date(d + 'Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = [formatTimeLocal(event.start_time), formatTimeLocal(event.end_time)].filter(Boolean).join(' – ') || null

  return (
    <div className="flex flex-col gap-6">
      <Link href="/events" className="text-sm text-papa-muted hover:text-papa-navy hover:underline">
        ← Back to events
      </Link>
      <Suspense fallback={null}>
        <EventActionBanner />
      </Suspense>
      <div className="overflow-hidden rounded-xl border border-papa-border bg-papa-card shadow-sm">
        {event.image_url ? (
          <div className="aspect-[21/9] w-full shrink-0 overflow-hidden bg-papa-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[21/9] w-full items-center justify-center bg-papa-muted/20 text-papa-muted/60">
            <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="p-6">
        <h1 className="text-xl font-semibold text-foreground">{event.title}</h1>
        <div className="mt-2 text-sm text-papa-muted">
          {formatDate(event.start_date)}
          {event.start_date !== event.end_date && ` – ${formatDate(event.end_date)}`}
          {timeStr && ` · ${timeStr} ${tz}`}
        </div>
        {event.location && (
          <p className="mt-1 text-sm text-papa-muted">Location: {event.location}</p>
        )}
        {event.external_link && (
          <a
            href={event.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-papa-accent hover:underline"
          >
            Event details / Register →
          </a>
        )}
        {event.description && (
          <div className="mt-4 whitespace-pre-wrap text-sm text-foreground">
            {event.description}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <EventSignupButtons
            eventId={event.id}
            capacity={event.capacity}
            confirmedCount={confirmed.length}
            mySignup={mySignup ? {
              waitlist_position: mySignup.waitlist_position,
              volunteer_status: mySignup.volunteer_status ?? null,
              phone: mySignup.phone ?? null,
              is_local: mySignup.is_local ?? null,
              flight_voucher_requested: mySignup.flight_voucher_requested ?? null,
              availability_notes: mySignup.availability_notes ?? null,
              travel_notes: mySignup.travel_notes ?? null,
            } : null}
            isLoggedIn={!!user}
          />
        </div>
        </div>
      </div>
      <div className="rounded-xl border border-papa-border bg-papa-card p-6 shadow-sm">
        <h2 className="font-medium text-foreground">
          Volunteers ({confirmed.length} / {event.capacity})
          {waitlist.length > 0 && ` · ${waitlist.length} on waitlist`}
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {confirmed.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className="text-papa-muted">{i + 1}.</span>
              {profileName(s.profiles) ?? 'Volunteer'}
              {s.user_id === user?.id && (
                <span className="rounded bg-papa-navy/10 px-1.5 py-0.5 text-xs text-papa-navy">You</span>
              )}
            </li>
          ))}
          {waitlist.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-papa-muted">
              <span>Waitlist #{s.waitlist_position}</span>
              {profileName(s.profiles) ?? 'Volunteer'}
              {s.user_id === user?.id && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                  You
                </span>
              )}
            </li>
          ))}
          {signups?.length === 0 && (
            <li className="text-papa-muted">No signups yet.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
