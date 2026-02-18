'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Timezone, VolunteerScheduleRow } from '@/lib/types/database'

const TIMEZONES: Timezone[] = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Pacific/Honolulu']

function parseFormEvent(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const start_time = (formData.get('start_time') as string)?.trim() || null
  const end_time = (formData.get('end_time') as string)?.trim() || null
  const timezone = formData.get('timezone') as Timezone
  const location = (formData.get('location') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const external_link = (formData.get('external_link') as string)?.trim() || null
  const image_url = (formData.get('image_url') as string)?.trim() || null
  const volunteer_details = (formData.get('volunteer_details') as string)?.trim() || null
  let volunteer_schedule: VolunteerScheduleRow[] = []
  try {
    const raw = formData.get('volunteer_schedule')
    if (typeof raw === 'string' && raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        volunteer_schedule = parsed
          .filter((r) => r && typeof r === 'object' && 'day' in r && 'time' in r && 'event' in r && 'room' in r)
          .map((r) => ({
            day: String((r as VolunteerScheduleRow).day ?? ''),
            time: String((r as VolunteerScheduleRow).time ?? ''),
            event: String((r as VolunteerScheduleRow).event ?? ''),
            room: String((r as VolunteerScheduleRow).room ?? ''),
            notes: String((r as VolunteerScheduleRow).notes ?? '').trim() || undefined,
          }))
      }
    }
  } catch {
    volunteer_schedule = []
  }
  const capacity = parseInt(String(formData.get('capacity')), 10)
  if (!title || !start_date || !end_date || !timezone || TIMEZONES.includes(timezone) === false || capacity < 1) {
    return { error: 'Missing or invalid fields.' }
  }
  return {
    title,
    start_date,
    end_date,
    start_time,
    end_time,
    timezone,
    location,
    description,
    external_link,
    image_url,
    volunteer_details,
    volunteer_schedule,
    capacity,
  }
}

export async function createEvent(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Admins only.' }

  const parsed = parseFormEvent(formData)
  if ('error' in parsed) return parsed
  const { error } = await supabase.from('events').insert(parsed)
  if (error) return { error: error.message }
  revalidatePath('/admin/events')
  revalidatePath('/events')
  revalidatePath('/calendar')
  return { ok: true }
}

export async function updateEvent(_prevState: unknown, formData: FormData) {
  const eventId = formData.get('eventId') as string
  if (!eventId) return { error: 'Missing event.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Admins only.' }

  const parsed = parseFormEvent(formData)
  if ('error' in parsed) return parsed
  const { error } = await supabase.from('events').update(parsed).eq('id', eventId)
  if (error) return { error: error.message }
  revalidatePath('/admin/events')
  revalidatePath('/events')
  revalidatePath('/calendar')
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
