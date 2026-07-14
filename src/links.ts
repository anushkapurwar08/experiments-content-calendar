import { supabase } from './supabase'
import type { DayLink, SettingKey } from './types'

const DAY_LINKS = 'day_links'
const SETTINGS = 'app_settings'

export async function fetchDayLinks(): Promise<DayLink[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from(DAY_LINKS).select('*')
  if (error) throw error
  return data as DayLink[]
}

// Set (or clear) the images link for a single day. Empty url removes the row.
export async function upsertDayLink(day: string, url: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const trimmed = url.trim()
  if (!trimmed) {
    const { error } = await supabase.from(DAY_LINKS).delete().eq('day', day)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from(DAY_LINKS)
    .upsert(
      { day, images_url: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'day' },
    )
  if (error) throw error
}

export async function fetchSettings(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from(SETTINGS).select('*')
  if (error) throw error
  const out: Record<string, string> = {}
  for (const row of data as { key: string; value: string }[]) {
    out[row.key] = row.value
  }
  return out
}

export async function upsertSetting(
  key: SettingKey,
  value: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from(SETTINGS)
    .upsert(
      { key, value: value.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
}

// One subscription covering both link tables; caller reloads on any change.
export function subscribeToLinks(onChange: () => void): () => void {
  const client = supabase
  if (!client) return () => {}
  const channel = client
    .channel('links-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: DAY_LINKS },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: SETTINGS },
      () => onChange(),
    )
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}
