'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const displayName = (formData.get('display_name') as string)?.trim() || null

  await supabase
    .from('profiles')
    .update({
      display_name: displayName || null,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  revalidatePath('/')
  const next = (formData.get('next') as string)?.trim() || '/'
  redirect(next)
}
