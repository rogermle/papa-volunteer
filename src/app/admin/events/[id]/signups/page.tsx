import { unstable_noStore as noStore } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

function profileDisplay(s: { profiles: unknown }): string {
  const p = s.profiles as { display_name?: string | null; discord_username?: string | null } | null
  if (!p) return '—'
  return (p.display_name || p.discord_username || '—') as string
}

function discordHandle(s: { profiles: unknown }): string {
  const p = s.profiles as { discord_username?: string | null } | null
  if (!p?.discord_username) return '—'
  return p.discord_username
}

export default async function EventSignupsPage({ params }: { params: Promise<{ id: string }> }) {
  noStore()
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?next=/admin/events/${id}/signups`)
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: signups } = await supabase
    .from('event_signups')
    .select('id, user_id, waitlist_position, volunteer_status, phone, is_local, flight_voucher_requested, availability_notes, travel_notes, created_at')
    .eq('event_id', id)
    .order('waitlist_position', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  const userIds = [...new Set((signups ?? []).map((s) => s.user_id))]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, discord_username, display_name').in('id', userIds)
    : { data: [] }
  const profileByUserId = new Map((profiles ?? []).map((p) => [p.id, p]))

  const signupsWithProfiles = (signups ?? []).map((s) => ({
    ...s,
    profiles: profileByUserId.get(s.user_id) ?? null,
  }))

  const confirmed = signupsWithProfiles.filter((s) => s.waitlist_position == null)
  const waitlist = signupsWithProfiles.filter((s) => s.waitlist_position != null)
  const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/events" className="text-sm text-papa-muted hover:text-papa-navy hover:underline">
        ← Back to events
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-foreground">
          Signups: {event.title}
        </h1>
        <Link
          href={`/events/${id}`}
          className="text-sm text-papa-muted hover:text-papa-navy hover:underline"
        >
          View event page →
        </Link>
      </div>
      <p className="text-sm text-papa-muted">
        {event.start_date} – {event.end_date} · {tz} · {confirmed.length} / {event.capacity} · {waitlist.length} waitlist
      </p>
      <div className="overflow-x-auto rounded-xl border border-papa-border bg-papa-card shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-papa-border">
              <th className="p-3 font-medium text-foreground">#</th>
              <th className="p-3 font-medium text-foreground">Volunteer</th>
              <th className="p-3 font-medium text-foreground">Discord</th>
              <th className="p-3 font-medium text-foreground">Vol. status</th>
              <th className="p-3 font-medium text-foreground">Phone</th>
              <th className="p-3 font-medium text-foreground">Local</th>
              <th className="p-3 font-medium text-foreground">Flight voucher</th>
              <th className="p-3 font-medium text-foreground">Availability</th>
              <th className="p-3 font-medium text-foreground">Travel</th>
              <th className="p-3 font-medium text-foreground">List</th>
              <th className="p-3 font-medium text-foreground">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {confirmed.map((s, i) => (
              <tr key={s.id} className="border-b border-papa-border">
                <td className="p-3 text-papa-muted">{i + 1}</td>
                <td className="p-3">{profileDisplay(s)}</td>
                <td className="p-3 font-mono text-sm text-papa-muted" title="Discord handle for contact">{discordHandle(s)}</td>
                <td className="p-3 text-papa-muted">{s.volunteer_status ?? '—'}</td>
                <td className="p-3 text-papa-muted">{s.phone ?? '—'}</td>
                <td className="p-3 text-papa-muted">{s.is_local === true ? 'Yes' : s.is_local === false ? 'No' : '—'}</td>
                <td className="p-3 text-papa-muted">{s.flight_voucher_requested === true ? 'Yes' : s.flight_voucher_requested === false ? 'No' : '—'}</td>
                <td className="max-w-[160px] p-3 text-papa-muted" title={s.availability_notes ?? ''}>
                  {(s.availability_notes ?? '—').slice(0, 40)}
                  {(s.availability_notes?.length ?? 0) > 40 ? '…' : ''}
                </td>
                <td className="max-w-[120px] p-3 text-papa-muted" title={s.travel_notes ?? ''}>
                  {(s.travel_notes ?? '—').slice(0, 30)}
                  {(s.travel_notes?.length ?? 0) > 30 ? '…' : ''}
                </td>
                <td className="p-3">Confirmed</td>
                <td className="p-3 text-papa-muted">{new Date(s.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {waitlist.map((s) => (
              <tr key={s.id} className="border-b border-papa-border">
                <td className="p-3 text-papa-muted">—</td>
                <td className="p-3">{profileDisplay(s)}</td>
                <td className="p-3 font-mono text-sm text-papa-muted" title="Discord handle for contact">{discordHandle(s)}</td>
                <td className="p-3 text-papa-muted">{s.volunteer_status ?? '—'}</td>
                <td className="p-3 text-papa-muted">{s.phone ?? '—'}</td>
                <td className="p-3 text-papa-muted">{s.is_local === true ? 'Yes' : s.is_local === false ? 'No' : '—'}</td>
                <td className="p-3 text-papa-muted">{s.flight_voucher_requested === true ? 'Yes' : s.flight_voucher_requested === false ? 'No' : '—'}</td>
                <td className="max-w-[160px] p-3 text-papa-muted" title={s.availability_notes ?? ''}>
                  {(s.availability_notes ?? '—').slice(0, 40)}
                  {(s.availability_notes?.length ?? 0) > 40 ? '…' : ''}
                </td>
                <td className="max-w-[120px] p-3 text-papa-muted" title={s.travel_notes ?? ''}>
                  {(s.travel_notes ?? '—').slice(0, 30)}
                  {(s.travel_notes?.length ?? 0) > 30 ? '…' : ''}
                </td>
                <td className="p-3 text-amber-600">Waitlist #{s.waitlist_position}</td>
                <td className="p-3 text-papa-muted">{new Date(s.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!signupsWithProfiles.length && (
          <p className="p-4 text-papa-muted">No signups yet.</p>
        )}
      </div>
    </div>
  )
}
