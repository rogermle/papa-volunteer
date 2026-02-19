import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TIMEZONE_LABELS, formatTimeLocal } from "@/lib/types/database";
import type { Timezone } from "@/lib/types/database";
import { CancelSignupButton } from "./CancelSignupButton";

export default async function MySignupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin?next=/my-signups");

  const { data: signups } = await supabase
    .from("event_signups")
    .select(
      `
      id, event_id, waitlist_position, role, created_at,
      events ( id, title, start_date, end_date, start_time, end_time, timezone, location, image_url, discord_invite_url )
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">My Events</h1>
      <p className="text-sm text-papa-muted">
        Events you’re signed up for. Click an event for details or cancel your
        registration below.
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
        <ul className="flex flex-col gap-3">
          {signups.map((s) => {
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
              discord_invite_url: string | null;
            };
            const tz = TIMEZONE_LABELS[ev.timezone as Timezone] ?? ev.timezone;
            const timeStr =
              [formatTimeLocal(ev.start_time), formatTimeLocal(ev.end_time)]
                .filter(Boolean)
                .join(" – ") || null;
            const onWaitlist = s.waitlist_position != null;
            const today = new Date().toISOString().slice(0, 10);
            const showDiscordLink = !onWaitlist && ev.discord_invite_url?.trim() && ev.end_date >= today;
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
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
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
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {s.role && (
                        <span className="inline-block rounded bg-papa-navy/10 px-1.5 py-0.5 text-xs text-papa-navy">
                          {s.role}
                        </span>
                      )}
                      {onWaitlist && (
                        <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          Waitlist #{s.waitlist_position}
                        </span>
                      )}
                    </div>
                    {showDiscordLink && ev.discord_invite_url && (
                      <p className="mt-2">
                        <a
                          href={ev.discord_invite_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded bg-[#5865F2] px-2.5 py-1 text-sm font-medium text-white hover:bg-[#4752C4]"
                        >
                          Join volunteer Discord channel
                        </a>
                      </p>
                    )}
                  </div>
                  <CancelSignupButton eventId={ev.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
