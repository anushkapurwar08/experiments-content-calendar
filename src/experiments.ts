import { supabase } from './supabase'
import type { Experiment, ExperimentDraft } from './types'

const TABLE = 'experiments'

export async function fetchExperiments(): Promise<Experiment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('start_date', { ascending: true })
  if (error) throw error
  return data as Experiment[]
}

export async function createExperiment(
  draft: ExperimentDraft,
): Promise<Experiment> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from(TABLE)
    .insert(draft)
    .select()
    .single()
  if (error) throw error
  return data as Experiment
}

export async function updateExperiment(
  id: string,
  draft: ExperimentDraft,
): Promise<Experiment> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from(TABLE)
    .update(draft)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Experiment
}

export async function deleteExperiment(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

// Subscribe to any insert/update/delete on the table. Returns an unsubscribe fn.
export function subscribeToExperiments(onChange: () => void): () => void {
  const client = supabase
  if (!client) return () => {}
  const channel = client
    .channel('experiments-changes')
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
