import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/admin/events')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) redirect('/')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link href="/admin/events" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Events
        </Link>
        <Link href="/admin/events/new" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          New event
        </Link>
      </div>
      {children}
    </div>
  )
}
