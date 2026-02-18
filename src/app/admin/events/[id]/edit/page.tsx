import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventForm } from '@/components/EventForm'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?next=/admin/events/${id}/edit`)
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Edit event
      </h1>
      <EventForm event={event} />
    </div>
  )
}
