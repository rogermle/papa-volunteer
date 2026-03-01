import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  normalizeTrackingNumber,
  computeStatusFromShipmentAndEvents,
} from '@/lib/shipping/ship24'

/** Webhook payload: trackings array per Ship24 docs. */
type Ship24WebhookPayload = {
  trackings?: Array<{
    metadata?: { topic?: string }
    tracker?: { trackingNumber?: string; trackerId?: string }
    shipment?: Record<string, unknown>
    events?: Array<Record<string, unknown>>
  }>
}

/** Extract events array from stored status_raw (same shapes as API / webhook). */
function getEventsFromStatusRaw(raw: unknown): Array<Record<string, unknown>> {
  if (!raw || typeof raw !== 'object') return []
  const r = raw as Record<string, unknown>
  const data = r.data ?? r
  const d = data as Record<string, unknown>
  const list = d?.trackings ?? d?.trackers ?? (r.trackings as unknown[])
  const first = Array.isArray(list) && list.length > 0 ? list[0] : null
  if (first && typeof first === 'object') {
    const f = first as Record<string, unknown>
    const ev = f.events
    if (Array.isArray(ev)) return ev as Array<Record<string, unknown>>
  }
  const evs = d?.events
  if (Array.isArray(evs)) return evs as Array<Record<string, unknown>>
  return []
}

/** Merge new events into existing; dedupe by eventId, sort by occurrenceDatetime. */
function mergeEvents(
  existing: Array<Record<string, unknown>>,
  incoming: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const byId = new Set(
    existing.map((e) => (e.eventId as string) ?? '').filter(Boolean),
  )
  const merged = [...existing]
  for (const e of incoming) {
    const id = (e.eventId as string) ?? ''
    if (id && byId.has(id)) continue
    merged.push(e)
    if (id) byId.add(id)
  }
  merged.sort((a, b) => {
    const ta = (a.occurrenceDatetime ?? a.datetime ?? a.occurrenceDateTime ?? '') as string
    const tb = (b.occurrenceDatetime ?? b.datetime ?? b.occurrenceDateTime ?? '') as string
    if (!ta) return 1
    if (!tb) return -1
    return new Date(ta).getTime() - new Date(tb).getTime()
  })
  return merged
}

export async function POST(request: Request) {
  const secret = process.env.SHIP24_WEBHOOK_SECRET
  if (!secret?.trim()) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 },
    )
  }

  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  if (!token || token !== secret.trim()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Ship24WebhookPayload
  try {
    body = (await request.json()) as Ship24WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const trackings = body.trackings
  if (!Array.isArray(trackings) || trackings.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  for (const item of trackings) {
    const trackingNumber = (item.tracker?.trackingNumber as string)?.trim()
    if (!trackingNumber) continue

    const normalized = normalizeTrackingNumber(trackingNumber)
    if (!normalized) continue

    type ShipmentRow = { id: string; tracking_number: string; status_raw: unknown }
    let row: ShipmentRow | null = null

    const { data: exact } = await supabase
      .from('shipments')
      .select('id, tracking_number, status_raw')
      .eq('tracking_number', trackingNumber)
      .maybeSingle()

    if (exact) {
      row = exact as ShipmentRow
    }

    if (!row) {
      const { data: all } = await supabase
        .from('shipments')
        .select('id, tracking_number, status_raw')
      const list = (all ?? []) as Array<{ id: string; tracking_number: string; status_raw: unknown }>
      row = list.find(
        (s) => normalizeTrackingNumber(s.tracking_number) === normalized,
      ) ?? null
    }

    if (!row) continue

    const existingEvents = getEventsFromStatusRaw(row.status_raw)
    const incomingEvents = Array.isArray(item.events) ? item.events : []
    const mergedEvents = mergeEvents(existingEvents, incomingEvents)

    const shipment = item.shipment as Parameters<typeof computeStatusFromShipmentAndEvents>[0]
    const events = mergedEvents as Parameters<typeof computeStatusFromShipmentAndEvents>[1]
    const computed = computeStatusFromShipmentAndEvents(shipment, events)

    const mergedRaw = {
      data: {
        trackings: [
          {
            tracker: item.tracker,
            shipment: item.shipment,
            events: mergedEvents,
          },
        ],
      },
    }

    const now = new Date().toISOString()
    await supabase
      .from('shipments')
      .update({
        status: computed.status,
        status_raw: mergedRaw,
        expected_delivery_date: computed.expectedDeliveryDate,
        delivered_at: computed.deliveredAt,
        last_checked_at: now,
      })
      .eq('id', row.id)
  }

  return NextResponse.json({ ok: true })
}
