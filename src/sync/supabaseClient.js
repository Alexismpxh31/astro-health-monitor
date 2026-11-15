import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Only https:// is accepted (http:// is tolerated for a local Supabase on localhost).
function parseEndpoint(value) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

const endpoint = parseEndpoint(url)
const isAllowed = endpoint?.protocol === 'https:' || (
  endpoint?.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname)
)

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Running in offline-only mode (see .env.example).',
  )
} else if (!isAllowed) {
  console.warn('[supabase] VITE_SUPABASE_URL must start with https://. Running in offline-only mode.')
}

/**
 * Supabase client, or null when the env vars are missing or the URL is not https://.
 * Always check for null before using it: the app must keep working offline.
 *
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase = anonKey && isAllowed
  ? createClient(endpoint.href, anonKey, { auth: { flowType: 'pkce' } })
  : null
