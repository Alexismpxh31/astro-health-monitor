import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Running in offline-only mode (see .env.example).',
  )
}

/**
 * Supabase client, or null when the env vars are missing.
 * Always check for null before using it: the app must keep working offline.
 *
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null
