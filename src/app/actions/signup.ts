'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function signUpForEvent(formData: FormData) {
  const eventId = formData.get('eventId') as string
  if (!eventId) return { error: 'Missing event.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to sign up.' }

  const { data: event } = await supabase.from('events').select('capacity').eq('id', eventId).single()
  if (!event) return { error: 'Event not found.' }

  const { data: existing } = await supabase
    .from('event_signups')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()
  if (existing) return { error: 'You are already signed up for this event.' }

  const { count: confirmedCount } = await supabase
    .from('event_signups')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('waitlist_position', null)

  const atCapacity = (confirmedCount ?? 0) >= event.capacity
  let waitlistPosition: number | null = null
  if (atCapacity) {
    const { data: lastWaitlist } = await supabase
      .from('event_signups')
      .select('waitlist_position')
      .eq('event_id', eventId)
      .not('waitlist_position', 'is', null)
      .order('waitlist_position', { ascending: false })
      .limit(1)
      .single()
    waitlistPosition = (lastWaitlist?.waitlist_position ?? 0) + 1
  }

  const { error } = await supabase.from('event_signups').insert({
    event_id: eventId,
    user_id: user.id,
    waitlist_position: waitlistPosition,
  })
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/calendar')
  return { ok: true, waitlist: atCapacity }
}

export async function leaveEvent(formData: FormData) {
  const eventId = formData.get('eventId') as string
  if (!eventId) return { error: 'Missing event.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('event_signups')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/calendar')
  return { ok: true }
}
