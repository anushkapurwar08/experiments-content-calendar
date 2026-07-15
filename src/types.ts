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

// A tray block in a day's published lineup. `position` orders them (0 = top).
export interface DayTray {
  id: string
  day: string // 'YYYY-MM-DD'
  name: string
  position: number
  created_at: string
}

export type DayTrayDraft = Pick<DayTray, 'day' | 'name' | 'position'>

// An optional title/heading for a day's lineup (e.g. "baseline new users") plus
// a color. Travels with the trays when a day is copied or moved.
export interface DayLineup {
  day: string // 'YYYY-MM-DD'
  title: string
  color: string // '' = default (no custom color)
  updated_at: string
}

// Preset palette for lineup colors. First entry ('') means "no color".
export const LINEUP_COLORS: { value: string; label: string }[] = [
  { value: '', label: 'Default' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#14b8a6', label: 'Teal' },
]

// Day-wise "images of that day" link (one row per calendar day).
export interface DayLink {
  day: string // 'YYYY-MM-DD'
  images_url: string
  updated_at: string
}

// Universal links stored as key/value in app_settings.
export type SettingKey = 'publishing_url' | 'tray_qc_url'
