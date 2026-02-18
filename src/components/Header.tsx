'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Header() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<{ discord_username: string | null; is_admin: boolean } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const client = createClient()
    client.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null)
      if (u) {
        client
          .from('profiles')
          .select('discord_username, is_admin')
          .eq('id', u.id)
          .single()
          .then(({ data }) => setProfile(data ?? null))
      } else {
        setProfile(null)
      }
    })
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => router.refresh())
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-100">
          PAPA Volunteer
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/calendar" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Calendar
          </Link>
          {profile?.is_admin && (
            <Link href="/admin/events" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Admin
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {profile?.discord_username ?? user.email ?? 'Signed in'}
              </span>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-400">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <form action="/auth/signin" method="post">
              <button
                type="submit"
                className="rounded bg-[#5865F2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4]"
              >
                Sign in with Discord
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  )
}
