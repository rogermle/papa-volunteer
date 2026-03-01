import { CARRIERS, type Carrier, type ShipmentStatus } from '@/lib/types/database'

/** Ship24 base: all endpoints use /public/v1/ prefix (see OpenAPI / PHP client). */
const SHIP24_API_BASE = 'https://api.ship24.com/public/v1'

export interface TrackingResult {
  status: ShipmentStatus
  expectedDeliveryDate: string | null
  deliveredAt: string | null
  raw: unknown
}

/** Map Ship24 statusMilestone to our ShipmentStatus. */
function mapStatusMilestone(milestone: string | null | undefined): ShipmentStatus {
  if (!milestone || typeof milestone !== 'string') return 'Unknown'
  const m = milestone.toLowerCase()
  if (m === 'info_received' || m === 'pending') return 'Pre-Shipment'
  if (m === 'in_transit') return 'In Transit'
  if (m === 'out_for_delivery') return 'Out for Delivery'
  if (m === 'delivered') return 'Delivered'
  if (m === 'exception') return 'Exception'
  if (m === 'failed_attempt' || m === 'available_for_pickup') return 'Out for Delivery'
  return 'Unknown'
}

/** Infer status from event status text when statusMilestone is missing (e.g. "In transit", "USPS in possession"). */
function inferMilestoneFromStatus(status: string | null | undefined): string | null {
  if (!status || typeof status !== 'string') return null
  const s = status.toLowerCase()
  if (s.includes('delivered') || s.includes('delivery complete')) return 'delivered'
  if (s.includes('out for delivery')) return 'out_for_delivery'
  if (s.includes('in transit') || s.includes('in possession') || s.includes('accepted') || s.includes('departed') || s.includes('arrived')) return 'in_transit'
  if (s.includes('pre-shipment') || s.includes('info received') || s.includes('label')) return 'info_received'
  if (s.includes('exception') || s.includes('return') || s.includes('failed')) return 'exception'
  return null
}

