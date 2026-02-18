'use client'

import { useActionState, useState, useId } from 'react'
import Link from 'next/link'
import { createEvent, updateEvent } from '@/app/actions/events'
import { TIMEZONE_LABELS } from '@/lib/types/database'
import type { Event, VolunteerScheduleRow } from '@/lib/types/database'

const emptyScheduleRow = (): VolunteerScheduleRow => ({ day: '', time: '', event: '', room: '', notes: '' })

/** Normalize stored time to HH:MM for type="time" (e.g. "0800" -> "08:00", "0800-1200" -> first part). */
function timeToInputValue(t: string): string {
  const s = t.trim()
  if (!s) return ''
  const part = s.split(/[-–]/)[0].trim()
  if (part.length === 4 && /^\d{4}$/.test(part)) return `${part.slice(0, 2)}:${part.slice(2)}`
  if (part.length === 5 && /^\d{2}:\d{2}$/.test(part)) return part
  return part || ''
}

function timeEndToInputValue(t: string): string {
  const s = t.trim()
  if (!s) return ''
  const parts = s.split(/[-–]/)
  if (parts.length < 2) return ''
  const part = parts[1].trim()
  if (part.length === 4 && /^\d{4}$/.test(part)) return `${part.slice(0, 2)}:${part.slice(2)}`
  if (part.length === 5 && /^\d{2}:\d{2}$/.test(part)) return part
  return part || ''
}

/** Build stored time string from start (and optional end). */
function buildTimeString(start: string, end: string): string {
  const s = start.trim()
  if (!s) return ''
  const e = end.trim()
  return e ? `${s}–${e}` : s
}

function parseSchedule(raw: unknown): VolunteerScheduleRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r) => r && typeof r === 'object' && 'day' in r && 'time' in r && 'event' in r && 'room' in r)
    .map((r) => ({
      day: String((r as VolunteerScheduleRow).day ?? ''),
      time: String((r as VolunteerScheduleRow).time ?? ''),
      event: String((r as VolunteerScheduleRow).event ?? ''),
      room: String((r as VolunteerScheduleRow).room ?? ''),
      notes: String((r as VolunteerScheduleRow).notes ?? '').trim() || undefined,
    }))
}

type Props = { event?: Event }

