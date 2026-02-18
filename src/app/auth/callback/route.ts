import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const errorParam = searchParams.get('error_description') ?? searchParams.get('error')

  // Supabase or Discord may redirect here with an error (e.g. redirect_uri_mismatch)
  if (errorParam) {
    const message = encodeURIComponent(
      `OAuth error: ${errorParam}. ${searchParams.get('error_description') || ''}`.trim()
    )
    return NextResponse.redirect(`${origin}/auth/error?message=${message}`)
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent('No code received from Supabase. Check that Redirect URLs in Supabase include: ' + origin + '/auth/callback')}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const message = encodeURIComponent(`Code exchange failed: ${error.message}`)
    return NextResponse.redirect(`${origin}/auth/error?message=${message}`)
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: profile } = authUser
    ? await supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('id', authUser.id)
        .single()
    : { data: null }

  if (profile && !profile.onboarding_completed_at) {
    const onboardingNext = encodeURIComponent(next)
    return NextResponse.redirect(`${origin}/onboarding?next=${onboardingNext}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
