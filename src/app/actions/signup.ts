'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { SIGNUP_ROLES, type SignupRole } from '@/lib/types/database'
import { geocodeAddress } from '@/lib/geocode'

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

  const roleRaw = (formData.get('role') as string)?.trim() || null
  const role: SignupRole | null =
    roleRaw && SIGNUP_ROLES.includes(roleRaw as SignupRole) ? (roleRaw as SignupRole) : null
  const volunteerStatus = (formData.get('volunteer_status') as string)?.trim() || null
  const phoneRaw = (formData.get('phone') as string)?.trim() || ''
  const phone = phoneRaw.replace(/\D/g, '').length >= 10 ? phoneRaw : null
  if (!phone) return { error: 'A valid phone number (10 digits) is required.' }
  const isLocal = formData.get('is_local') === 'on'
  const flightVoucherRequested = formData.get('flight_voucher_requested') === 'on'
  const availabilityNotes = (formData.get('availability_notes') as string)?.trim() || null
  const travelNotes = (formData.get('travel_notes') as string)?.trim() || null

  let mailingAddress: string | null = null
  let mailingAddressLat: number | null = null
  let mailingAddressLon: number | null = null
  if (role === 'Lead Volunteer') {
    const raw = (formData.get('mailing_address') as string)?.trim() || null
    if (!raw) return { error: 'Mailing address is required for Lead Volunteer.' }
    const geocode = await geocodeAddress(raw)
    if (!geocode) return { error: "We couldn't find this address. Please check and try again." }
    mailingAddress = raw
    mailingAddressLat = geocode.lat
    mailingAddressLon = geocode.lon
  }

  const { error } = await supabase.from('event_signups').insert({
    event_id: eventId,
    user_id: user.id,
    waitlist_position: waitlistPosition,
    role,
    volunteer_status: volunteerStatus,
    phone,
    is_local: isLocal,
    flight_voucher_requested: flightVoucherRequested,
    availability_notes: availabilityNotes,
    travel_notes: travelNotes,
    mailing_address: mailingAddress,
    mailing_address_lat: mailingAddressLat,
    mailing_address_lon: mailingAddressLon,
  })
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/my-signups')
  revalidatePath('/my-schedule')
  revalidatePath('/calendar')
  return { ok: true, waitlist: atCapacity }
}

export async function updateSignup(formData: FormData) {
  const eventId = formData.get('eventId') as string
  if (!eventId) return { error: 'Missing event.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: existing } = await supabase
    .from('event_signups')
    .select('id, mailing_address, mailing_address_lat, mailing_address_lon')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()
  if (!existing) return { error: 'You are not signed up for this event.' }

  const roleRaw = (formData.get('role') as string)?.trim() || null
  const role: SignupRole | null =
    roleRaw && SIGNUP_ROLES.includes(roleRaw as SignupRole) ? (roleRaw as SignupRole) : null
  const volunteerStatus = (formData.get('volunteer_status') as string)?.trim() || null
  const phoneRaw = (formData.get('phone') as string)?.trim() || ''
  const phone = phoneRaw.replace(/\D/g, '').length >= 10 ? phoneRaw : null
  if (!phone) return { error: 'A valid phone number (10 digits) is required.' }
  const isLocal = formData.get('is_local') === 'on'
  const flightVoucherRequested = formData.get('flight_voucher_requested') === 'on'
  const availabilityNotes = (formData.get('availability_notes') as string)?.trim() || null
  const travelNotes = (formData.get('travel_notes') as string)?.trim() || null

  let mailingAddress: string | null = (existing as any).mailing_address ?? null
  let mailingAddressLat: number | null = (existing as any).mailing_address_lat ?? null
  let mailingAddressLon: number | null = (existing as any).mailing_address_lon ?? null

  if (role === 'Lead Volunteer') {
    const raw = (formData.get('mailing_address') as string)?.trim() || null
    if (!raw) return { error: 'Mailing address is required for Lead Volunteer.' }

    const existingRaw = (existing as any).mailing_address?.trim() || null
    if (existingRaw && raw === existingRaw) {
      // Address unchanged: keep existing lat/lon and skip geocoding
      mailingAddress = (existing as any).mailing_address ?? null
      mailingAddressLat = (existing as any).mailing_address_lat ?? null
      mailingAddressLon = (existing as any).mailing_address_lon ?? null
    } else {
      const geocode = await geocodeAddress(raw)
      if (!geocode) return { error: "We couldn't find this address. Please check and try again." }
      mailingAddress = raw
      mailingAddressLat = geocode.lat
      mailingAddressLon = geocode.lon
    }
  } else {
    // When switching away from Lead Volunteer, clear address fields
    mailingAddress = null
    mailingAddressLat = null
    mailingAddressLon = null
  }

  const updatePayload = {
    role,
    volunteer_status: volunteerStatus,
    phone,
    is_local: isLocal,
    flight_voucher_requested: flightVoucherRequested,
    availability_notes: availabilityNotes,
    travel_notes: travelNotes,
    mailing_address: mailingAddress,
    mailing_address_lat: mailingAddressLat,
    mailing_address_lon: mailingAddressLon,
  }

  const { error } = await supabase
    .from('event_signups')
    .update(updatePayload)
    .eq('event_id', eventId)
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/my-signups')
  revalidatePath('/my-schedule')
  revalidatePath('/calendar')
  return { ok: true }
}

export async function validateMailingAddress(address: string) {
  const raw = address?.trim() || null
  if (!raw) return { error: 'Please enter an address.' }
  const result = await geocodeAddress(raw)
  if (!result) return { error: "We couldn't find this address. Please check and try again." }
  return { ok: true as const, lat: result.lat, lon: result.lon, displayName: result.displayName }
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
  revalidatePath('/my-signups')
  revalidatePath('/my-schedule')
  revalidatePath('/calendar')
  return { ok: true }
}
