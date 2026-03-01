import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  createShipment,
  refreshShipment,
  removeShipment,
} from "@/app/actions/shipping";
import { LocalDateTime } from "@/components/LocalDateTime";
import { CARRIERS } from "@/lib/types/database";
import type { Shipment, ShipmentStatus } from "@/lib/types/database";

/** Event may have location as string (e.g. "LAS VEGAS NV") or object { place?, city?, state?, countryCode?, address? }. */
function formatEventLocation(loc: unknown): string | null {
  if (loc == null) return null;
  if (typeof loc === "string") return loc.trim() || null;
  if (typeof loc !== "object") return null;
  const L = loc as Record<string, unknown>;
  const place = typeof L.place === "string" ? L.place.trim() : null;
  if (place) return place;
  const city = typeof L.city === "string" ? L.city.trim() : null;
  const state = typeof L.state === "string" ? L.state.trim() : null;
  const country =
    typeof L.countryCode === "string"
      ? L.countryCode.trim()
      : typeof L.country === "string"
        ? L.country.trim()
        : null;
  const parts = [city, state].filter(Boolean);
  if (parts.length)
    return country ? `${parts.join(", ")} ${country}` : parts.join(", ");
  const address = typeof L.address === "string" ? L.address.trim() : null;
  return address || null;
}

/** Keys that indicate an object is a tracking event (Ship24 uses status, occurrenceDatetime, etc.). */
function looksLikeEvent(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    "status" in o ||
    "statusDescription" in o ||
    "description" in o ||
    "occurrenceDatetime" in o ||
    "occurrenceDateTime" in o ||
    "datetime" in o
  );
}

/** Recursively find first array of objects that look like tracking events. */
function findEventsArray(obj: unknown, depth = 0): unknown[] | null {
  if (depth > 10) return null;
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    const first = obj[0];
    if (first && looksLikeEvent(first)) return obj;
    return null;
  }
  const O = obj as Record<string, unknown>;
  for (const key of [
    "events",
    "trackingActivities",
    "activities",
    "trackings",
    "trackers",
  ]) {
    const val = O[key];
    const found = findEventsArray(val, depth + 1);
    if (found && found.length > 0) return found;
  }
  for (const key of Object.keys(O)) {
    const found = findEventsArray(O[key], depth + 1);
    if (found && found.length > 0) return found;
  }
  return null;
}

/** Get events array from status_raw (same shapes as API / webhook). */
function getEventsFromStatusRaw(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  const data = (r.data ?? r.result ?? r) as Record<string, unknown>;
  const single = data?.tracking ?? data?.tracker ?? r.tracking ?? r.tracker;
  if (single && typeof single === "object") {
    const s = single as Record<string, unknown>;
    const ev = s.events ?? s.trackingActivities ?? s.activities ?? data?.events;
    if (Array.isArray(ev) && ev.length > 0) return ev;
  }
  const list = (data?.trackings ??
    data?.trackers ??
    r.trackings ??
    r.trackers) as unknown[] | undefined;
  const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
  if (first && typeof first === "object") {
    const f = first as Record<string, unknown>;
    const ship = f.shipment as Record<string, unknown> | undefined;
    const ev =
      f.events ??
      f.trackingActivities ??
      f.activities ??
      ship?.events ??
      (data?.events as unknown[]);
    if (Array.isArray(ev) && ev.length > 0) return ev;
  }
  if (Array.isArray(data?.events) && (data.events as unknown[]).length > 0)
    return data.events as unknown[];
  const found = findEventsArray(raw);
  return found ?? [];
}

/**
 * Parse Ship24 status_raw: get latest event's status text and location for "Latest update" column.
 * Returns e.g. "USPS in possession of the item" or "USPS in possession of the item — LAS VEGAS NV".
 */
