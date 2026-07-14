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

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
