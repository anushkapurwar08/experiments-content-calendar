// All date logic works on local 'YYYY-MM-DD' strings to avoid timezone drift.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISODate(new Date())
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

export interface CalendarCell {
  date: Date
  iso: string
  inCurrentMonth: boolean
  isToday: boolean
}

// Build a 6-row (42-cell) grid starting on Sunday for the given month.
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay() // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset)
  const today = todayISO()

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    )
    const iso = toISODate(date)
    cells.push({
      date,
      iso,
      inCurrentMonth: date.getMonth() === month,
      isToday: iso === today,
    })
  }
  return cells
}

// Does experiment [start,end] overlap the given day?
export function coversDay(
  dayISO: string,
  startISO: string,
  endISO: string,
): boolean {
  return dayISO >= startISO && dayISO <= endISO
}

// Add (or subtract) whole days to an ISO date, returning a new ISO date.
export function addDaysISO(iso: string, delta: number): string {
  const d = parseISODate(iso)
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta))
}

// Whole-day difference b - a (both ISO). Positive when b is later.
export function daysBetween(aISO: string, bISO: string): number {
  const a = parseISODate(aISO)
  const b = parseISODate(bISO)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

// Every ISO day from a to b inclusive, in drag order (works both directions).
export function daysInRange(aISO: string, bISO: string): string[] {
  const delta = daysBetween(aISO, bISO)
  const step = delta >= 0 ? 1 : -1
  const out: string[] = []
  for (let i = 0; i <= Math.abs(delta); i++) out.push(addDaysISO(aISO, i * step))
  return out
}

export interface MonthDay {
  iso: string
  dayNum: number
  isToday: boolean
  weekday: string // 'Sun'..'Sat'
}

// The actual days in a month (no leading/trailing padding), for the timeline.
export function buildMonthDays(year: number, month: number): MonthDay[] {
  const count = new Date(year, month + 1, 0).getDate()
  const today = todayISO()
  const days: MonthDay[] = []
  for (let d = 1; d <= count; d++) {
    const date = new Date(year, month, d)
    const iso = toISODate(date)
    days.push({
      iso,
      dayNum: d,
      isToday: iso === today,
      weekday: WEEKDAY_LABELS[date.getDay()],
    })
  }
  return days
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
