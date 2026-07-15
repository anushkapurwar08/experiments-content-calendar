// A tray block in a day's experiment. `position` orders them (0 = top).
export interface DayTray {
  id: string
  day: string // 'YYYY-MM-DD'
  name: string
  position: number
  created_at: string
}

export type DayTrayDraft = Pick<DayTray, 'day' | 'name' | 'position'>

// A day's experiment: its name (title) and color. The title is THE experiment
// name; color belongs to the name and reads the same everywhere it appears.
// Travels with the trays when a day is copied, moved, or filled.
export interface DayLineup {
  day: string // 'YYYY-MM-DD'
  title: string
  color: string // '' = default (no custom color)
  updated_at: string
}

// Preset palette for experiment colors. First entry ('') means "no color".
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
