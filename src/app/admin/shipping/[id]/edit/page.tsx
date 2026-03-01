import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateShipment } from "@/app/actions/shipping";
import { CARRIERS } from "@/lib/types/database";

function formatTrackingNumber(num: string): string {
  const digits = num.replace(/\s/g, "");
  if (digits.length <= 4) return num;
  return digits.match(/.{1,4}/g)?.join(" ") ?? num;
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }> | { error?: string };
};

export default async function EditShipmentPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/signin?next=/admin/shipping/${id}/edit`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, event_id, to_signup_id, carrier, tracking_number, notes")
    .eq("id", id)
    .single();
  if (!shipment) notFound();

  const paramsResolved =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const errorMessage =
    typeof paramsResolved?.error === "string" ? paramsResolved.error : null;

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

  const nameByUserId = new Map(
    (leadProfiles ?? []).map((p) => [
      p.id,
      p.display_name || p.discord_username || "—",
    ]),
  );
  const leadOptionsInEventOrder: { signupId: string; label: string }[] = [];
  for (const ev of allEvents ?? []) {
    const signupsForEvent = (leadSignups ?? []).filter(
      (s) => s.event_id === ev.id,
    );
    for (const s of signupsForEvent) {
      const name = nameByUserId.get(s.user_id) ?? "—";
      leadOptionsInEventOrder.push({
        signupId: s.id,
        label: name,
      });
    }
  }

  const inputClass =
    "h-9 w-full rounded-md border border-papa-border bg-background px-3 text-sm transition-colors focus:border-papa-navy focus:outline-none focus:ring-2 focus:ring-papa-navy/20";
  const labelClass = "mb-1 block text-xs font-medium text-papa-muted";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/shipping"
          className="text-sm font-medium text-papa-muted hover:text-papa-navy"
        >
          ← Shipping
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Edit shipment</h1>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <span>{errorMessage}</span>
          <Link
            href={`/admin/shipping/${id}/edit`}
            className="shrink-0 font-medium underline hover:no-underline"
          >
            Dismiss
          </Link>
        </div>
      )}

      <section className="rounded-xl border border-papa-border bg-papa-card p-5 shadow-sm">
        <form action={updateShipment} className="flex flex-col gap-4">
          <input type="hidden" name="shipment_id" value={shipment.id} />
          <input
            type="hidden"
            name="redirect_error_to"
            value={`/admin/shipping/${id}/edit`}
          />

          <div>
            <span className={labelClass}>Tracking number</span>
            <p
              className="mt-0.5 font-mono text-sm text-foreground"
              aria-readonly
            >
              {formatTrackingNumber(shipment.tracking_number)}
            </p>
            <p className="mt-1 text-xs text-papa-muted">
              Tracking number cannot be changed.
            </p>
          </div>

          <div>
            <label htmlFor="carrier" className={labelClass}>
              Carrier
            </label>
            <select
              id="carrier"
              name="carrier"
              defaultValue={shipment.carrier}
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
              defaultValue={shipment.to_signup_id ?? ""}
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
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={shipment.notes ?? ""}
              className={inputClass + " min-h-[72px] resize-y py-2"}
              placeholder="Contents, recipient, etc."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-papa-navy px-4 text-sm font-medium text-white hover:bg-papa-navy/90 focus:outline-none focus:ring-2 focus:ring-papa-navy/30 focus:ring-offset-2"
            >
              Save changes
            </button>
            <Link
              href="/admin/shipping"
              className="inline-flex h-9 items-center rounded-md border border-papa-border bg-background px-4 text-sm font-medium text-foreground hover:bg-papa-border/50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
