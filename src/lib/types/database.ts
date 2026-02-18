export type Timezone = 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles'

export interface Profile {
  id: string
  discord_id: string | null
  discord_username: string | null
  avatar_url: string | null
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
  capacity: number
  created_at: string
  updated_at: string
}

export interface EventSignup {
  id: string
  event_id: string
  user_id: string
  waitlist_position: number | null
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
