"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpForEvent, updateSignup } from "@/app/actions/signup";
import { PhoneInput } from "@/components/PhoneInput";
import {
  SIGNUP_ROLES,
  SIGNUP_ROLE_DESCRIPTIONS,
  type SignupRole,
} from "@/lib/types/database";

function showDiscordLink(discordInviteUrl: string | null, eventEndDate: string): boolean {
  if (!discordInviteUrl?.trim()) return false;
  const today = new Date().toISOString().slice(0, 10);
  return eventEndDate >= today;
}

export type SignupFormInitialValues = {
  role: string | null;
  volunteer_status: string | null;
  phone: string | null;
  is_local: boolean | null;
  flight_voucher_requested: boolean | null;
  availability_notes: string | null;
  travel_notes: string | null;
};

type Props = {
  eventId: string;
  full: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
  discordInviteUrl?: string | null;
  eventEndDate?: string;
  mode?: "signup" | "edit";
  initialValues?: SignupFormInitialValues | null;
};

const STATUS_OPTIONS = [
  "",
  "Student (e.g. Private, Instrument, Commercial)",
  "CFI student",
  "CFI / CFII",
  "Job Searching Pilot",
  "Industry Professional",
  "Other",
];

export function VolunteerSignupForm({
  eventId,
  full,
  onCancel,
  onSaved,
  discordInviteUrl = null,
  eventEndDate = "",
  mode = "signup",
  initialValues = null,
}: Props) {
  const isEdit = mode === "edit";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"signed_up" | "waitlist" | "updated" | null>(null);
  const [selectedRole, setSelectedRole] = useState<SignupRole | "">(
    isEdit && initialValues?.role && SIGNUP_ROLES.includes(initialValues.role as SignupRole)
      ? (initialValues.role as SignupRole)
      : "Volunteer"
  );
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);
    const result = isEdit
      ? await updateSignup(formData)
      : await signUpForEvent(formData);
    setSubmitting(false);
    if (result && "error" in result) {
      if (!isEdit && result.error === "You are already signed up for this event.") {
        router.refresh();
        return;
      }
      setError(result.error ?? "Something went wrong.");
      return;
    }
    if (isEdit) {
      setSuccess("updated");
      router.refresh();
      onSaved?.();
      return;
    }
    setSuccess(
      result && "waitlist" in result && result.waitlist ? "waitlist" : "signed_up"
    );
    router.refresh();
  }

  if (success === "updated") {
    return (
      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4" role="status">
        <p className="font-medium text-green-800">Your signup has been updated.</p>
        {onSaved && (
          <button
            type="button"
            onClick={onSaved}
            className="mt-3 rounded border border-green-300 bg-white px-3 py-1.5 text-sm text-green-800 hover:bg-green-100"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  if (success && (success === "signed_up" || success === "waitlist")) {
    const showLink = success === "signed_up" && showDiscordLink(discordInviteUrl ?? null, eventEndDate);
    return (
      <div
        className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4"
        role="status"
      >
        <p className="font-medium text-green-800">
          {success === "waitlist"
            ? "You're on the waitlist!"
            : "You're signed up!"}
        </p>
        {showLink && discordInviteUrl && (
          <p className="mt-3">
            <a
              href={discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded bg-[#5865F2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752C4]"
            >
              Join volunteer Discord channel
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="mt-4 rounded-xl border border-papa-border bg-papa-card p-4"
    >
      <input type="hidden" name="eventId" value={eventId} />
      {error && (
        <p
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {isEdit ? "Edit your signup" : "Volunteer Information"}
      </h3>
      <p className="mb-4 text-xs text-papa-muted">
        {isEdit ? "Update your role, contact info, or notes below." : ""}
      </p>
      <div className="mb-4">
        <label
          htmlFor="role"
          className="mb-1 block text-xs font-medium text-foreground"
        >
          Requested role: <span className="text-papa-accent">*</span>
        </label>
        <select
          id="role"
          name="role"
          value={selectedRole}
          onChange={(e) =>
            setSelectedRole((e.target.value || "") as SignupRole | "")
          }
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-sm text-foreground"
          required
        >
          <option value="">— Select —</option>
          {SIGNUP_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {selectedRole && selectedRole in SIGNUP_ROLE_DESCRIPTIONS && (
          <p
            className="mt-2 rounded border border-papa-border bg-papa-offwhite px-3 py-2 text-xs text-foreground"
            role="status"
            aria-live="polite"
          >
            {SIGNUP_ROLE_DESCRIPTIONS[selectedRole as SignupRole]}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="volunteer_status"
            className="mb-1 block text-xs font-medium text-foreground"
          >
            Volunteer Status
          </label>
          <select
            id="volunteer_status"
            name="volunteer_status"
            defaultValue={isEdit ? (initialValues?.volunteer_status ?? "") : ""}
            className="w-full rounded border border-papa-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt || "blank"} value={opt}>
                {opt || "— Select —"}
              </option>
            ))}
          </select>
          <p className="mt-0.5 text-xs text-papa-muted">
            e.g. Student, CFI, Job Searching Pilot, Industry Professional, Other
          </p>
        </div>
        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-xs font-medium text-foreground"
          >
            Phone <span className="text-papa-accent">*</span>
          </label>
          <PhoneInput
            id="phone"
            name="phone"
            defaultValue={isEdit ? (initialValues?.phone ?? "") : ""}
            placeholder="(555) 123-4567"
            className="w-full rounded border border-papa-border bg-background px-3 py-2 text-sm text-foreground"
            required
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_local"
            name="is_local"
            value="on"
            defaultChecked={isEdit ? (initialValues?.is_local ?? false) : false}
            className="h-4 w-4 rounded border-papa-border text-papa-navy"
          />
          <label htmlFor="is_local" className="text-sm text-foreground">
            I live within 2 hours driving distance of the event location
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="flight_voucher_requested"
            name="flight_voucher_requested"
            value="on"
            defaultChecked={isEdit ? (initialValues?.flight_voucher_requested ?? false) : false}
            className="h-4 w-4 rounded border-papa-border text-papa-navy"
          />
          <label
            htmlFor="flight_voucher_requested"
            className="text-sm text-foreground"
          >
            I am requesting a flight voucher for this event
          </label>
        </div>
      </div>
      <div className="mt-4">
        <label
          htmlFor="availability_notes"
          className="mb-1 block text-xs font-medium text-foreground"
        >
          Availability <span className="text-papa-muted">(Optional)</span>
        </label>
        <textarea
          id="availability_notes"
          name="availability_notes"
          rows={2}
          defaultValue={isEdit ? (initialValues?.availability_notes ?? "") : ""}
          placeholder="e.g. 9-11 AM only, or when you can staff the table if you’re also attending as a job seeker"
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="mt-4">
        <label
          htmlFor="travel_notes"
          className="mb-1 block text-xs font-medium text-foreground"
        >
          Travel / Accommodations {" "}
          <span className="text-papa-muted">(Optional)</span>
        </label>
        <textarea
          id="travel_notes"
          name="travel_notes"
          rows={2}
          defaultValue={isEdit ? (initialValues?.travel_notes ?? "") : ""}
          placeholder="e.g. Arrival/Departure times, Hotel or Airbnb desired, or if local and can you pick up volunteers"
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-papa-accent px-4 py-2 text-sm font-medium text-white hover:bg-papa-accent-hover disabled:opacity-50"
        >
          {submitting
            ? (isEdit ? "Saving…" : "Submitting…")
            : isEdit
              ? "Save changes"
              : full
                ? "Join waitlist"
                : "Sign up to volunteer"}
        </button>
        {(onCancel || (isEdit && onSaved)) && (
          <button
            type="button"
            onClick={() => (isEdit ? onSaved?.() : onCancel?.())}
            className="rounded border border-papa-border px-4 py-2 text-sm text-papa-muted hover:bg-papa-card hover:text-foreground"
          >
            {isEdit ? "Cancel" : "Cancel"}
          </button>
        )}
      </div>
    </form>
  );
}
