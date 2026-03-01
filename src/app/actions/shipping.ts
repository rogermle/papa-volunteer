'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CARRIERS, type Carrier } from '@/lib/types/database'
import { trackPackage } from '@/lib/shipping/ship24'

function assertAdmin(profile: { is_admin?: boolean | null } | null) {
  if (!profile?.is_admin) {
    return { error: 'Admins only.' as const }
  }
  return null
}

/** When form action is used without useFormState, Next.js passes only FormData as the first arg. */
function getFormData(prev: unknown, formData: FormData | undefined): FormData | null {
  if (formData instanceof FormData) return formData
  if (prev instanceof FormData) return prev
  return null
}

function redirectWithError(message: string, to = '/admin/shipping'): never {
  redirect(`${to}?error=${encodeURIComponent(message)}`)
}

export async function createShipment(prevState: unknown, formData?: FormData) {
  const data = getFormData(prevState, formData)
  if (!data) redirectWithError('Invalid request.')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirectWithError('Unauthorized.')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const adminError = assertAdmin(profile)
  if (adminError) redirectWithError(adminError.error)

  const trackingNumber = (data.get('tracking_number') as string)?.trim()
  if (!trackingNumber) redirectWithError('Tracking number is required.')

  const carrierRaw = ((data.get('carrier') as string) || 'USPS').trim().toUpperCase()
  const carrier: Carrier = carrierRaw as Carrier
  if (!CARRIERS.includes(carrier)) {
    redirectWithError('Invalid carrier. Choose USPS, UPS, FedEx, or DHL.')
  }

  const toSignupIdRaw = ((data.get('to_signup_id') as string) || '').trim() || null
  const toSignupId = toSignupIdRaw || null
  let eventId: string | null = null
  if (toSignupId) {
    const { data: signup } = await supabase
      .from('event_signups')
      .select('event_id')
      .eq('id', toSignupId)
      .single()
    eventId = signup?.event_id ?? null
  }
  const notesRaw = (data.get('notes') as string) || ''
  const notes = notesRaw.trim() || null

  const { data: newRow, error } = await supabase
    .from('shipments')
    .insert({
      event_id: eventId,
      to_signup_id: toSignupId,
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
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505' && error.message?.includes('shipments_tracking_number_key')) {
      redirectWithError('This tracking number is already in the list. Remove it first if you want to add it again.')
    }
    redirectWithError(error.message)
  }
  if (!newRow?.id) redirectWithError('Failed to create shipment.')

  // Fetch tracking from Ship24 so the new row shows status/expected/latest update
  try {
    const statusResult = await trackPackage(trackingNumber, carrier)
    const now = new Date().toISOString()
    await supabase
      .from('shipments')
      .update({
        status: statusResult.status,
        status_raw: statusResult.raw,
        expected_delivery_date: statusResult.expectedDeliveryDate,
        last_checked_at: now,
        delivered_at: statusResult.deliveredAt,
      })
      .eq('id', newRow.id)
  } catch {
    // Ship24 unavailable or error; row stays with nulls, user can click Refresh later
  }

  revalidatePath('/admin/shipping')
  if (eventId) {
    revalidatePath(`/admin/events/${eventId}/signups`)
  }

  redirect('/admin/shipping')
}

export async function refreshShipment(prevState: unknown, formData?: FormData) {
  const data = getFormData(prevState, formData)
  if (!data) redirectWithError('Invalid request.')

  const shipmentId = (data.get('shipment_id') as string)?.trim()
  if (!shipmentId) redirectWithError('Missing shipment.')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirectWithError('Unauthorized.')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const adminError = assertAdmin(profile)
  if (adminError) redirectWithError(adminError.error)

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, event_id, carrier, tracking_number')
    .eq('id', shipmentId)
    .single()

  if (!shipment) redirectWithError('Shipment not found.')
  if (!CARRIERS.includes(shipment.carrier as Carrier)) {
    redirectWithError('Unsupported carrier for refresh.')
  }

  let statusResult
  try {
    statusResult = await trackPackage(shipment.tracking_number, shipment.carrier as Carrier)
  } catch (err) {
    redirectWithError(err instanceof Error ? err.message : 'Failed to get tracking status.')
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
  if (error) redirectWithError(error.message)

  revalidatePath('/admin/shipping')
  if (shipment.event_id) {
    revalidatePath(`/admin/events/${shipment.event_id}/signups`)
  }

  redirect('/admin/shipping')
}

export async function updateShipment(prevState: unknown, formData?: FormData) {
  const data = getFormData(prevState, formData)
  if (!data) redirectWithError('Invalid request.')

  const shipmentId = (data.get('shipment_id') as string)?.trim()
  if (!shipmentId) redirectWithError('Missing shipment.')

  const errorTo = ((data.get('redirect_error_to') as string) || '').trim() || '/admin/shipping'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirectWithError('Unauthorized.', errorTo)

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const adminError = assertAdmin(profile)
  if (adminError) redirectWithError(adminError.error, errorTo)

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, event_id')
    .eq('id', shipmentId)
    .single()

  if (!shipment) redirectWithError('Shipment not found.', errorTo)

  const toSignupIdRaw = ((data.get('to_signup_id') as string) || '').trim() || null
  const toSignupId = toSignupIdRaw || null
  let eventId: string | null = null
  if (toSignupId) {
    const { data: signup } = await supabase
      .from('event_signups')
      .select('event_id')
      .eq('id', toSignupId)
      .single()
    eventId = signup?.event_id ?? null
  }
  const notesRaw = (data.get('notes') as string) || ''
  const notes = notesRaw.trim() || null
  const carrierRaw = ((data.get('carrier') as string) || 'USPS').trim().toUpperCase()
  const carrier = carrierRaw as Carrier
  if (!CARRIERS.includes(carrier)) {
    redirectWithError('Invalid carrier. Choose USPS, UPS, FedEx, or DHL.', errorTo)
  }

  const { error } = await supabase
    .from('shipments')
    .update({
      event_id: eventId,
      to_signup_id: toSignupId,
      notes,
      carrier,
    })
    .eq('id', shipment.id)
  if (error) redirectWithError(error.message, errorTo)

  revalidatePath('/admin/shipping')
  revalidatePath(`/admin/shipping/${shipmentId}/edit`)
  if (shipment.event_id) {
    revalidatePath(`/admin/events/${shipment.event_id}/signups`)
  }
  if (eventId) {
    revalidatePath(`/admin/events/${eventId}/signups`)
  }

  redirect('/admin/shipping')
}

export async function removeShipment(prevState: unknown, formData?: FormData) {
  const data = getFormData(prevState, formData)
  if (!data) redirectWithError('Invalid request.')

  const shipmentId = (data.get('shipment_id') as string)?.trim()
  if (!shipmentId) redirectWithError('Missing shipment.')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirectWithError('Unauthorized.')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const adminError = assertAdmin(profile)
  if (adminError) redirectWithError(adminError.error)

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, event_id')
    .eq('id', shipmentId)
    .single()

  if (!shipment) redirectWithError('Shipment not found.')

  const { error } = await supabase.from('shipments').delete().eq('id', shipment.id)
  if (error) redirectWithError(error.message)

  revalidatePath('/admin/shipping')
  if (shipment.event_id) {
    revalidatePath(`/admin/events/${shipment.event_id}/signups`)
  }

  redirect('/admin/shipping')
}
