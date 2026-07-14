import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)

// When env vars are missing we still export a client-shaped object so the app
// can render a friendly "not configured yet" screen instead of crashing.
export const supabase = isConfigured
  ? createClient(url as string, anonKey as string)
  : null
