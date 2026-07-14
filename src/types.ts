export type ExperimentStatus = 'planned' | 'running' | 'done' | 'blocked'

export interface Experiment {
  id: string
  title: string
  start_date: string // 'YYYY-MM-DD'
  end_date: string // 'YYYY-MM-DD' (equals start_date for single-day)
  status: ExperimentStatus
  owner: string
  notes: string
  created_at: string
}

// Shape used when creating/editing (no server-generated fields)
export type ExperimentDraft = Omit<Experiment, 'id' | 'created_at'>

export const STATUS_META: Record<
  ExperimentStatus,
  { label: string; color: string; text: string }
> = {
  planned: { label: 'Planned', color: '#6366f1', text: '#ffffff' },
  running: { label: 'Running', color: '#0ea5e9', text: '#ffffff' },
  done: { label: 'Done', color: '#22c55e', text: '#ffffff' },
  blocked: { label: 'Blocked', color: '#ef4444', text: '#ffffff' },
}

export const STATUS_ORDER: ExperimentStatus[] = [
  'planned',
  'running',
  'done',
  'blocked',
]

// A tray (vertical card) inside an experiment. `position` orders them (0 = top).
export interface Tray {
  id: string
  experiment_id: string
  name: string
  position: number
  created_at: string
}

export type TrayDraft = Pick<Tray, 'experiment_id' | 'name' | 'position'>

// Day-wise "images of that day" link (one row per calendar day).
export interface DayLink {
  day: string // 'YYYY-MM-DD'
  images_url: string
  updated_at: string
}

// Universal links stored as key/value in app_settings.
export type SettingKey = 'publishing_url' | 'tray_qc_url'