function getLatestStatusDescription(statusRaw: unknown): string | null {
  const events = getEventsFromStatusRaw(statusRaw);
  if (events.length === 0) return null;

  type Ev = Record<string, unknown>;
  function eventStatus(e: Ev): string | null {
    const t = (e.status ??
      e.description ??
      e.statusDescription ??
      e.message ??
      e.eventStatus ??
      e.text) as string | undefined;
    return t?.trim() || null;
  }
  function eventTime(e: Ev): string {
    const t =
      e.occurrenceDatetime ??
      e.occurrenceDateTime ??
      e.datetime ??
      e.occurrenceDate ??
      e.date;
    return (typeof t === "string" ? t : "") || "";
  }
  let latest: Ev | null = null;
  let latestTime = "";
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const e = ev as Ev;
    const datetime = eventTime(e).trim();
    const time = datetime ? new Date(datetime).getTime() : 0;
    if (!latest || (time && time > new Date(latestTime || 0).getTime())) {
      latest = e;
      latestTime = datetime;
    }
  }
  const fallbackEvent = events[0] as Ev | undefined;
  let statusText =
    (latest && eventStatus(latest)) ??
    (fallbackEvent && eventStatus(fallbackEvent));
  if (!statusText?.trim()) {
    for (const ev of events) {
      const t = eventStatus(ev as Ev);
      if (t?.trim()) {
        statusText = t;
        break;
      }
    }
  }
  statusText = statusText?.trim() || null;
  const locationText = latest ? formatEventLocation(latest.location) : null;
  if (statusText && locationText) return `${statusText} — ${locationText}`;
  return statusText || locationText;
}

/**
 * Shipment-level summary from status_raw for when events are empty or for "at a glance" line.
 * Extracts status milestone, expected date, transit time, and a short summary message.
 */
function getShipmentSummaryFromRaw(statusRaw: unknown): {
  statusMilestone: string | null;
  expectedDate: string | null;
  transitTime: string | null;
  summaryMessage: string | null;
} {
  if (!statusRaw || typeof statusRaw !== "object") {
    return {
      statusMilestone: null,
      expectedDate: null,
      transitTime: null,
      summaryMessage: null,
    };
  }
  const r = statusRaw as Record<string, unknown>;
  const data = (r.data ?? r) as Record<string, unknown>;
  const list = (data?.trackings ?? data?.trackers) as
    | Array<Record<string, unknown>>
    | undefined;
  const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
  const single = data?.tracking ?? data?.tracker;
  const item = (first ??
    (single && typeof single === "object"
      ? (single as Record<string, unknown>)
      : null)) as Record<string, unknown> | null;
  if (!item) {
    return {
      statusMilestone: null,
      expectedDate: null,
      transitTime: null,
      summaryMessage: null,
    };
  }
  const shipment = item.shipment as Record<string, unknown> | undefined;
  const statistics = (item.statistics ?? shipment?.statistics) as
    | Record<string, unknown>
    | undefined;
  const statusMilestone = (shipment?.statusMilestone ??
    shipment?.status ??
    data?.statusMilestone) as string | undefined;
  const milestone = statusMilestone?.trim() || null;
  const est = (shipment?.estimatedDeliveryDate ??
    shipment?.expectedDeliveryDate ??
    data?.estimatedDeliveryDate ??
    data?.expectedDeliveryDate) as string | undefined;
  const expectedDate = est?.trim() || null;
  const transitTimeRaw = (statistics?.transitTime ??
    statistics?.transit_time ??
    shipment?.transitTime ??
    shipment?.transit_time) as string | number | undefined;
  const transitTime =
    transitTimeRaw != null
      ? typeof transitTimeRaw === "number"
        ? `${transitTimeRaw} day${transitTimeRaw !== 1 ? "s" : ""}`
        : String(transitTimeRaw).trim() || null
      : null;
  let summaryMessage: string | null = null;
  if (milestone) {
    const m = milestone.toLowerCase();
    if (m === "in_transit" || m === "in transit")
      summaryMessage = "Your shipment is on the way!";
    else if (m === "delivered") summaryMessage = "Delivered";
    else if (m === "out_for_delivery" || m === "out for delivery")
      summaryMessage = "Out for delivery";
    else if (m === "info_received" || m === "pending")
      summaryMessage = "Preparing for shipment";
    else if (m === "exception") summaryMessage = "Exception — check tracking";
  }
  return {
    statusMilestone: milestone,
    expectedDate: expectedDate || null,
    transitTime: transitTime || null,
    summaryMessage,
  };
}

