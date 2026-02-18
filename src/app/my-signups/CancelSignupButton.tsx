'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { leaveEvent } from '@/app/actions/signup'

type Props = { eventId: string }

export function CancelSignupButton({ eventId }: Props) {
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLeaving(true)
    const result = await leaveEvent(formData)
    setLeaving(false)
    if (result && 'error' in result) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}
      <form action={handleSubmit}>
        <input type="hidden" name="eventId" value={eventId} />
        <button
          type="submit"
          disabled={leaving}
          className="rounded border border-papa-border px-3 py-1.5 text-sm text-papa-muted hover:bg-papa-card hover:text-foreground disabled:opacity-50"
        >
          {leaving ? 'Cancelling…' : 'Cancel sign-up'}
        </button>
      </form>
    </div>
  )
}
