import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventForm } from '../../../../components/EventForm'

export default async function NewEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/admin/events/new')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">
        New event
      </h1>
      <EventForm />
    </div>
  )
}
