import { createBrowserClient } from '@supabase/ssr'
import { normalizeSupabaseProjectUrl } from './supabase-project-url'

const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!_browserClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase Auth client not initialized — missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return _browserClient
}
