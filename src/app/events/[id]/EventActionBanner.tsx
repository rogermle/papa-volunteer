'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export function EventActionBanner() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const left = searchParams.get('left')
    if (left === '1') {
      setMessage("You've cancelled your sign-up.")
      const url = new URL(window.location.href)
      url.searchParams.delete('left')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [searchParams])

  if (!message) return null

  return (
    <div
      className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
      role="status"
    >
      {message}
    </div>
  )
}
