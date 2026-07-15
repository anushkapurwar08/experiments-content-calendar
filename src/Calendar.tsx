import { useState } from 'react'
import { buildMonthGrid, coversDay, WEEKDAY_LABELS } from './dates'
import { STATUS_META, type DayLink, type DayTray, type Experiment } from './types'
import TrayStack from './TrayStack'

interface Props {
  year: number
  month: number
  experiments: Experiment[]
  dayTrays: DayTray[]
  dayLinks: DayLink[]
  onOpenExperiment: (exp: Experiment) => void
  onReorderTrays: (day: string, orderedIds: string[]) => void
  onAddTray: (day: string, name: string) => void
  onDeleteTray: (id: string) => void
  onCopyPrev: (day: string) => void
  onSaveDayLink: (day: string, url: string) => void
}

export default function Calendar({
  year,
  month,
  experiments,
  dayTrays,
  dayLinks,
  onOpenExperiment,
  onReorderTrays,
  onAddTray,
  onDeleteTray,
  onCopyPrev,
  onSaveDayLink,
}: Props) {
  const cells = buildMonthGrid(year, month)
  const [linkEditDay, setLinkEditDay] = useState<string | null>(null)

  const allTrayNames = Array.from(new Set(dayTrays.map((t) => t.name))).sort()
  const linkMap = new Map(dayLinks.map((d) => [d.day, d.images_url]))

  return (
    <div className="calendar">
      <div className="weekday-row">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((cell) => {
          const dayExps = experiments.filter((e) =>
            coversDay(cell.iso, e.start_date, e.end_date),
          )
          const trays = dayTrays
            .filter((t) => t.day === cell.iso)
            .sort((a, b) => a.position - b.position)
          const imagesUrl = linkMap.get(cell.iso) ?? ''
          const prevIso = cell.date
            ? new Date(
                cell.date.getFullYear(),
                cell.date.getMonth(),
                cell.date.getDate() - 1,
              )
            : null
          const prevHasTrays = prevIso
            ? dayTrays.some(
                (t) =>
                  t.day ===
                  `${prevIso.getFullYear()}-${String(prevIso.getMonth() + 1).padStart(2, '0')}-${String(prevIso.getDate()).padStart(2, '0')}`,
              )
            : false

          return (
            <div
              key={cell.iso}
              className={
                'day-cell' +
                (cell.inCurrentMonth ? '' : ' day-cell--muted') +
                (cell.isToday ? ' day-cell--today' : '')
              }
            >
              <div className="day-header">
                <span className="day-number">{cell.date.getDate()}</span>
                <div className="day-header-right">
                  {cell.isToday && <span className="today-dot">today</span>}
                  <button
                    className={
                      'day-imgchip' + (imagesUrl ? ' day-imgchip--filled' : '')
                    }
                    title={
                      imagesUrl
                        ? "Open / edit this day's images"
                        : "Add this day's images link"
                    }
                    onClick={() => setLinkEditDay(cell.iso)}
                  >
                    ▦
                  </button>
                </div>
              </div>

              {dayExps.length > 0 && (
                <div className="day-pills">
                  {dayExps.map((exp) => {
                    const meta = STATUS_META[exp.status]
                    const isStart = exp.start_date === cell.iso
                    const isEnd = exp.end_date === cell.iso
                    const isRange = exp.start_date !== exp.end_date
                    return (
                      <button
                        key={exp.id}
                        className={
                          'pill' +
                          (isRange ? ' pill--range' : '') +
                          (isRange && !isStart ? ' pill--continued' : '') +
                          (isRange && !isEnd ? ' pill--extends' : '')
                        }
                        style={{ background: meta.color, color: meta.text }}
                        title={`${exp.title} — ${meta.label}`}
                        onClick={() => onOpenExperiment(exp)}
                      >
                        {isStart || !isRange ? (
                          <span className="pill-label">{exp.title}</span>
                        ) : (
                          <span className="pill-label pill-label--ghost">
                            {exp.title}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              <TrayStack
                day={cell.iso}
                trays={trays}
                allTrayNames={allTrayNames}
                canCopyPrev={prevHasTrays}
                onReorder={onReorderTrays}
                onAddTray={onAddTray}
                onDeleteTray={onDeleteTray}
                onCopyPrev={onCopyPrev}
              />

              {linkEditDay === cell.iso && (
                <DayLinkPopover
                  day={cell.iso}
                  url={imagesUrl}
                  onSave={(url) => {
                    onSaveDayLink(cell.iso, url)
                    setLinkEditDay(null)
                  }}
                  onClose={() => setLinkEditDay(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayLinkPopover({
  day,
  url,
  onSave,
  onClose,
}: {
  day: string
  url: string
  onSave: (url: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(url)
  return (
    <div className="day-linkpop" onClick={(e) => e.stopPropagation()}>
      <div className="day-linkpop-title">Images for {day}</div>
      <input
        className="input input--sm"
        autoFocus
        value={draft}
        placeholder="Paste images link…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(draft)
          if (e.key === 'Escape') onClose()
        }}
      />
      <div className="day-linkpop-actions">
        {url && (
          <a
            className="link-open"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open ↗
          </a>
        )}
        <button className="btn btn--primary btn--sm" onClick={() => onSave(draft)}>
          Save
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
