import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  TIMEZONE_LABELS,
  formatTimeLocal,
  formatScheduleDay,
  formatScheduleTimeWithTz,
} from "@/lib/types/database";
import type { Timezone, VolunteerScheduleRow } from "@/lib/types/database";
import { CancelSignupButton } from "@/app/my-signups/CancelSignupButton";

export default async function MySchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin?next=/my-schedule");

  const { data: signups } = await supabase
    .from("event_signups")
    .select(
      `
      id, event_id, waitlist_position, created_at,
      events ( id, title, start_date, end_date, start_time, end_time, timezone, location, image_url, volunteer_details, volunteer_schedule )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const formatDate = (d: string) =>
    new Date(d + "Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const formatRange = (start: string, end: string) =>
    start === end
      ? formatDate(start)
      : `${formatDate(start)} – ${formatDate(end)}`;

  const byStartDate = [...(signups ?? [])].sort((a, b) => {
    const rawA = a.events;
    const evA = Array.isArray(rawA) ? rawA[0] : rawA;
    const rawB = b.events;
    const evB = Array.isArray(rawB) ? rawB[0] : rawB;
    if (!evA || typeof evA !== "object" || !evB || typeof evB !== "object")
      return 0;
    const dA = (evA as { start_date: string }).start_date;
    const dB = (evB as { start_date: string }).start_date;
    return dA.localeCompare(dB);
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">My Schedule</h1>
      <p className="text-sm text-papa-muted">
        Your volunteer events with schedule, room, and venue info in one place.
      </p>
      {!signups?.length ? (
        <div className="rounded-xl border border-papa-border bg-papa-card p-6 text-center text-papa-muted">
          <p>You’re not signed up for any events yet.</p>
          <Link
            href="/events"
            className="mt-2 inline-block text-sm text-papa-accent hover:underline"
          >
            Browse events →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {byStartDate.map((s) => {
            const raw = s.events;
            const event = Array.isArray(raw) ? raw[0] : raw;
            if (!event || typeof event !== "object") return null;
            const ev = event as {
              id: string;
              title: string;
              start_date: string;
              end_date: string;
              start_time: string | null;
              end_time: string | null;
              timezone: string;
              location: string | null;
              image_url: string | null;
              volunteer_details: string | null;
              volunteer_schedule: VolunteerScheduleRow[] | null;
            };
            const tz = TIMEZONE_LABELS[ev.timezone as Timezone] ?? ev.timezone;
            const timeStr =
              [formatTimeLocal(ev.start_time), formatTimeLocal(ev.end_time)]
                .filter(Boolean)
                .join(" – ") || null;
            const onWaitlist = s.waitlist_position != null;
            return (
              <li
                key={s.id}
                className="overflow-hidden rounded-xl border border-papa-border bg-papa-card shadow-sm"
              >
                <Link href={`/events/${ev.id}`} className="block">
                  <div className="aspect-[21/10] w-full shrink-0 overflow-hidden bg-papa-muted/20">
                    {ev.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={ev.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-papa-muted/60">
                        <svg
                          className="h-12 w-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                  </div>
                  {(ev.volunteer_schedule?.length ?? 0) > 0 && (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-papa-border bg-background">
                      <h3 className="border-b border-papa-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-papa-muted">
                        Schedule
                      </h3>
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-papa-border bg-papa-muted/20">
                            <th className="px-3 py-2 font-medium text-foreground">
                              Day
                            </th>
                            <th className="px-3 py-2 font-medium text-foreground">
                              Time
                            </th>
                            <th className="px-3 py-2 font-medium text-foreground">
                              Event
                            </th>
                            <th className="px-3 py-2 font-medium text-foreground">
                              Room(s)
                            </th>
                            <th className="px-3 py-2 font-medium text-foreground">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            ev.volunteer_schedule as VolunteerScheduleRow[]
                          ).map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-papa-border/60 last:border-0"
                            >
                              <td className="px-3 py-2 text-foreground">
                                {formatScheduleDay(row.day)}
                              </td>
                              <td className="px-3 py-2 text-foreground">
                                {formatScheduleTimeWithTz(
                                  row.time ?? "",
                                  TIMEZONE_LABELS[ev.timezone as Timezone] ??
                                    ev.timezone,
                                )}
                              </td>
                              <td className="px-3 py-2 text-foreground">
                                {row.event || "—"}
                              </td>
                              <td className="px-3 py-2 text-foreground">
                                {row.room || "—"}
                              </td>
                              <td className="px-3 py-2 text-foreground">
                                {row.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {ev.volunteer_details && (
                    <div className="mt-4 rounded-lg border border-papa-border bg-background p-4">
                      <h3 className="text-xs font-medium uppercase tracking-wide text-papa-muted">
                        Full coordinator email / details
                      </h3>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {ev.volunteer_details}
                      </div>
                      <Link
                        href={`/events/${ev.id}`}
                        className="mt-2 inline-block text-xs text-papa-accent hover:underline"
                      >
                        View full event →
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
