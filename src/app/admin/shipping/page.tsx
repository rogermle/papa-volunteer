import { createClient } from '@/lib/supabase/server'
import { createShipment, refreshShipment } from '@/app/actions/shipping'
import type { Shipment } from '@/lib/types/database'

export default async function AdminShippingPage() {
  const supabase = await createClient()

  const { data: shipments } = await supabase
    .from('shipments')
    .select(
      'id, event_id, to_signup_id, from_profile_id, carrier, tracking_number, status, expected_delivery_date, last_checked_at, delivered_at, notes, created_at',
    )
    .order('created_at', { ascending: false })

  const shipmentRows = (shipments ?? []) as Shipment[]

  const eventIds = Array.from(new Set(shipmentRows.map((s) => s.event_id).filter(Boolean))) as string[]
  const fromProfileIds = Array.from(
    new Set(shipmentRows.map((s) => s.from_profile_id).filter(Boolean)),
  ) as string[]

  const [{ data: events }, { data: profiles }] = await Promise.all([
    eventIds.length
      ? supabase.from('events').select('id, title').in('id', eventIds)
      : Promise.resolve({ data: [] as any[] }),
    fromProfileIds.length
      ? supabase.from('profiles').select('id, display_name, discord_username').in('id', fromProfileIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const eventById = new Map((events ?? []).map((e) => [e.id as string, e]))
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Admin – Shipping</h1>

      <section className="rounded-xl border border-papa-border bg-papa-card p-4 shadow-sm">
        <h2 className="mb-2 text-base font-medium text-foreground">Add shipment</h2>
        <p className="mb-4 text-sm text-papa-muted">
          Track a USPS package being sent between volunteers. Event and notes are optional.
        </p>
        <form action={createShipment} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label htmlFor="tracking_number" className="text-xs font-medium text-papa-muted">
              Tracking number
            </label>
            <input
              id="tracking_number"
              name="tracking_number"
              required
              className="h-9 rounded-md border border-papa-border bg-background px-2 text-sm"
              placeholder="USPS tracking number"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="carrier" className="text-xs font-medium text-papa-muted">
              Carrier
            </label>
            <select
              id="carrier"
              name="carrier"
              defaultValue="USPS"
              className="h-9 rounded-md border border-papa-border bg-background px-2 text-sm"
            >
              <option value="USPS">USPS</option>
            </select>
          </div>
          <div className="flex flex-col min-w-[180px]">
            <label htmlFor="event_id" className="text-xs font-medium text-papa-muted">
              Event (optional)
            </label>
            <input
              id="event_id"
              name="event_id"
              className="h-9 rounded-md border border-papa-border bg-background px-2 text-sm"
              placeholder="Event ID (UUID)"
            />
          </div>
          <div className="flex flex-1 flex-col min-w-[200px]">
            <label htmlFor="notes" className="text-xs font-medium text-papa-muted">
              Notes (optional)
            </label>
            <input
              id="notes"
              name="notes"
              className="h-9 rounded-md border border-papa-border bg-background px-2 text-sm"
              placeholder="What is in the package, who it is for, etc."
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-papa-navy px-3 text-sm font-medium text-white hover:bg-papa-navy/90"
          >
            Save shipment
          </button>
        </form>
      </section>

      <div className="overflow-x-auto rounded-xl border border-papa-border bg-papa-card shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-papa-border">
              <th className="p-3 font-medium text-foreground">Event</th>
              <th className="p-3 font-medium text-foreground">From</th>
              <th className="p-3 font-medium text-foreground">Carrier</th>
              <th className="p-3 font-medium text-foreground">Tracking</th>
              <th className="p-3 font-medium text-foreground">Status</th>
              <th className="p-3 font-medium text-foreground">Expected</th>
              <th className="p-3 font-medium text-foreground">Last checked</th>
              <th className="p-3 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipmentRows.map((s) => {
              const event = s.event_id ? eventById.get(s.event_id) : null
              const fromProfile = s.from_profile_id ? profileById.get(s.from_profile_id) : null
              const fromName =
                (fromProfile?.display_name as string | null) ||
                (fromProfile?.discord_username as string | null) ||
                '—'

              return (
                <tr key={s.id} className="border-b border-papa-border">
                  <td className="max-w-[200px] p-3">
                    {event ? (
                      <span className="block truncate" title={event.title as string}>
                        {event.title as string}
                      </span>
                    ) : (
                      <span className="text-papa-muted">—</span>
                    )}
                  </td>
                  <td className="p-3 text-papa-muted">{fromName}</td>
                  <td className="p-3 text-papa-muted">{s.carrier}</td>
                  <td className="p-3 font-mono text-xs text-papa-muted">{s.tracking_number}</td>
                  <td className="p-3 text-papa-muted">{s.status ?? '—'}</td>
                  <td className="p-3 text-papa-muted">
                    {s.expected_delivery_date ? new Date(s.expected_delivery_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3 text-papa-muted">
                    {s.last_checked_at ? new Date(s.last_checked_at).toLocaleString() : '—'}
                  </td>
                  <td className="p-3">
                    <form action={refreshShipment} className="inline">
                      <input type="hidden" name="shipment_id" value={s.id} />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center rounded-md border border-papa-border bg-background px-2 text-xs font-medium text-papa-muted hover:text-papa-navy"
                      >
                        Refresh
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {!shipmentRows.length && (
              <tr>
                <td className="p-4 text-papa-muted" colSpan={8}>
                  No shipments yet. Add a tracking number above to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

