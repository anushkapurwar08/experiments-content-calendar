import { useEffect, useRef, useState } from 'react'
import {
  addDaysISO,
  buildMonthDays,
  daysBetween,
  monthLabel,
} from './dates'
import { STATUS_META, type DayLink, type Experiment, type Tray } from './types'
import TrayStack from './TrayStack'

const DAY_W = 46 // px per day column
const ROW_H = 44 // px per experiment row

interface Props {
  year: number
  month: number
  experiments: Experiment[]
  trays: Tray[]
  dayLinks: DayLink[]
  onUpdateDates: (id: string, startISO: string, endISO: string) => void
  onNewExperiment: () => void
  onOpenExperiment: (exp: Experiment) => void
  onReorderTrays: (orderedIds: string[]) => void
  onAddTray: (experimentId: string, name: string) => void
  onDeleteTray: (id: string) => void
  onSaveDayLink: (day: string, url: string) => void
}

type DragMode = 'move' | 'resize-l' | 'resize-r'
interface DragState {
  id: string
  mode: DragMode
  startX: number
  origStart: string
  origEnd: string
  moved: boolean
}

export default function Timeline({
  year,
  month,
  experiments,
  trays,
  dayLinks,
  onUpdateDates,
  onNewExperiment,
  onOpenExperiment,
  onReorderTrays,
  onAddTray,
  onDeleteTray,
  onSaveDayLink,
}: Props) {
  const days = buildMonthDays(year, month)
  const firstISO = days[0].iso
  const lastISO = days[days.length - 1].iso
  const totalW = days.length * DAY_W

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dayEdit, setDayEdit] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    id: string
    start: string
    end: string
  } | null>(null)
  const dragRef = useRef<DragState | null>(null)

  // Experiments that overlap the visible month, in date order.
  const visible = experiments
    .filter((e) => e.start_date <= lastISO && e.end_date >= firstISO)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const allTrayNames = Array.from(new Set(trays.map((t) => t.name))).sort()
  const dayLinkMap = new Map(dayLinks.map((d) => [d.day, d.images_url]))

  // Global pointer handlers active during a drag.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dayDelta = Math.round((e.clientX - drag.startX) / DAY_W)
      if (dayDelta !== 0) drag.moved = true
      let start = drag.origStart
      let end = drag.origEnd
      if (drag.mode === 'move') {
        start = addDaysISO(drag.origStart, dayDelta)
        end = addDaysISO(drag.origEnd, dayDelta)
      } else if (drag.mode === 'resize-l') {
        start = addDaysISO(drag.origStart, dayDelta)
        if (start > end) start = end
      } else {
        end = addDaysISO(drag.origEnd, dayDelta)
        if (end < start) end = start
      }
      setPreview({ id: drag.id, start, end })
    }
    const onUp = () => {
      const drag = dragRef.current
      if (!drag) return
      const p = preview
      if (drag.moved && p && p.id === drag.id) {
        if (p.start !== drag.origStart || p.end !== drag.origEnd) {
          onUpdateDates(drag.id, p.start, p.end)
        }
      } else if (!drag.moved && drag.mode === 'move') {
        // A click (no drag) toggles the tray panel.
        setExpandedId((cur) => (cur === drag.id ? null : drag.id))
      }
      dragRef.current = null
      setPreview(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [preview, onUpdateDates])

  const beginDrag = (
    e: React.PointerEvent,
    exp: Experiment,
    mode: DragMode,
  ) => {
    e.stopPropagation()
    dragRef.current = {
      id: exp.id,
      mode,
      startX: e.clientX,
      origStart: exp.start_date,
      origEnd: exp.end_date,
      moved: false,
    }
  }

  const expandedExp = visible.find((e) => e.id === expandedId) ?? null

  return (
    <section className="timeline">
      <div className="timeline-head">
        <h3 className="timeline-title">Tray planner — {monthLabel(year, month)}</h3>
        <button className="btn btn--primary btn--sm" onClick={onNewExperiment}>
          + New experiment
        </button>
      </div>

      <div className="timeline-scroll">
        <div className="timeline-inner" style={{ width: totalW }}>
          {/* Day header with per-day images-link chips */}
          <div className="tl-header-row">
            {days.map((d) => {
              const hasLink = dayLinkMap.has(d.iso)
              return (
                <div
                  key={d.iso}
                  className={
                    'tl-day-col' +
                    (d.isToday ? ' tl-day-col--today' : '') +
                    (d.weekday === 'Sun' || d.weekday === 'Sat'
                      ? ' tl-day-col--weekend'
                      : '')
                  }
                  style={{ width: DAY_W }}
                >
                  <div className="tl-weekday">{d.weekday}</div>
                  <div className="tl-daynum">{d.dayNum}</div>
                  <button
                    className={'tl-imgchip' + (hasLink ? ' tl-imgchip--filled' : '')}
                    title={
                      hasLink ? "Open / edit this day's images" : "Add this day's images link"
                    }
                    onClick={() => setDayEdit(d.iso)}
                  >
                    ▦
                  </button>
                </div>
              )
            })}
          </div>

          {/* Bars */}
          <div className="tl-body" style={{ height: Math.max(visible.length, 1) * ROW_H }}>
            {/* vertical gridlines */}
            {days.map((d, i) => (
              <div
                key={d.iso}
                className={
                  'tl-gridline' +
                  (d.weekday === 'Sun' || d.weekday === 'Sat'
                    ? ' tl-gridline--weekend'
                    : '')
                }
                style={{ left: i * DAY_W, width: DAY_W }}
              />
            ))}

            {visible.length === 0 && (
              <div className="tl-empty">
                No experiments this month. Click “+ New experiment” to add one.
              </div>
            )}

            {visible.map((exp, rowIdx) => {
              const p = preview && preview.id === exp.id ? preview : null
              const start = p ? p.start : exp.start_date
              const end = p ? p.end : exp.end_date
              const startClamp = start < firstISO ? firstISO : start
              const endClamp = end > lastISO ? lastISO : end
              const startIdx = daysBetween(firstISO, startClamp)
              const span = daysBetween(startClamp, endClamp) + 1
              const meta = STATUS_META[exp.status]
              const extendsLeft = start < firstISO
              const extendsRight = end > lastISO
              const isExpanded = expandedId === exp.id
              return (
                <div
                  key={exp.id}
                  className={
                    'tl-bar' +
                    (extendsLeft ? ' tl-bar--cont-l' : '') +
                    (extendsRight ? ' tl-bar--cont-r' : '') +
                    (isExpanded ? ' tl-bar--active' : '')
                  }
                  style={{
                    top: rowIdx * ROW_H + 4,
                    left: startIdx * DAY_W + 2,
                    width: span * DAY_W - 4,
                    background: meta.color,
                    color: meta.text,
                  }}
                  onPointerDown={(e) => beginDrag(e, exp, 'move')}
                >
                  {!extendsLeft && (
                    <span
                      className="tl-handle tl-handle--l"
                      onPointerDown={(e) => beginDrag(e, exp, 'resize-l')}
                    />
                  )}
                  <span className="tl-bar-label">{exp.title}</span>
                  <button
                    className="tl-bar-edit"
                    title="Edit details"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenExperiment(exp)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    ⚙
                  </button>
                  {!extendsRight && (
                    <span
                      className="tl-handle tl-handle--r"
                      onPointerDown={(e) => beginDrag(e, exp, 'resize-r')}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Day-link editor popover, anchored to its column */}
          {dayEdit && (
            <DayLinkEditor
              day={dayEdit}
              left={daysBetween(firstISO, dayEdit) * DAY_W}
              url={dayLinkMap.get(dayEdit) ?? ''}
              onSave={(url) => {
                onSaveDayLink(dayEdit, url)
                setDayEdit(null)
              }}
              onClose={() => setDayEdit(null)}
            />
          )}
        </div>
      </div>

      {/* Expanded tray stack for the selected experiment */}
      {expandedExp && (
        <div className="tl-panel">
          <div className="tl-panel-head">
            <span
              className="tl-panel-dot"
              style={{ background: STATUS_META[expandedExp.status].color }}
            />
            <strong>{expandedExp.title}</strong>
            <span className="tl-panel-range">
              {expandedExp.start_date} → {expandedExp.end_date}
            </span>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setExpandedId(null)}
            >
              Close
            </button>
          </div>
          <p className="tl-panel-hint">Drag ⠿ to re-sequence trays (top runs first).</p>
          <TrayStack
            experimentId={expandedExp.id}
            trays={trays
              .filter((t) => t.experiment_id === expandedExp.id)
              .sort((a, b) => a.position - b.position)}
            allTrayNames={allTrayNames}
            onReorder={onReorderTrays}
            onAddTray={onAddTray}
            onDeleteTray={onDeleteTray}
          />
        </div>
      )}
    </section>
  )
}

function DayLinkEditor({
  day,
  left,
  url,
  onSave,
  onClose,
}: {
  day: string
  left: number
  url: string
  onSave: (url: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(url)
  return (
    <div
      className="tl-daypop"
      style={{ left: Math.max(0, Math.min(left, 9999)) }}
    >
      <div className="tl-daypop-title">Images for {day}</div>
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
      <div className="tl-daypop-actions">
        {url && (
          <a className="link-open" href={url} target="_blank" rel="noopener noreferrer">
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
