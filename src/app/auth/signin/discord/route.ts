import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const next = (formData.get('next') as string) ?? '/'
  const supabase = await createClient()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? 'http://localhost:3000'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (data.url) return NextResponse.redirect(data.url, 302)
  return NextResponse.redirect(new URL(next, baseUrl), 302)
}
