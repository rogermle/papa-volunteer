'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setEventArchived } from '@/app/actions/events'

export function ArchiveEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await setEventArchived(eventId, true)
          router.refresh()
        })
      }}
      disabled={isPending}
      className="text-sm text-papa-muted hover:text-papa-navy hover:underline disabled:opacity-50"
    >
      {isPending ? '…' : 'Archive'}
    </button>
  )
}

export function UnarchiveEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await setEventArchived(eventId, false)
          router.refresh()
        })
      }}
      disabled={isPending}
      className="text-sm text-papa-muted hover:text-papa-navy hover:underline disabled:opacity-50"
    >
      {isPending ? '…' : 'Unarchive'}
    </button>
  )
}
