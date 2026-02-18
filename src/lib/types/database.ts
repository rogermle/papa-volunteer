export type Timezone = 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles'

export interface Profile {
  id: string
  discord_id: string | null
  discord_username: string | null
  avatar_url: string | null
  display_name: string | null
  onboarding_completed_at: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  timezone: Timezone
  location: string | null
  description: string | null
  external_link: string | null
  image_url: string | null
  capacity: number
  created_at: string
  updated_at: string
}

export interface EventSignup {
  id: string
  event_id: string
  user_id: string
  waitlist_position: number | null
  volunteer_status: string | null
  phone: string | null
  is_local: boolean | null
  flight_voucher_requested: boolean | null
  availability_notes: string | null
  travel_notes: string | null
  created_at: string
}

export interface EventWithSignups extends Event {
  signups: (EventSignup & { profile?: Profile | null })[]
  signup_count: number
  waitlist_count: number
}

export const TIMEZONE_LABELS: Record<Timezone, string> = {
  'America/New_York': 'Eastern',
  'America/Chicago': 'Central',
  'America/Denver': 'Mountain',
  'America/Los_Angeles': 'Pacific',
}

/** Format a time string (HH:MM:SS or HH:MM) as event-local "8:00 AM" (no UTC conversion). */
export function formatTimeLocal(t: string | null): string | null {
  if (!t) return null
  const parts = t.trim().split(':')
  const hour = parseInt(parts[0], 10)
  if (Number.isNaN(hour)) return null
  const minute = parts[1]?.slice(0, 2) ?? '00'
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${minute} ${ampm}`
}