/** Extract ISO date (YYYY-MM-DD) from an ISO datetime string if present. */
function toDateOnly(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const date = value.split('T')[0]
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

/**
 * Single tracking object in Ship24 response (trackings/trackers array element).
 * Event fields we use or that the API may return:
 * - status: raw courier text (e.g. "USPS in possession of the item")
 * - occurrenceDatetime / datetime: when the event happened
 * - statusMilestone: normalized (info_received, in_transit, out_for_delivery, delivered, exception, etc.)
 * - statusCode, statusCategory: codified meaning
 * - location: optional { place?, city?, state?, countryCode?, address? } for event location (e.g. "LAS VEGAS NV")
 * Shipment-level: estimatedDeliveryDate, expectedDeliveryDate, statusMilestone.
 */
interface Ship24Tracker {
  tracker?: { trackingNumber?: string; trackerId?: string }
  shipment?: {
    statusMilestone?: string
    estimatedDeliveryDate?: string
    expectedDeliveryDate?: string
    [k: string]: unknown
  }
  events?: Array<{
    statusMilestone?: string
    status?: string
    occurrenceDatetime?: string
    location?: { place?: string; city?: string; state?: string; countryCode?: string; address?: string; [k: string]: unknown }
    [k: string]: unknown
  }>
}

/** Ship24 trackers/track response: data.trackings[] or data.trackers[] or data.tracking (single), or data.shipment + data.events. */
interface Ship24TrackResponse {
  data?: {
    trackings?: Ship24Tracker[]
    trackers?: Ship24Tracker[]
    tracking?: Ship24Tracker
    tracker?: { trackingNumber?: string }
    shipment?: Ship24Tracker['shipment']
    events?: Ship24Tracker['events']
  }
  trackings?: Ship24Tracker[]
  errors?: Array<{ code?: string; message?: string }>
  message?: string
  error?: string
}

/** Get events from a tracking item (may be on item, item.shipment, item.tracking, or item.results). */
function getEventsFromItem(item: Ship24Tracker | Record<string, unknown>): NonNullable<Ship24Tracker['events']> {
  const I = item as Record<string, unknown>
  for (const key of ['events', 'trackingActivities', 'activities']) {
    const ev = I[key]
    if (Array.isArray(ev) && ev.length > 0) return ev as NonNullable<Ship24Tracker['events']>
  }
  const ship = I.shipment
  if (ship && typeof ship === 'object') {
    const shipEv = (ship as Record<string, unknown>).events
    if (Array.isArray(shipEv) && shipEv.length > 0) return shipEv as NonNullable<Ship24Tracker['events']>
  }
  for (const key of ['tracking', 'result', 'results', 'data']) {
    const tr = I[key]
    if (tr && typeof tr === 'object') {
      const trEv = (tr as Record<string, unknown>).events
      if (Array.isArray(trEv) && trEv.length > 0) return trEv as NonNullable<Ship24Tracker['events']>
    }
  }
  return []
}

/** Get shipment and events from response. Tries data.trackings[0], data.trackers[0], data.tracking, root trackings[0], then data.shipment + data.events. */
function getShipmentAndEvents(json: Ship24TrackResponse): {
  shipment: Ship24Tracker['shipment']
  events: NonNullable<Ship24Tracker['events']>
} {
  const single = json.data?.tracking
  if (single) {
    const evs = getEventsFromItem(single)
    return {
      shipment: single.shipment ?? json.data?.shipment,
      events: evs.length > 0 ? evs : (json.data?.events ?? []),
    }
  }
  const list =
    json.data?.trackings ?? json.data?.trackers ?? (json as { trackings?: Ship24Tracker[] }).trackings
  if (Array.isArray(list) && list.length > 0) {
    const first = list[0]
    const itemEvents = getEventsFromItem(first as Ship24Tracker & Record<string, unknown>)
    return {
      shipment: (first as Ship24Tracker).shipment ?? json.data?.shipment,
      events: itemEvents.length > 0 ? itemEvents : (json.data?.events ?? []),
    }
  }
  return {
    shipment: json.data?.shipment,
    events: json.data?.events ?? [],
  }
}

/** Normalize tracking number: trim and remove spaces (APIs often expect digits only). */
export function normalizeTrackingNumber(value: string): string {
  return value.trim().replace(/\s+/g, '')
}

/**
 * Compute status, expected delivery, and delivered at from shipment + events.
 * Used by trackPackage() and the webhook handler. Events can be in any order; latest by occurrenceDatetime is used for status.
 */
export function computeStatusFromShipmentAndEvents(
  shipment: Ship24Tracker['shipment'],
  events: NonNullable<Ship24Tracker['events']>,
): Pick<TrackingResult, 'status' | 'expectedDeliveryDate' | 'deliveredAt'> {
  let statusMilestone = shipment?.statusMilestone
  if (!statusMilestone && events.length > 0) {
    let latest = events[0]
    let latestTime = latest?.occurrenceDatetime ?? (latest as { datetime?: string })?.datetime ?? ''
    for (const ev of events) {
      const t = ev?.occurrenceDatetime ?? (ev as { datetime?: string })?.datetime ?? ''
      if (t && (!latestTime || new Date(t) > new Date(latestTime))) {
        latest = ev
        latestTime = t
      }
    }
    statusMilestone = latest?.statusMilestone ?? inferMilestoneFromStatus(latest?.status) ?? undefined
  }
  const status = mapStatusMilestone(statusMilestone)
  const expectedDeliveryDate =
    toDateOnly(shipment?.estimatedDeliveryDate ?? shipment?.expectedDeliveryDate) ?? null
  let deliveredAt: string | null = null
  for (const ev of events) {
    if (ev?.statusMilestone?.toLowerCase() === 'delivered' && ev.occurrenceDatetime) {
      deliveredAt = ev.occurrenceDatetime
      break
    }
  }
  return { status, expectedDeliveryDate, deliveredAt }
}

/** Ship24 uses its own courier codes (e.g. us-post for USPS). Map our Carrier to Ship24's code. */
const CARRIER_TO_SHIP24_CODE: Record<Carrier, string> = {
  USPS: 'us-post',
  UPS: 'ups',
  FEDEX: 'fedex',
  DHL: 'dhl',
}

/** Per-shipment plan: create tracker and get results. Per-call plan: search by tracking number only. */
const SHIP24_TRACKERS_TRACK = '/trackers/track'
const SHIP24_TRACKING_SEARCH = '/tracking/search'

export async function trackPackage(
  trackingNumber: string,
  carrier: Carrier = 'USPS',
): Promise<TrackingResult> {
  const apiKey = process.env.SHIP24_API_KEY
  if (!apiKey?.trim()) {
    throw new Error('SHIP24_API_KEY is not set.')
  }

  const normalized = normalizeTrackingNumber(trackingNumber)
  if (!normalized) {
    throw new Error('Tracking number is required.')
  }

  const courierCode = CARRIER_TO_SHIP24_CODE[carrier] ?? CARRIER_TO_SHIP24_CODE.USPS
  const body = {
    trackingNumber: normalized,
    courierCode,
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey.trim()}`,
  }

  // Try per-shipment endpoint first; if 404, use per-call endpoint (different plan)
  let res = await fetch(`${SHIP24_API_BASE}${SHIP24_TRACKERS_TRACK}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  let json = (await res.json().catch(() => ({}))) as Ship24TrackResponse

  if (res.status === 404) {
    const searchRes = await fetch(`${SHIP24_API_BASE}${SHIP24_TRACKING_SEARCH}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    json = (await searchRes.json().catch(() => ({}))) as Ship24TrackResponse
    res = searchRes
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[Ship24] 404 on /trackers/track, used /tracking/search (per-call). Status:', res.status)
    }
  }

  // 201 = tracker created; initial response often has empty events. Try GET results, then POST search.
  if (res.status === 201) {
    const list = json.data?.trackings ?? json.data?.trackers
    const first = Array.isArray(list) && list.length > 0 ? (list[0] as Record<string, unknown>) : null
    const itemEvents = first?.events
    const hasNoEvents = !Array.isArray(itemEvents) || itemEvents.length === 0

    if (hasNoEvents) {
      let foundEvents: unknown[] | null = null
      let getStatus: number | null = null
      let searchStatus: number | null = null

      const trackerObj = first?.tracker as Record<string, unknown> | string | undefined
      let trackerId: string | null = null
      if (typeof trackerObj === 'string') trackerId = trackerObj
      else if (trackerObj && typeof trackerObj === 'object') {
        trackerId = (trackerObj.trackerId ?? trackerObj.tracker_id ?? trackerObj.id) as string ?? null
      }
      if (trackerId) {
        const resultsRes = await fetch(`${SHIP24_API_BASE}/trackers/${encodeURIComponent(trackerId)}/results`, {
          method: 'GET',
          headers: { Authorization: headers.Authorization },
        })
        getStatus = resultsRes.status
        const resultsJson = (await resultsRes.json().catch(() => ({}))) as Ship24TrackResponse & { data?: { shipment?: unknown; events?: unknown[] } }
        const resultsData = resultsJson.data as Record<string, unknown> | undefined
        const resultsList = resultsData?.trackings ?? resultsData?.trackers
        const resultsFirst = Array.isArray(resultsList) && resultsList.length > 0 ? resultsList[0] : null
        if (resultsFirst && typeof resultsFirst === 'object') {
          const rf = resultsFirst as Record<string, unknown>
          if (Array.isArray(rf.events) && rf.events.length > 0) foundEvents = rf.events
        }
        if (!foundEvents && Array.isArray(resultsData?.events) && resultsData.events.length > 0) {
          foundEvents = resultsData.events
          json = { data: { trackings: [{ shipment: resultsData.shipment, events: resultsData.events }] } } as Ship24TrackResponse
        } else if (foundEvents) {
          json = resultsJson as Ship24TrackResponse
        }
      }

      if (!foundEvents) {
        const searchRes = await fetch(`${SHIP24_API_BASE}${SHIP24_TRACKING_SEARCH}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        searchStatus = searchRes.status
        const searchJson = (await searchRes.json().catch(() => ({}))) as Ship24TrackResponse
        const searchData = searchJson.data as Record<string, unknown> | undefined
        const searchList = searchData?.trackings ?? searchData?.trackers
        let searchFirst: Record<string, unknown> | null = Array.isArray(searchList) && searchList.length > 0 ? (searchList[0] as Record<string, unknown>) : null
        if (!searchFirst && searchData?.tracking && typeof searchData.tracking === 'object') {
          searchFirst = searchData.tracking as Record<string, unknown>
        }
        if (!searchFirst && searchData?.tracker && typeof searchData.tracker === 'object') {
          searchFirst = searchData.tracker as Record<string, unknown>
        }
        if (searchFirst) {
          const sf = searchFirst
          if (Array.isArray(sf.events) && sf.events.length > 0) {
            json = searchJson as Ship24TrackResponse
            foundEvents = sf.events
          }
        }
        if (!foundEvents && Array.isArray(searchData?.events) && searchData.events.length > 0) {
          json = { data: { trackings: [{ shipment: searchData.shipment, events: searchData.events }] } } as Ship24TrackResponse
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(
          '[Ship24] 201 empty events fallback:',
          trackerId ? `GET /trackers/${trackerId}/results → ${getStatus ?? '—'}` : 'no trackerId',
          '| POST /tracking/search →',
          searchStatus ?? '—'
        )
      }
    }
  }

  if (!res.ok) {
    if (process.env.NODE_ENV !== 'production' && json.errors?.length) {
      // eslint-disable-next-line no-console
      console.warn('[Ship24] Error response:', res.status, JSON.stringify(json.errors))
    }
    const fromErrors = json.errors?.[0]?.message
    const fromBody = (json as { message?: string }).message ?? (json as { error?: string }).error
    const fallback =
      res.status === 401
        ? 'Invalid API key.'
        : res.status === 403
          ? 'Access denied. Check your Ship24 plan or API key.'
          : res.status === 429
            ? 'Too many requests. Try again later.'
            : `Tracking unavailable (${res.status}).`
    const msg = fromErrors ?? (typeof fromBody === 'string' ? fromBody : null) ?? fallback
    throw new Error(msg)
  }

  const { shipment, events } = getShipmentAndEvents(json)

  // Log response shape in development (terminal when you click Refresh) so we can match the parser
  if (process.env.NODE_ENV !== 'production') {
    const d = json.data as Record<string, unknown> | undefined
    const list = d?.trackings ?? d?.trackers
    const firstItem = Array.isArray(list) && list.length > 0 ? (list[0] as Record<string, unknown>) : null
    const firstItemKeys = firstItem ? Object.keys(firstItem) : []
    const firstEv = Array.isArray(events) && events.length > 0 ? events[0] : null
    const evKeys = firstEv && typeof firstEv === 'object' ? Object.keys(firstEv as object) : []
    // eslint-disable-next-line no-console
    console.log(
      '[Ship24]',
      res.status,
      '| data keys:',
      d ? Object.keys(d).join(', ') : '(none)',
      '| events:',
      events.length,
      '| first tracking item keys:',
      firstItemKeys.join(', ') || '(none)',
      '| first event keys:',
      evKeys.join(', ') || '(none)',
    )
  }

  // Debug: log when we get no usable data
  const hasAny =
    (shipment?.statusMilestone ?? shipment?.estimatedDeliveryDate ?? shipment?.expectedDeliveryDate) ||
    events.some((e) => e?.statusMilestone ?? e?.occurrenceDatetime)
  if (!hasAny && process.env.NODE_ENV !== 'production') {
    const d = json.data as Record<string, unknown> | undefined
    const dataKeys = d ? Object.keys(d) : []
    const list = json.data?.trackings ?? json.data?.trackers ?? (json as { trackings?: unknown[] }).trackings
    const first = Array.isArray(list) && list.length > 0 ? (list[0] as Record<string, unknown>) : null
    const firstKeys = first ? Object.keys(first) : []
    const shipmentKeys = first?.shipment ? Object.keys(first.shipment as object) : []
    const evs = first?.events as unknown[] | undefined
    const firstEventKeys =
      Array.isArray(evs) && evs.length > 0 ? Object.keys(evs[0] as object) : []
    // eslint-disable-next-line no-console
    console.warn(
      '[Ship24] Empty parse. data keys:',
      dataKeys,
      'first item keys:',
      firstKeys,
      'shipment keys:',
      shipmentKeys,
      'first event keys:',
      firstEventKeys,
    )
  }

  const computed = computeStatusFromShipmentAndEvents(shipment, events)
  return {
    status: computed.status,
    expectedDeliveryDate: computed.expectedDeliveryDate,
    deliveredAt: computed.deliveredAt,
    raw: json,
  }
}
