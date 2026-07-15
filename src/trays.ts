import { supabase } from './supabase'
import type { DayLineup, DayTray, DayTrayDraft } from './types'

const TABLE = 'day_trays'
const LINEUP_TABLE = 'day_lineups'

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

// Copy an entire day's lineup (trays + title) onto another day. The source is
// left untouched. Any existing trays on the target day are replaced so the
// target ends up as an exact copy of the source.
export async function copyDayLineup(fromDay: string, toDay: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  if (fromDay === toDay) return
  const client = supabase
  const { data, error } = await client
    .from(TABLE)
    .select('name, position')
    .eq('day', fromDay)
    .order('position', { ascending: true })
  if (error) throw error
  const src = data as { name: string; position: number }[]

  // Clear the target's current lineup, then copy the source's rows in.
  await client.from(TABLE).delete().eq('day', toDay)
  if (src.length > 0) {
    const rows = src.map((r) => ({ day: toDay, name: r.name, position: r.position }))
    const { error: insErr } = await client.from(TABLE).insert(rows)
    if (insErr) throw insErr
  }
  await copyLineupTitle(fromDay, toDay)
}

// Move a whole day's lineup (trays + title) onto another day. The source day is
// left empty; the target's previous lineup is replaced.
export async function moveDayLineup(fromDay: string, toDay: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  if (fromDay === toDay) return
  const client = supabase
  // Drop whatever is on the target, then relocate the source rows onto it.
  await client.from(TABLE).delete().eq('day', toDay)
  const { error } = await client
    .from(TABLE)
    .update({ day: toDay })
    .eq('day', fromDay)
  if (error) throw error
  await moveLineupTitle(fromDay, toDay)
}

// Copy an entire day's lineup onto another day (for the "copy prev" button).
export async function copyDayTrays(fromDay: string, toDay: string): Promise<void> {
  return copyDayLineup(fromDay, toDay)
}

// ---- Lineup title + color ------------------------------------------------

export async function fetchDayLineups(): Promise<DayLineup[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from(LINEUP_TABLE).select('*')
  if (error) throw error
  return data as DayLineup[]
}

// Set the title and/or color for a day's lineup. If both are empty the row is
// removed so we don't accumulate blanks.
export async function upsertDayLineup(
  day: string,
  title: string,
  color: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const client = supabase
  const trimmed = title.trim()
  if (!trimmed && !color) {
    const { error } = await client.from(LINEUP_TABLE).delete().eq('day', day)
    if (error) throw error
    return
  }
  const { error } = await client.from(LINEUP_TABLE).upsert({
    day,
    title: trimmed,
    color,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

// Remove a whole day's lineup: all its trays and its title/color row.
export async function deleteDayLineup(day: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const client = supabase
  await client.from(TABLE).delete().eq('day', day)
  await client.from(LINEUP_TABLE).delete().eq('day', day)
}

async function readLineup(
  day: string,
): Promise<{ title: string; color: string }> {
  const client = supabase
  if (!client) return { title: '', color: '' }
  const { data } = await client
    .from(LINEUP_TABLE)
    .select('title, color')
    .eq('day', day)
    .maybeSingle()
  const row = data as { title: string; color: string } | null
  return { title: row?.title ?? '', color: row?.color ?? '' }
}

async function copyLineupTitle(fromDay: string, toDay: string): Promise<void> {
  const { title, color } = await readLineup(fromDay)
  await upsertDayLineup(toDay, title, color)
}

async function moveLineupTitle(fromDay: string, toDay: string): Promise<void> {
  const client = supabase
  if (!client) return
  const { title, color } = await readLineup(fromDay)
  await upsertDayLineup(toDay, title, color)
  await client.from(LINEUP_TABLE).delete().eq('day', fromDay)
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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: LINEUP_TABLE },
      () => onChange(),
    )
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}
