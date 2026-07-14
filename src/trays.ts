import { supabase } from './supabase'
import type { Tray, TrayDraft } from './types'

const TABLE = 'trays'

export async function fetchTrays(): Promise<Tray[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return data as Tray[]
}

export async function createTray(draft: TrayDraft): Promise<Tray> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from(TABLE)
    .insert(draft)
    .select()
    .single()
  if (error) throw error
  return data as Tray
}

export async function updateTray(
  id: string,
  patch: Partial<TrayDraft>,
): Promise<Tray> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Tray
}

export async function deleteTray(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

// Persist a new ordering: reassign position 0..n-1 for the given tray ids.
export async function reorderTrays(orderedIds: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const client = supabase
  await Promise.all(
    orderedIds.map((id, index) =>
      client.from(TABLE).update({ position: index }).eq('id', id),
    ),
  )
}

export function subscribeToTrays(onChange: () => void): () => void {
  const client = supabase
  if (!client) return () => {}
  const channel = client
    .channel('trays-changes')
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
