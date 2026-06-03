import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/profile'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${redirect}`)
}