export function EventForm({ event }: Props) {
  const isEdit = !!event
  const [state, formAction] = useActionState(isEdit ? updateEvent : createEvent, null)
  const [scheduleRows, setScheduleRows] = useState<VolunteerScheduleRow[]>(() =>
    event?.volunteer_schedule?.length ? parseSchedule(event.volunteer_schedule) : []
  )
  const formId = useId()

  const addScheduleRow = () =>
    setScheduleRows((prev) => [...prev, { ...emptyScheduleRow(), day: event?.start_date ?? '' }])
  const removeScheduleRow = (index: number) => setScheduleRows((prev) => prev.filter((_, i) => i !== index))
  const updateScheduleRow = (index: number, field: keyof VolunteerScheduleRow, value: string) => {
    setScheduleRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {event && <input type="hidden" name="eventId" value={event.id} />}
      <input type="hidden" name="volunteer_schedule" value={JSON.stringify(scheduleRows)} />
      {state && 'error' in state && (
        <p className="rounded-lg border-2 border-papa-accent/30 bg-red-50 p-3 text-sm font-medium text-papa-accent" role="alert">
          {state.error}
        </p>
      )}
      {state && 'ok' in state && state.ok && (
        <p className="rounded-lg border-2 border-green-600/30 bg-green-50 p-3 text-sm font-medium text-green-800" role="status">
          {isEdit ? 'Event updated.' : 'Event created.'}
        </p>
      )}
      <div>
        <label htmlFor="title" className="mb-1 block text-sm papa-form-label">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={event?.title}
          className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="mb-1 block text-sm papa-form-label">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={event?.start_date}
            className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
          />
        </div>
        <div>
          <label htmlFor="end_date" className="mb-1 block text-sm papa-form-label">
            End date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            required
            defaultValue={event?.end_date}
            className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_time" className="mb-1 block text-sm papa-form-label">
            Start time (optional)
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            defaultValue={event?.start_time ?? ''}
            className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
          />
        </div>
        <div>
          <label htmlFor="end_time" className="mb-1 block text-sm papa-form-label">
            End time (optional)
          </label>
          <input
            id="end_time"
            name="end_time"
            type="time"
            defaultValue={event?.end_time ?? ''}
            className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
          />
        </div>
      </div>
      <div>
        <label htmlFor="timezone" className="mb-1 block text-sm papa-form-label">
          Time zone
        </label>
        <select
          id="timezone"
          name="timezone"
          required
          defaultValue={event?.timezone ?? 'America/New_York'}
          className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
        >
          {Object.entries(TIMEZONE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="location" className="mb-1 block text-sm papa-form-label">
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. TBD or venue name"
          defaultValue={event?.location ?? ''}
          className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm papa-form-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={event?.description ?? ''}
          className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="external_link" className="mb-1 block text-sm papa-form-label">
          External link (e.g. event page / register)
        </label>
        <input
          id="external_link"
          name="external_link"
          type="url"
          placeholder="https://..."
          defaultValue={event?.external_link ?? ''}
          className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="image_url" className="mb-1 block text-sm papa-form-label">
          Event photo URL
        </label>
        <input
          id="image_url"
          name="image_url"
          type="url"
          placeholder="https://... (optional; shows on list and detail)"
          defaultValue={event?.image_url ?? ''}
          className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div className="rounded-lg border-2 border-papa-form-border bg-papa-card/80 p-4">
        <span className="mb-1 block text-sm papa-form-label">
          Volunteer schedule (only visible to signed-up volunteers)
        </span>
        <p className="mb-2 text-xs text-papa-muted">
          Add rows for setup, meals, and sessions so volunteers see a quick table. Different rooms and times per row are fine.
        </p>
        <div className="space-y-3 rounded-lg border-2 border-papa-form-border/60 bg-background p-3">
          {scheduleRows.length === 0 ? (
            <p className="text-sm text-papa-muted">No schedule rows yet.</p>
          ) : (
            scheduleRows.map((row, index) => (
              <div
                key={`${formId}-${index}`}
                className="flex flex-col gap-3 rounded-lg border-2 border-papa-form-border/50 bg-white p-3 sm:grid sm:grid-cols-[8rem_6rem_6rem_1fr_1fr_1fr_auto] sm:grid-rows-1 sm:items-end"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-papa-muted">Day</label>
                  <input
                    type="date"
                    aria-label="Day"
                    value={row.day}
                    onChange={(e) => updateScheduleRow(index, 'day', e.target.value)}
                    className="papa-form-input w-full min-w-0 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-papa-muted">Start time</label>
                  <input
                    type="time"
                    aria-label="Start time"
                    value={timeToInputValue(row.time)}
                    onChange={(e) =>
                      updateScheduleRow(index, 'time', buildTimeString(e.target.value, timeEndToInputValue(row.time)))
                    }
                    className="papa-form-input w-full min-w-0 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-papa-muted">End time</label>
                  <input
                    type="time"
                    aria-label="End time"
                    value={timeEndToInputValue(row.time)}
                    onChange={(e) =>
                      updateScheduleRow(index, 'time', buildTimeString(timeToInputValue(row.time), e.target.value))
                    }
                    className="papa-form-input w-full min-w-0 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-papa-muted">Event / session</label>
                  <input
                    type="text"
                    placeholder="e.g. Setup, Breakfast"
                    aria-label="Event / session"
                    value={row.event}
                    onChange={(e) => updateScheduleRow(index, 'event', e.target.value)}
                    className="papa-form-input min-w-0 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-papa-muted">Room(s)</label>
                  <input
                    type="text"
                    placeholder="e.g. Ballroom A"
                    aria-label="Room(s)"
                    value={row.room}
                    onChange={(e) => updateScheduleRow(index, 'room', e.target.value)}
                    className="papa-form-input min-w-0 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-papa-muted">Notes (optional)</label>
                  <input
                    type="text"
                    placeholder="Extra details"
                    aria-label="Notes"
                    value={row.notes ?? ''}
                    onChange={(e) => updateScheduleRow(index, 'notes', e.target.value)}
                    className="papa-form-input min-w-0 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeScheduleRow(index)}
                  className="shrink-0 rounded border-2 border-papa-accent/50 bg-red-50 px-2 py-1.5 text-sm font-medium text-papa-accent hover:bg-papa-accent hover:text-white sm:h-9 sm:justify-self-end"
                  aria-label="Remove row"
                >
                  Remove
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addScheduleRow}
            className="rounded border-2 border-papa-navy bg-white px-3 py-1.5 text-sm font-medium text-papa-navy hover:bg-papa-navy hover:text-white"
          >
            Add schedule row
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="volunteer_details" className="mb-1 block text-sm papa-form-label">
          Full coordinator email / details
        </label>
        <textarea
          id="volunteer_details"
          name="volunteer_details"
          rows={10}
          placeholder="Paste the full coordinator email or notes (venue, transport, shipping, meals, etc.). Shown below the schedule table for volunteers who want full context."
          defaultValue={event?.volunteer_details ?? ''}
          className="papa-form-input w-full rounded bg-background px-3 py-2 text-sm text-foreground font-mono"
        />
        <p className="mt-1 text-xs text-papa-muted">
          Only people who have signed up for this event see the schedule and this text. Update whenever you get new details.
        </p>
      </div>
      <div>
        <label htmlFor="capacity" className="mb-1 block text-sm papa-form-label">
          Volunteer capacity
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          required
          defaultValue={event?.capacity ?? 5}
          className="papa-form-input w-full rounded bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div className="flex flex-wrap gap-3 border-t-2 border-papa-form-border pt-4">
        <button
          type="submit"
          className="rounded bg-papa-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-papa-accent-hover"
        >
          {isEdit ? 'Update event' : 'Create event'}
        </button>
        {isEdit && (
          <Link
            href="/admin/events"
            className="rounded border-2 border-papa-navy bg-white px-5 py-2.5 text-sm font-semibold text-papa-navy hover:bg-papa-navy hover:text-white"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  )
}
