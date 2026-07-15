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

// Move a whole day's lineup onto another day. If the target day already has a
// lineup, the two days swap (reversible, nothing is lost). Rows keep their own
// position values, so each day's internal order survives the move.
export async function moveDayTrays(fromDay: string, toDay: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  if (fromDay === toDay) return
  const client = supabase
  const { data, error } = await client
    .from(TABLE)
    .select('id, day')
    .in('day', [fromDay, toDay])
  if (error) throw error
  const rows = data as { id: string; day: string }[]
  const fromIds = rows.filter((r) => r.day === fromDay).map((r) => r.id)
  const toIds = rows.filter((r) => r.day === toDay).map((r) => r.id)
  if (fromIds.length === 0) return
  await Promise.all([
    ...fromIds.map((id) => client.from(TABLE).update({ day: toDay }).eq('id', id)),
    ...toIds.map((id) => client.from(TABLE).update({ day: fromDay }).eq('id', id)),
  ])
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
