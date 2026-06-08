import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { normalizeSupabaseProjectUrl } from './supabase-project-url'

const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function createClient() {
  const cookieStore = await cookies()
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL')
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })
}
