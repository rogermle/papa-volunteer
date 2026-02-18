import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONE_LABELS } from '@/lib/types/database'
import type { Timezone } from '@/lib/types/database'

function profileName(s: { profiles: unknown }): string | null {
  const p = s.profiles
  if (p && typeof p === 'object' && 'discord_username' in p) return (p as { discord_username: string | null }).discord_username
  return null
}

export default async function EventSignupsPage({ params }: { params: Promise<{ id: string }> }) {
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
    .select(`
      id, user_id, waitlist_position, created_at,
      profiles:user_id ( discord_username )
    `)
    .eq('event_id', id)
    .order('waitlist_position', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  const confirmed = signups?.filter((s) => s.waitlist_position == null) ?? []
  const waitlist = signups?.filter((s) => s.waitlist_position != null) ?? []
  const tz = TIMEZONE_LABELS[event.timezone as Timezone] ?? event.timezone

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/events" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Back to events
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Signups: {event.title}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        {event.start_date} – {event.end_date} · {tz} · {confirmed.length} / {event.capacity} · {waitlist.length} waitlist
      </p>
      <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="p-3 font-medium text-zinc-900 dark:text-zinc-100">#</th>
              <th className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Volunteer</th>
              <th className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Status</th>
              <th className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {confirmed.map((s, i) => (
              <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="p-3 text-zinc-500">{i + 1}</td>
                <td className="p-3">{profileName(s) ?? s.user_id}</td>
                <td className="p-3">Confirmed</td>
                <td className="p-3 text-zinc-500">{new Date(s.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {waitlist.map((s) => (
              <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="p-3 text-zinc-500">—</td>
                <td className="p-3">{profileName(s) ?? s.user_id}</td>
                <td className="p-3 text-amber-600 dark:text-amber-400">Waitlist #{s.waitlist_position}</td>
                <td className="p-3 text-zinc-500">{new Date(s.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!signups?.length && (
          <p className="p-4 text-zinc-500 dark:text-zinc-500">No signups yet.</p>
        )}
      </div>
    </div>
  )
}
