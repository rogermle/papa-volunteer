'use client'

import { signUpForEvent, leaveEvent } from '@/app/actions/signup'

type Props = {
  eventId: string
  capacity: number
  confirmedCount: number
  mySignup: { waitlist_position: number | null } | null
}

const noReturn = (fn: (fd: FormData) => Promise<unknown>) =>
  (fd: FormData) => fn(fd).then(() => {})

export function EventSignupButtons({ eventId, capacity, confirmedCount, mySignup }: Props) {
  const full = confirmedCount >= capacity

  if (mySignup) {
    return (
      <form action={noReturn(leaveEvent)} className="inline">
        <input type="hidden" name="eventId" value={eventId} />
        <button
          type="submit"
          className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          {mySignup.waitlist_position != null ? 'Leave waitlist' : 'Leave event'}
        </button>
      </form>
    )
  }

  return (
    <form action={noReturn(signUpForEvent)} className="inline">
      <input type="hidden" name="eventId" value={eventId} />
      <button
        type="submit"
        className="rounded bg-[#5865F2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4]"
      >
        {full ? 'Join waitlist' : 'Sign up to volunteer'}
      </button>
    </form>
  )
}
