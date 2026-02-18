'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { leaveEvent } from '@/app/actions/signup'

type Props = { eventId: string }

export function CancelSignupButton({ eventId }: Props) {
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLeaving(true)
    const result = await leaveEvent(formData)
    setLeaving(false)
    if (result && 'error' in result) {
      setError(result.error ?? 'Something went wrong.')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}
      {confirming ? (
        <div className="flex flex-wrap items-end justify-end gap-2">
          <span className="text-xs text-foreground">Remove your sign-up?</span>
          <form action={handleSubmit}>
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              disabled={leaving}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {leaving ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded border border-papa-border px-3 py-1.5 text-sm text-foreground hover:bg-papa-card"
          >
            Keep sign-up
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
  )
}
