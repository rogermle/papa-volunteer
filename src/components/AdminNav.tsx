'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/events/new', label: 'New event' },
  { href: '/admin/shipping', label: 'Shipping' },
  { href: '/admin/chat-log', label: 'Chat log' },
] as const

export function AdminNav() {
  const pathname = usePathname()
  return (
    <div className="flex items-center gap-4 border-b border-papa-border pb-4">
      {links.map(({ href, label }) => {
        const isActive =
          pathname === href ||
          (href === '/admin/events' && pathname.startsWith('/admin/events')) ||
          (href !== '/admin/events' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? 'text-sm font-medium text-foreground'
                : 'text-sm text-papa-muted hover:text-papa-navy'
            }
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
