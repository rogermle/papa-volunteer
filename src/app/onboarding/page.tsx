import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './OnboardingForm'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('discord_username, display_name, onboarding_completed_at')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed_at) {
    const next = (await searchParams).next ?? '/'
    redirect(next)
  }

  const { next } = await searchParams
  const nextVal = next ?? '/'

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-papa-border bg-papa-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          Almost there
        </h1>
        <p className="mt-2 text-sm text-papa-muted">
          Share a bit of info so we can coordinate volunteers. You can change this later.
        </p>
        <OnboardingForm
          defaultDisplayName={profile?.display_name ?? profile?.discord_username ?? ''}
          next={nextVal}
        />
      </div>
    </div>
  )
}
