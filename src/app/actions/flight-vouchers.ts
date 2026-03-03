'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function assertAdmin(profile: { is_admin?: boolean | null } | null) {
  if (!profile?.is_admin) {
    return { error: 'Admins only.' as const }
  }
  return null
}

export async function updateFlightVoucherContacted(
  _prev: unknown,
  formData?: FormData,
) {
  const signupId = (formData?.get('signup_id') as string)?.trim()
  const contactedRaw = (formData?.get('contacted') as string)?.trim()
  if (!signupId) redirect('/admin/flight-vouchers?error=' + encodeURIComponent('Missing signup.'))
  const contacted =
    contactedRaw === 'true' ? true : contactedRaw === 'false' ? false : null
  if (contacted !== true && contacted !== false) {
    redirect('/admin/flight-vouchers?error=' + encodeURIComponent('Invalid value.'))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=/admin/flight-vouchers')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const err = assertAdmin(profile)
  if (err) redirect('/admin/flight-vouchers?error=' + encodeURIComponent(err.error))

  const { error } = await supabase
    .from('event_signups')
    .update({ flight_voucher_contacted: contacted })
    .eq('id', signupId)
  if (error) redirect('/admin/flight-vouchers?error=' + encodeURIComponent(error.message))

  revalidatePath('/admin/flight-vouchers')
  redirect('/admin/flight-vouchers')
}
