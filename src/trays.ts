import { supabase } from './supabase'
import type { DayTray, DayTrayDraft } from './types'

const TABLE = 'day_trays'

export async function fetchDayTrays(): Promise<DayTray[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return data as DayTray[]
}

export async function createDayTray(draft: DayTrayDraft): Promise<DayTray> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from(TABLE)
    .insert(draft)
    .select()
    .single()
  if (error) throw error
  return data as DayTray
}

export async function deleteDayTray(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

// Persist a new ordering within one day: reassign position 0..n-1.
export async function reorderDayTrays(orderedIds: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const client = supabase
  await Promise.all(
    orderedIds.map((id, index) =>
      client.from(TABLE).update({ position: index }).eq('id', id),
    ),
  )
}

// Copy an entire day's lineup onto another day (for "same as yesterday").
export async function copyDayTrays(fromDay: string, toDay: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const client = supabase
  const { data, error } = await client
    .from(TABLE)
    .select('name, position')
    .eq('day', fromDay)
    .order('position', { ascending: true })
  if (error) throw error
  const rows = (data as { name: string; position: number }[]).map((r) => ({
    day: toDay,
    name: r.name,
    position: r.position,
  }))
  if (rows.length === 0) return
  const { error: insErr } = await client.from(TABLE).insert(rows)
  if (insErr) throw insErr
}

export function subscribeToDayTrays(onChange: () => void): () => void {
  const client = supabase
  if (!client) return () => {}
  const channel = client
    .channel('day-trays-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      () => onChange(),
    )
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}