/** Format tracking number with spaces every 4 digits for readability. */
function formatTrackingNumber(num: string): string {
  const digits = num.replace(/\s/g, "");
  if (digits.length <= 4) return num;
  return digits.match(/.{1,4}/g)?.join(" ") ?? num;
}

/** Format an event datetime string for display. */
function formatEventDateTime(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type EventDisplay = {
  datetime: string;
  status: string;
  location: string | null;
};

/** Get all events from status_raw sorted newest first, for display in details. */
function getOrderedEventsForDisplay(statusRaw: unknown): EventDisplay[] {
  const events = getEventsFromStatusRaw(statusRaw);
  type Ev = Record<string, unknown>;
  function eventStatus(e: Ev): string {
    const t = (e.status ??
      e.description ??
      e.statusDescription ??
      e.message ??
      e.eventStatus ??
      e.text) as string | undefined;
    return t?.trim() ?? "—";
  }
  function eventTime(e: Ev): string {
    const t =
      e.occurrenceDatetime ??
      e.occurrenceDateTime ??
      e.datetime ??
      e.occurrenceDate ??
      e.date;
    return (typeof t === "string" ? t : "") || "";
  }
  const withTime = events
    .filter((ev): ev is Ev => ev != null && typeof ev === "object")
    .map((e) => ({
      datetime: eventTime(e),
      status: eventStatus(e),
      location: formatEventLocation(e.location),
    }))
    .filter((x) => x.datetime || x.status !== "—");
  withTime.sort((a, b) => {
    if (!a.datetime) return 1;
    if (!b.datetime) return -1;
    return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
  });
  return withTime;
}

/** Get origin and destination from status_raw shipment if present. */
function getOriginDestination(statusRaw: unknown): {
  origin: string | null;
  destination: string | null;
} {
  if (!statusRaw || typeof statusRaw !== "object")
    return { origin: null, destination: null };
  const r = statusRaw as Record<string, unknown>;
  const data = (r.data ?? r) as Record<string, unknown>;
  const list = (data?.trackings ?? data?.trackers) as
    | Array<Record<string, unknown>>
    | undefined;
  const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
  const single = data?.tracking ?? data?.tracker;
  const item = (first ??
    (single && typeof single === "object"
      ? (single as Record<string, unknown>)
      : null)) as Record<string, unknown> | null;
  const shipment = item?.shipment as Record<string, unknown> | undefined;
  if (!shipment) return { origin: null, destination: null };
  const origin =
    formatEventLocation(
      shipment.origin ?? shipment.originAddress ?? shipment.originCountry,
    ) ??
    (typeof shipment.origin === "string"
      ? shipment.origin.trim() || null
      : null);
  const dest =
    formatEventLocation(
      shipment.destination ??
        shipment.destinationAddress ??
        shipment.destinationCountry,
    ) ??
    (typeof shipment.destination === "string"
      ? shipment.destination.trim() || null
      : null);
  return {
    origin: origin ?? null,
    destination: dest ?? null,
  };
}

/** Status badge style by shipment status. */
function statusBadgeClass(status: ShipmentStatus | null): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  if (!status || status === "Unknown")
    return `${base} bg-papa-border/70 text-papa-muted`;
  switch (status) {
    case "Delivered":
      return `${base} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300`;
    case "Out for Delivery":
      return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300`;
    case "In Transit":
    case "Pre-Shipment":
      return `${base} bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300`;
    case "Exception":
      return `${base} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300`;
    default:
      return `${base} bg-papa-border/70 text-papa-muted`;
  }
}

type PageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function AdminShippingPage({ searchParams }: PageProps) {
  const params =
    searchParams instanceof Promise ? await searchParams : (searchParams ?? {});
  const errorMessage = typeof params?.error === "string" ? params.error : null;

  const supabase = await createClient();

  const { data: shipments } = await supabase
    .from("shipments")
    .select(
      "id, event_id, to_signup_id, from_profile_id, carrier, tracking_number, status, status_raw, expected_delivery_date, last_checked_at, delivered_at, notes, created_at",
    )
    .order("created_at", { ascending: false });

  type ShipmentRow = Shipment & { status_raw?: unknown };
  const shipmentRows = (shipments ?? []) as ShipmentRow[];

  const fromProfileIds = Array.from(
    new Set(shipmentRows.map((s) => s.from_profile_id).filter(Boolean)),
  ) as string[];
  const toSignupIds = Array.from(
    new Set(shipmentRows.map((s) => s.to_signup_id).filter(Boolean)),
  ) as string[];

  // Recipient (lead volunteer) names for table: signup id -> display name
  let recipientNameBySignupId = new Map<string, string>();
  if (toSignupIds.length > 0) {
    const { data: recipientSignups } = await supabase
      .from("event_signups")
      .select("id, user_id")
      .in("id", toSignupIds);
    const recipientUserIds = Array.from(
      new Set((recipientSignups ?? []).map((s) => s.user_id)),
    );
    const { data: recipientProfiles } =
      recipientUserIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, display_name, discord_username")
            .in("id", recipientUserIds)
        : {
            data: [] as {
              id: string;
              display_name: string | null;
              discord_username: string | null;
            }[],
          };
    const nameByUserId = new Map(
      (recipientProfiles ?? []).map((p) => [
        p.id,
        p.display_name || p.discord_username || "—",
      ]),
    );
    for (const s of recipientSignups ?? []) {
      recipientNameBySignupId.set(s.id, nameByUserId.get(s.user_id) ?? "—");
    }
  }

  // All events for the Add-shipment dropdown (earliest first), plus lead volunteers per event
  const { data: allEvents } = await supabase
    .from("events")
    .select("id, title, start_date")
    .order("start_date", { ascending: true });

  const formEventIds = (allEvents ?? []).map((e) => e.id);
  const { data: leadSignups } =
    formEventIds.length > 0
      ? await supabase
          .from("event_signups")
          .select("id, event_id, user_id")
          .in("event_id", formEventIds)
          .eq("role", "Lead Volunteer")
      : { data: [] as { id: string; event_id: string; user_id: string }[] };

  const leadUserIds = Array.from(
    new Set((leadSignups ?? []).map((s) => s.user_id)),
  );
  const { data: leadProfiles } =
    leadUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, discord_username")
          .in("id", leadUserIds)
      : {
          data: [] as {
            id: string;
            display_name: string | null;
            discord_username: string | null;
          }[],
        };

  const leadNameById = new Map(
    (leadProfiles ?? []).map((p) => [
      p.id,
      p.display_name || p.discord_username || "—",
    ]),
  );
  // Lead volunteers in event order (earliest event first) for dropdown; label = name only
  const leadOptionsInEventOrder: { signupId: string; label: string }[] = [];
  for (const ev of allEvents ?? []) {
    const signupsForEvent = (leadSignups ?? []).filter(
      (s) => s.event_id === ev.id,
    );
    for (const s of signupsForEvent) {
      const name = leadNameById.get(s.user_id) ?? "—";
      leadOptionsInEventOrder.push({
        signupId: s.id,
        label: name,
      });
    }
  }

  const { data: fromProfiles } =
    fromProfileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, discord_username")
          .in("id", fromProfileIds)
      : {
          data: [] as {
            id: string;
            display_name: string | null;
            discord_username: string | null;
          }[],
        };
  const profileById = new Map(
    (fromProfiles ?? []).map((p) => [
      p.id,
      {
        display_name: p.display_name,
        discord_username: p.discord_username,
      },
    ]),
  );

  const inputClass =
    "h-9 w-full rounded-md border border-papa-border bg-background px-3 text-sm transition-colors focus:border-papa-navy focus:outline-none focus:ring-2 focus:ring-papa-navy/20";
  const labelClass = "mb-1 block text-xs font-medium text-papa-muted";

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-foreground">Shipping</h1>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <span>{errorMessage}</span>
          <a
            href="/admin/shipping"
            className="shrink-0 font-medium underline hover:no-underline"
          >
            Dismiss
          </a>
        </div>
      )}

      <section className="rounded-xl border border-papa-border bg-papa-card p-5 shadow-sm">
        <h2 className="mb-1 text-base font-medium text-foreground">
          Add shipment
        </h2>
        <p className="mb-4 text-sm text-papa-muted">
          Add packages to stay aware of what is currently being shipped and when
          it will arrive. USPS, UPS, FedEx, or DHL. Event and notes are
          optional. Powered by Ship24.
        </p>
        <form
          action={createShipment}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_auto] lg:items-end"
        >
          <div>
            <label htmlFor="tracking_number" className={labelClass}>
              Tracking number
            </label>
            <input
              id="tracking_number"
              name="tracking_number"
              required
              className={inputClass}
              placeholder="e.g. 9505506669016059647681"
            />
          </div>
          <div>
            <label htmlFor="carrier" className={labelClass}>
              Carrier
            </label>
            <select
              id="carrier"
              name="carrier"
              defaultValue="USPS"
              className={inputClass}
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c === "FEDEX" ? "FedEx" : c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="to_signup_id" className={labelClass}>
              Lead Volunteer (optional)
            </label>
            <select
              id="to_signup_id"
              name="to_signup_id"
              className={inputClass}
            >
              <option value="">No recipient</option>
              {leadOptionsInEventOrder.map((opt) => (
                <option key={opt.signupId} value={opt.signupId}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes (optional)
            </label>
            <input
              id="notes"
              name="notes"
              className={inputClass}
              placeholder="Contents, recipient, etc."
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-papa-navy px-4 text-sm font-medium text-white hover:bg-papa-navy/90 focus:outline-none focus:ring-2 focus:ring-papa-navy/30 focus:ring-offset-2"
          >
            Save shipment
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-papa-border bg-papa-card shadow-sm">
        <div className="border-b border-papa-border px-4 py-3">
          <h2 className="text-base font-medium text-foreground">
            Shipments {shipmentRows.length > 0 && `(${shipmentRows.length})`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-papa-border bg-papa-border/40">
                <th className="px-4 py-3 font-medium text-foreground">To</th>
                <th className="px-4 py-3 font-medium text-foreground">From</th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Carrier
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Tracking
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Latest update
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Expected
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Last checked
                </th>
                <th className="px-4 py-3 font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {shipmentRows.map((s) => {
                const toName = s.to_signup_id
                  ? (recipientNameBySignupId.get(s.to_signup_id) ?? "—")
                  : "—";
                const fromProfile = s.from_profile_id
                  ? profileById.get(s.from_profile_id)
                  : null;
                const fromName =
                  (fromProfile?.display_name as string | null) ||
                  (fromProfile?.discord_username as string | null) ||
                  "—";

                const latestDescription = getLatestStatusDescription(
                  s.status_raw,
                );
                const summary = getShipmentSummaryFromRaw(s.status_raw);
                const expectedDateShort = summary.expectedDate
                  ? (() => {
                      const d = summary.expectedDate.split("T")[0];
                      try {
                        return new Date(d + "Z").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      } catch {
                        return d;
                      }
                    })()
                  : null;
                const latestDisplay =
                  latestDescription ||
                  (summary.summaryMessage && expectedDateShort
                    ? `${summary.summaryMessage} • Expected ${expectedDateShort}`
                    : summary.summaryMessage) ||
                  (expectedDateShort ? `Expected ${expectedDateShort}` : null);
                const atAGlanceParts: string[] = [];
                if (summary.transitTime)
                  atAGlanceParts.push(`Transit time: ${summary.transitTime}`);
                if (summary.summaryMessage)
                  atAGlanceParts.push(summary.summaryMessage);
                const atAGlance =
                  atAGlanceParts.length > 0 ? atAGlanceParts.join(" • ") : null;

                const orderedEvents = getOrderedEventsForDisplay(s.status_raw);
                const { origin, destination } = getOriginDestination(
                  s.status_raw,
                );

                return (
                  <Fragment key={s.id}>
                    <tr
                      key={s.id}
                      className="border-b border-papa-border transition-colors hover:bg-papa-border/20"
                    >
                      <td className="max-w-[200px] px-4 py-3">
                        <span
                          className={
                            toName !== "—"
                              ? "block truncate"
                              : "text-papa-muted"
                          }
                        >
                          {toName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{fromName}</td>
                      <td className="px-4 py-3 text-papa-muted">
                        {s.carrier === "FEDEX" ? "FedEx" : s.carrier}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs text-foreground"
                        title={s.tracking_number}
                      >
                        {formatTrackingNumber(s.tracking_number)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={statusBadgeClass(s.status)}>
                            {s.status ?? "—"}
                          </span>
                          {atAGlance && (
                            <span
                              className="text-xs text-papa-muted"
                              title={atAGlance}
                            >
                              {atAGlance}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="min-w-[180px] max-w-[320px] px-4 py-3 text-sm text-foreground">
                        {latestDisplay ? (
                          <span
                            className="block break-words"
                            title={latestDisplay}
                          >
                            {latestDisplay}
                          </span>
                        ) : (
                          <span className="text-papa-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-papa-muted">
                        {s.expected_delivery_date
                          ? new Date(
                              s.expected_delivery_date,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <LocalDateTime
                          isoDate={s.last_checked_at}
                          className="text-papa-muted"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/shipping/${s.id}/edit`}
                            className="inline-flex h-8 items-center rounded-md border border-papa-border bg-background px-3 text-xs font-medium text-foreground hover:border-papa-navy hover:bg-papa-navy/5 hover:text-papa-navy focus:outline-none focus:ring-2 focus:ring-papa-navy/20"
                          >
                            Edit
                          </Link>
                          <form action={refreshShipment} className="inline">
                            <input
                              type="hidden"
                              name="shipment_id"
                              value={s.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center rounded-md border border-papa-border bg-background px-3 text-xs font-medium text-foreground hover:border-papa-navy hover:bg-papa-navy/5 hover:text-papa-navy focus:outline-none focus:ring-2 focus:ring-papa-navy/20"
                            >
                              Refresh
                            </button>
                          </form>
                          <form action={removeShipment} className="inline">
                            <input
                              type="hidden"
                              name="shipment_id"
                              value={s.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center rounded-md border border-transparent px-3 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:border-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                    <tr key={`${s.id}-details`} className="bg-papa-border/10">
                      <td colSpan={9} className="px-4 py-0">
                        <details className="group">
                          <summary className="cursor-pointer list-none py-3 text-sm font-medium text-papa-muted hover:text-papa-navy [&::-webkit-details-marker]:hidden">
                            <span className="inline-flex items-center gap-1">
                              View event history
                              {orderedEvents.length > 0 && (
                                <span className="rounded bg-papa-border/50 px-1.5 py-0.5 text-xs">
                                  {orderedEvents.length}{" "}
                                  {orderedEvents.length === 1
                                    ? "event"
                                    : "events"}
                                </span>
                              )}
                              {(origin || destination || s.notes) && (
                                <span className="text-papa-muted">
                                  {" "}
                                  · More details
                                </span>
                              )}
                            </span>
                          </summary>
                          <div className="border-t border-papa-border pb-4 pt-2">
                            {(origin || destination) && (
                              <p className="mb-3 text-sm text-papa-muted">
                                {origin && destination ? (
                                  <>
                                    Origin: {origin} → Destination:{" "}
                                    {destination}
                                  </>
                                ) : origin ? (
                                  <>Origin: {origin}</>
                                ) : (
                                  <>Destination: {destination}</>
                                )}
                              </p>
                            )}
                            {s.notes && (
                              <p className="mb-3 text-sm text-foreground">
                                <span className="font-medium text-papa-muted">
                                  Notes:{" "}
                                </span>
                                {s.notes}
                              </p>
                            )}
                            {orderedEvents.length > 0 ? (
                              <ul className="space-y-2">
                                {orderedEvents.map((ev, i) => (
                                  <li
                                    key={i}
                                    className="flex flex-col gap-0.5 rounded-md border border-papa-border/60 bg-background px-3 py-2 text-sm"
                                  >
                                    <span className="font-medium text-foreground">
                                      {ev.status}
                                    </span>
                                    <span className="text-xs text-papa-muted">
                                      {formatEventDateTime(ev.datetime)}
                                      {ev.location ? ` · ${ev.location}` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-papa-muted">
                                No event history in tracking data yet. Click
                                Refresh to fetch updates.
                              </p>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              {!shipmentRows.length && (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-papa-muted"
                    colSpan={9}
                  >
                    No shipments yet. Add a tracking number above to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
