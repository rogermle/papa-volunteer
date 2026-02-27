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
      <div className="flex items-center gap-4 border-b border-papa-border pb-4">
        <Link href="/admin/events" className="text-sm font-medium text-foreground">
          Events
        </Link>
        <Link href="/admin/events/new" className="text-sm text-papa-muted hover:text-papa-navy">
          New event
        </Link>
        <Link href="/admin/shipping" className="text-sm text-papa-muted hover:text-papa-navy">
          Shipping
        </Link>
        <Link href="/admin/chat-log" className="text-sm text-papa-muted hover:text-papa-navy">
          Chat log
        </Link>
      </div>
      {children}
    </div>
  )
}
