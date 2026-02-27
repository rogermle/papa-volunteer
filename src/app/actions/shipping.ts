'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Carrier } from '@/lib/types/database'
import { trackUspsPackage } from '@/lib/shipping/usps'

function assertAdmin(profile: { is_admin?: boolean | null } | null) {
  if (!profile?.is_admin) {
    return { error: 'Admins only.' as const }
  }
  return null
}

export async function createShipment(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const adminError = assertAdmin(profile)
  if (adminError) return adminError

  const trackingNumber = (formData.get('tracking_number') as string)?.trim()
  if (!trackingNumber) return { error: 'Tracking number is required.' }

  const carrierRaw = ((formData.get('carrier') as string) || 'USPS').trim().toUpperCase()
  const carrier: Carrier = carrierRaw as Carrier
  if (carrier !== 'USPS') {
    return { error: 'Only USPS is supported at this time.' }
  }

  const eventId = ((formData.get('event_id') as string) || '').trim() || null
  const notesRaw = (formData.get('notes') as string) || ''
  const notes = notesRaw.trim() || null

  const { error } = await supabase.from('shipments').insert({
    event_id: eventId,
    to_signup_id: null,
    from_profile_id: user.id,
    carrier,
    tracking_number: trackingNumber,
    status: null,
    status_raw: null,
    expected_delivery_date: null,
    last_checked_at: null,
    delivered_at: null,
    notes,
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/shipping')
  if (eventId) {
    revalidatePath(`/admin/events/${eventId}/signups`)
  }

  return { ok: true as const }
}

export async function refreshShipment(_prevState: unknown, formData: FormData) {
  const shipmentId = (formData.get('shipment_id') as string)?.trim()
  if (!shipmentId) return { error: 'Missing shipment.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const adminError = assertAdmin(profile)
  if (adminError) return adminError

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, event_id, carrier, tracking_number')
    .eq('id', shipmentId)
    .single()

  if (!shipment) return { error: 'Shipment not found.' }
  if (shipment.carrier !== 'USPS') {
    return { error: 'Only USPS shipments can be refreshed.' }
  }

  let statusResult
  try {
    statusResult = await trackUspsPackage(shipment.tracking_number)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to contact USPS.' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('shipments')
    .update({
      status: statusResult.status,
      status_raw: statusResult.raw as any,
      expected_delivery_date: statusResult.expectedDeliveryDate,
      last_checked_at: now,
      delivered_at: statusResult.deliveredAt,
    })
    .eq('id', shipment.id)
  if (error) return { error: error.message }

  revalidatePath('/admin/shipping')
  if (shipment.event_id) {
    revalidatePath(`/admin/events/${shipment.event_id}/signups`)
  }

  return { ok: true as const }
}

