import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl =
  (typeof import.meta !== 'undefined' && (import.meta.env?.NEXT_PUBLIC_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL)) ||
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
  'https://csjljgqcoanqxjuoxzsl.supabase.co'

const supabaseKey =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env?.VITE_SUPABASE_ANON_KEY ||
      import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  (typeof process !== 'undefined' &&
    (process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env?.VITE_SUPABASE_ANON_KEY ||
      process.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  'sb_publishable__dZXIaOyv1u_ZfbRaSP7YA_XwEEwEmB'

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey)
export default createClient
