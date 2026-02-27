export type Timezone = 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'Pacific/Honolulu'

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

/** One row in the volunteer schedule table (multiple rooms/times per event). */
export interface VolunteerScheduleRow {
  day: string
  time: string
  event: string
  room: string
  notes?: string
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
  discord_invite_url: string | null
  image_url: string | null
  volunteer_details: string | null
  volunteer_schedule: VolunteerScheduleRow[]
  capacity: number
  created_at: string
  updated_at: string
}

/** Event role when signing up (what they will do at the event). */
export type SignupRole = 'Volunteer' | 'Lead Volunteer' | 'Photographer'

export const SIGNUP_ROLES: SignupRole[] = ['Volunteer', 'Lead Volunteer', 'Photographer']

export const SIGNUP_ROLE_DESCRIPTIONS: Record<SignupRole, string> = {
  'Volunteer':
    'Staff the table, greet/recruit attendees to join PAPA, hand out materials/PAPA swag, and share your pilot experience!',
  'Lead Volunteer':
    'Coordinate with the team, help set up and tear down, and be a main point of contact for the event.',
  'Photographer':
    'Capture photos and short clips of the event for PAPA social media and newsletter.',
}

export interface EventSignup {
  id: string
  event_id: string
  user_id: string
  waitlist_position: number | null
  role: SignupRole | null
  volunteer_status: string | null
  phone: string | null
  is_local: boolean | null
  flight_voucher_requested: boolean | null
  availability_notes: string | null
  travel_notes: string | null
  mailing_address: string | null
  mailing_address_lat: number | null
  mailing_address_lon: number | null
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
  'Pacific/Honolulu': 'Hawaii',
}

/** Format a schedule row day (YYYY-MM-DD or "Thu") for display, including year. */
export function formatScheduleDay(day: string): string {
  if (!day) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const d = new Date(day + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }
  return day
}

/** Parse "HH:MM" or "HH:MM–HH:MM" to 12h AM/PM. */
function scheduleTimeTo12h(part: string): string {
  const s = part.trim()
  if (!s) return ''
  const [h, m] = s.split(':')
  const hour = parseInt(h ?? '0', 10)
  if (Number.isNaN(hour)) return s
  const minute = (m ?? '00').slice(0, 2)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${minute} ${ampm}`
}

/** Format schedule row time with timezone (e.g. "6:00 PM – 8:00 PM Eastern"). */
export function formatScheduleTimeWithTz(time: string, tzLabel: string): string {
  if (!time || !tzLabel) return time ? `${time} ${tzLabel}` : '—'
  const parts = time.split(/[-–]/).map((p) => p.trim())
  const start = scheduleTimeTo12h(parts[0] ?? '')
  const end = parts[1] ? scheduleTimeTo12h(parts[1]) : ''
  const timeStr = end ? `${start} – ${end}` : start
  return `${timeStr} ${tzLabel}`
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
