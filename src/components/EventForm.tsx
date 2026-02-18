'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createEvent, updateEvent } from '@/app/actions/events'
import { TIMEZONE_LABELS } from '@/lib/types/database'
import type { Event } from '@/lib/types/database'

type Props = { event?: Event }

export function EventForm({ event }: Props) {
  const isEdit = !!event
  const [state, formAction] = useActionState(isEdit ? updateEvent : createEvent, null)

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {event && <input type="hidden" name="eventId" value={event.id} />}
      {state && 'error' in state && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}
      {state && 'ok' in state && state.ok && (
        <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800" role="status">
          {isEdit ? 'Event updated.' : 'Event created.'}
        </p>
      )}
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-foreground">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={event?.title}
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="mb-1 block text-sm font-medium text-foreground">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={event?.start_date}
            className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
          />
        </div>
        <div>
          <label htmlFor="end_date" className="mb-1 block text-sm font-medium text-foreground">
            End date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            required
            defaultValue={event?.end_date}
            className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_time" className="mb-1 block text-sm font-medium text-foreground">
            Start time (optional)
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            defaultValue={event?.start_time ?? ''}
            className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
          />
        </div>
        <div>
          <label htmlFor="end_time" className="mb-1 block text-sm font-medium text-foreground">
            End time (optional)
          </label>
          <input
            id="end_time"
            name="end_time"
            type="time"
            defaultValue={event?.end_time ?? ''}
            className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
          />
        </div>
      </div>
      <div>
        <label htmlFor="timezone" className="mb-1 block text-sm font-medium text-foreground">
          Time zone
        </label>
        <select
          id="timezone"
          name="timezone"
          required
          defaultValue={event?.timezone ?? 'America/New_York'}
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
        >
          {Object.entries(TIMEZONE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="location" className="mb-1 block text-sm font-medium text-foreground">
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. TBD or venue name"
          defaultValue={event?.location ?? ''}
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={event?.description ?? ''}
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="external_link" className="mb-1 block text-sm font-medium text-foreground">
          External link (e.g. event page / register)
        </label>
        <input
          id="external_link"
          name="external_link"
          type="url"
          placeholder="https://..."
          defaultValue={event?.external_link ?? ''}
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="image_url" className="mb-1 block text-sm font-medium text-foreground">
          Event photo URL
        </label>
        <input
          id="image_url"
          name="image_url"
          type="url"
          placeholder="https://... (optional; shows on list and detail)"
          defaultValue={event?.image_url ?? ''}
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="capacity" className="mb-1 block text-sm font-medium text-foreground">
          Volunteer capacity
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          required
          defaultValue={event?.capacity ?? 5}
          className="w-full rounded border border-papa-border bg-background px-3 py-2 text-foreground"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-papa-navy px-4 py-2 text-sm font-medium text-white hover:bg-papa-navy-dark"
        >
          {isEdit ? 'Update event' : 'Create event'}
        </button>
        {isEdit && (
          <Link
            href="/admin/events"
            className="rounded border border-papa-border px-4 py-2 text-sm font-medium text-foreground hover:bg-papa-card"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  )
}
