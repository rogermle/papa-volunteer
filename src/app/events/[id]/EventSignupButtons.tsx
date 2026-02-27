'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { leaveEvent } from '@/app/actions/signup'
import { VolunteerSignupForm } from './VolunteerSignupForm'

type MySignup = {
  waitlist_position: number | null
  role: string | null
  volunteer_status: string | null
  phone: string | null
  is_local: boolean | null
  flight_voucher_requested: boolean | null
  availability_notes: string | null
  travel_notes: string | null
  mailing_address: string | null
  mailing_address_lat: number | null
  mailing_address_lon: number | null
}

type Props = {
  eventId: string
  capacity: number
  confirmedCount: number
  mySignup: MySignup | null
  isLoggedIn: boolean
  discordInviteUrl: string | null
  eventEndDate: string
}

function showDiscordLink(discordInviteUrl: string | null, eventEndDate: string): boolean {
  if (!discordInviteUrl?.trim()) return false
  const today = new Date().toISOString().slice(0, 10)
  return eventEndDate >= today
}

export function EventSignupButtons({ eventId, capacity, confirmedCount, mySignup, isLoggedIn, discordInviteUrl, eventEndDate }: Props) {
  const full = confirmedCount >= capacity
  const searchParams = useSearchParams()
  const [showSignupForm, setShowSignupForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (mySignup && searchParams.get('edit') === '1') setShowEditForm(true)
  }, [mySignup, searchParams])

  async function handleLeave(formData: FormData) {
    setLeaveError(null)
    setLeaving(true)
    const result = await leaveEvent(formData)
    setLeaving(false)
    if (result && 'error' in result) {
      setLeaveError(result.error ?? 'Something went wrong.')
      return
    }
    router.push(`/events/${eventId}?left=1`)
    router.refresh()
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-papa-muted">
          Sign in to sign up and show your interest.
        </p>
        <Link
          href={`/auth/signin?next=${encodeURIComponent(`/events/${eventId}`)}`}
          className="inline-flex rounded bg-papa-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-papa-accent-hover"
        >
          Sign in with Discord
        </Link>
      </div>
    )
  }

  if (mySignup && showEditForm) {
    return (
      <VolunteerSignupForm
        eventId={eventId}
        full={confirmedCount >= capacity}
        mode="edit"
        initialValues={{
          role: mySignup.role,
          volunteer_status: mySignup.volunteer_status,
          phone: mySignup.phone,
          is_local: mySignup.is_local,
          flight_voucher_requested: mySignup.flight_voucher_requested,
          availability_notes: mySignup.availability_notes,
          travel_notes: mySignup.travel_notes,
          mailing_address: mySignup.mailing_address,
          mailing_address_lat: mySignup.mailing_address_lat,
          mailing_address_lon: mySignup.mailing_address_lon,
        }}
        onSaved={() => setShowEditForm(false)}
        discordInviteUrl={discordInviteUrl}
        eventEndDate={eventEndDate}
      />
    )
  }

  if (mySignup) {
    const onWaitlist = mySignup.waitlist_position != null
    const showLink = !onWaitlist && showDiscordLink(discordInviteUrl, eventEndDate)
    const hasDetails = mySignup.role || mySignup.volunteer_status || mySignup.phone != null || mySignup.is_local != null || mySignup.flight_voucher_requested != null || mySignup.availability_notes || mySignup.travel_notes
    return (
      <div className="mt-2 w-full rounded-xl border border-green-200 bg-green-50/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-green-200/80 px-2 py-0.5 text-sm font-medium text-green-900">
            {onWaitlist ? `You're on the waitlist (#${mySignup.waitlist_position})` : "You're signed up"}
          </span>
          {mySignup.role && (
            <span className="rounded bg-green-200/60 px-2 py-0.5 text-sm text-green-900">
              {mySignup.role}
            </span>
          )}
        </div>
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
        {hasDetails && (
          <dl className="mt-3 grid gap-1.5 text-sm text-green-900/90">
            {mySignup.role && (
              <>
                <dt className="font-medium text-green-800">Role</dt>
                <dd>{mySignup.role}</dd>
              </>
            )}
            {mySignup.volunteer_status && (
              <>
                <dt className="font-medium text-green-800">Status</dt>
                <dd>{mySignup.volunteer_status}</dd>
              </>
            )}
            {mySignup.phone && (
              <>
                <dt className="font-medium text-green-800">Phone</dt>
                <dd>{mySignup.phone}</dd>
              </>
            )}
            {mySignup.is_local != null && (
              <>
                <dt className="font-medium text-green-800">Local to event</dt>
                <dd>{mySignup.is_local ? 'Yes' : 'No'}</dd>
              </>
            )}
            {mySignup.flight_voucher_requested != null && (
              <>
                <dt className="font-medium text-green-800">Flight voucher requested</dt>
                <dd>{mySignup.flight_voucher_requested ? 'Yes' : 'No'}</dd>
              </>
            )}
            {mySignup.availability_notes && (
              <>
                <dt className="font-medium text-green-800">Availability</dt>
                <dd className="whitespace-pre-wrap">{mySignup.availability_notes}</dd>
              </>
            )}
            {mySignup.travel_notes && (
              <>
                <dt className="font-medium text-green-800">Travel / accommodations</dt>
                <dd className="whitespace-pre-wrap">{mySignup.travel_notes}</dd>
              </>
            )}
          </dl>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {leaveError && (
            <p className="text-sm text-red-600" role="alert">{leaveError}</p>
          )}
          <button
            type="button"
            onClick={() => setShowEditForm(true)}
            className="rounded border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100"
          >
            Edit my signup
          </button>
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-foreground">Are you sure? This will remove your sign-up.</span>
              <form action={handleLeave} className="inline">
                <input type="hidden" name="eventId" value={eventId} />
                <button
                  type="submit"
                  disabled={leaving}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {leaving ? 'Cancelling…' : 'Yes, cancel my sign-up'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded border border-papa-border bg-white px-3 py-1.5 text-sm text-foreground hover:bg-papa-card"
              >
                Keep my sign-up
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Cancel sign-up
            </button>
          )}
        </div>
      </div>
    )
  }

  if (showSignupForm) {
    return (
      <VolunteerSignupForm
        eventId={eventId}
        full={full}
        onCancel={() => setShowSignupForm(false)}
        discordInviteUrl={discordInviteUrl}
        eventEndDate={eventEndDate}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setShowSignupForm(true)}
      className="rounded bg-papa-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-papa-accent-hover"
    >
      {full ? 'Join waitlist' : 'Sign up to volunteer'}
    </button>
  )
}
