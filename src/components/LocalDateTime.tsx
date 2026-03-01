'use client'

import { useEffect, useState } from 'react'

/**
 * Renders an ISO date string in the user's local time with their timezone
 * (e.g. "Feb 26, 2025, 3:45 PM PST"). Uses client-side formatting so the
 * timezone is the viewer's, not the server's.
 */
export function LocalDateTime({
  isoDate,
  className,
}: {
  isoDate: string | null
  className?: string
}) {
  const [formatted, setFormatted] = useState<string | null>(null)

  useEffect(() => {
    if (!isoDate) {
      setFormatted('—')
      return
    }
    const d = new Date(isoDate)
    const str = d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })
    setFormatted(str)
  }, [isoDate])

  if (!isoDate) {
    return (
      <span className={className ?? 'text-papa-muted'}>—</span>
    )
  }
  return (
    <span className={className ?? 'text-papa-muted'} title={isoDate}>
      {formatted ?? '…'}
    </span>
  )
}
