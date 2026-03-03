import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateFlightVoucherContacted } from '@/app/actions/flight-vouchers'

type PageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string }
}

export default async function AdminFlightVouchersPage({ searchParams }: PageProps) {
  const paramsResolved =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {}
  const errorMessage =
    typeof paramsResolved?.error === 'string' ? paramsResolved.error : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/admin/flight-vouchers')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) redirect('/')

  const { data: signups } = await supabase
    .from('event_signups')
    .select(
      'id, event_id, user_id, phone, flight_voucher_contacted, created_at',
    )
    .eq('flight_voucher_requested', true)
    .order('created_at', { ascending: true })

  if (!signups?.length) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Flight vouchers
        </h1>
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            {errorMessage}
          </div>
        )}
        <p className="text-papa-muted">
          No volunteers have requested a flight voucher yet. When they do, they
          will appear here grouped by event (upcoming first).
        </p>
      </div>
    )
  }

  const eventIds = [...new Set(signups.map((s) => s.event_id))]
  const userIds = [...new Set(signups.map((s) => s.user_id))]

  const { data: events } = await supabase
    .from('events')
    .select('id, title, start_date')
    .in('id', eventIds)
    .eq('archived', false)
    .order('start_date', { ascending: true })

  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, discord_username')
          .in('id', userIds)
      : { data: [] }

  const eventById = new Map((events ?? []).map((e) => [e.id, e]))
  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        name: p.display_name || p.discord_username || '—',
        discord: p.discord_username ?? '—',
      },
    ]),
  )

  const signupsByEventId: Record<string, typeof signups> = {}
  for (const s of signups) {
    if (!signupsByEventId[s.event_id]) signupsByEventId[s.event_id] = []
    signupsByEventId[s.event_id].push(s)
  }

  const formatDate = (d: string) =>
    new Date(d + 'Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-foreground">
        Flight vouchers
      </h1>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <span>{errorMessage}</span>
          <Link
            href="/admin/flight-vouchers"
            className="shrink-0 font-medium underline hover:no-underline"
          >
            Dismiss
          </Link>
        </div>
      )}

      <section className="rounded-xl border border-papa-border bg-papa-card shadow-sm">
        <div className="border-b border-papa-border px-4 py-3">
          <h2 className="text-base font-medium text-foreground">
            Volunteers requesting a flight voucher (by event, upcoming first)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-papa-border bg-papa-border/40">
                <th className="px-4 py-3 font-medium text-foreground">Event</th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Volunteer
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Contact
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Contacted
                </th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).map((event) => {
                const rows = signupsByEventId[event.id] ?? []
                return rows.map((s) => {
                  const p = profileById.get(s.user_id)
                  const name = p?.name ?? '—'
                  const contactParts = [
                    s.phone ? `Phone: ${s.phone}` : null,
                    p?.discord && p.discord !== '—' ? `Discord: ${p.discord}` : null,
                  ].filter(Boolean)
                  const contact = contactParts.length
                    ? contactParts.join(' · ')
                    : '—'
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-papa-border transition-colors hover:bg-papa-border/20"
                    >
                      <td className="max-w-[220px] px-4 py-3">
                        <span className="block truncate" title={event.title}>
                          {event.title}
                        </span>
                        <span className="text-xs text-papa-muted">
                          {formatDate(event.start_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{name}</td>
                      <td className="max-w-[240px] px-4 py-3 text-papa-muted">
                        <span className="block truncate" title={contact}>
                          {contact}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-papa-muted">
                            {s.flight_voucher_contacted === true
                              ? 'Yes'
                              : s.flight_voucher_contacted === false
                                ? 'No'
                                : '—'}
                          </span>
                          <form
                            action={updateFlightVoucherContacted}
                            className="inline-flex gap-1"
                          >
                            <input
                              type="hidden"
                              name="signup_id"
                              value={s.id}
                            />
                            <input
                              type="hidden"
                              name="contacted"
                              value="true"
                            />
                            <button
                              type="submit"
                              className="rounded border border-papa-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-papa-border/30"
                            >
                              Yes
                            </button>
                          </form>
                          <form
                            action={updateFlightVoucherContacted}
                            className="inline-flex"
                          >
                            <input
                              type="hidden"
                              name="signup_id"
                              value={s.id}
                            />
                            <input
                              type="hidden"
                              name="contacted"
                              value="false"
                            />
                            <button
                              type="submit"
                              className="rounded border border-papa-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-papa-border/30"
                            >
                              No
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
