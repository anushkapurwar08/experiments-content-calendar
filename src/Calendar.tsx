import { useEffect, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { buildMonthGrid, coversDay, WEEKDAY_LABELS } from './dates'
import {
  STATUS_META,
  type DayLineup,
  type DayLink,
  type DayTray,
  type Experiment,
} from './types'
import TrayStack from './TrayStack'

interface Props {
  year: number
  month: number
  experiments: Experiment[]
  dayTrays: DayTray[]
  dayLineups: DayLineup[]
  dayLinks: DayLink[]
  onOpenExperiment: (exp: Experiment) => void
  onReorderTrays: (day: string, orderedIds: string[]) => void
  onAddTray: (day: string, name: string) => void
  onDeleteTray: (id: string) => void
  onCopyPrev: (day: string) => void
  onCopyDay: (fromDay: string, toDay: string) => void
  onMoveDay: (fromDay: string, toDay: string) => void
  onSaveTitle: (day: string, title: string) => void
  onSaveDayLink: (day: string, url: string) => void
}

const MOVE_PREFIX = 'daymove-'
const CELL_PREFIX = 'daycell-'

function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export default function Calendar({
  year,
  month,
  experiments,
  dayTrays,
  dayLineups,
  dayLinks,
  onOpenExperiment,
  onReorderTrays,
  onAddTray,
  onDeleteTray,
  onCopyPrev,
  onCopyDay,
  onMoveDay,
  onSaveTitle,
  onSaveDayLink,
}: Props) {
  const cells = buildMonthGrid(year, month)
  const [linkEditDay, setLinkEditDay] = useState<string | null>(null)
  const [movingDay, setMovingDay] = useState<string | null>(null)
  const [pendingDrop, setPendingDrop] = useState<{ from: string; to: string } | null>(
    null,
  )

  const allTrayNames = Array.from(new Set(dayTrays.map((t) => t.name))).sort()
  const linkMap = new Map(dayLinks.map((d) => [d.day, d.images_url]))
  const titleMap = new Map(dayLineups.map((l) => [l.day, l.title]))
  const traysByDay = new Map<string, DayTray[]>()
  for (const t of dayTrays) {
    const list = traysByDay.get(t.day) ?? []
    list.push(t)
    traysByDay.set(t.day, list)
  }

  // Calendar-level drag: relocate a whole day's lineup onto another day. This is
  // a separate DndContext from the per-day tray reorder inside TrayStack, so the
  // two never fight over the same pointer — the header grip drives this one.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handleDayDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    if (id.startsWith(MOVE_PREFIX)) setMovingDay(id.slice(MOVE_PREFIX.length))
  }

  const handleDayDragEnd = (event: DragEndEvent) => {
    setMovingDay(null)
    const { active, over } = event
    if (!over) return
    const from = String(active.id).replace(MOVE_PREFIX, '')
    const to = String(over.id).replace(CELL_PREFIX, '')
    // Don't act yet — let the user choose Copy or Move.
    if (from && to && from !== to) setPendingDrop({ from, to })
  }

  const movingCount = movingDay ? (traysByDay.get(movingDay)?.length ?? 0) : 0

  return (
    <div className="calendar">
      <div className="weekday-row">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="weekday">
            {w}
          </div>
        ))}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDayDragStart}
        onDragEnd={handleDayDragEnd}
        onDragCancel={() => setMovingDay(null)}
      >
        <div className="month-grid">
          {cells.map((cell) => {
            const dayExps = experiments.filter((e) =>
              coversDay(cell.iso, e.start_date, e.end_date),
            )
            const trays = (traysByDay.get(cell.iso) ?? [])
              .slice()
              .sort((a, b) => a.position - b.position)
            const imagesUrl = linkMap.get(cell.iso) ?? ''
            const title = titleMap.get(cell.iso) ?? ''
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
              <DayCell
                key={cell.iso}
                iso={cell.iso}
                dayNumber={cell.date.getDate()}
                inCurrentMonth={cell.inCurrentMonth}
                isToday={cell.isToday}
                imagesUrl={imagesUrl}
                hasTrays={trays.length > 0}
                isMovingSource={movingDay === cell.iso}
                onEditLink={() => setLinkEditDay(cell.iso)}
              >
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

                <DayTitle
                  title={title}
                  hasTrays={trays.length > 0}
                  onSave={(t) => onSaveTitle(cell.iso, t)}
                />

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
              </DayCell>
            )
          })}
        </div>
        <DragOverlay>
          {movingDay ? (
            <div className="daymove-ghost">
              {movingCount} {movingCount === 1 ? 'tray' : 'trays'}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingDrop && (
        <DropChooser
          from={pendingDrop.from}
          to={pendingDrop.to}
          onCopy={() => {
            onCopyDay(pendingDrop.from, pendingDrop.to)
            setPendingDrop(null)
          }}
          onMove={() => {
            onMoveDay(pendingDrop.from, pendingDrop.to)
            setPendingDrop(null)
          }}
          onCancel={() => setPendingDrop(null)}
        />
      )}
    </div>
  )
}

function DayCell({
  iso,
  dayNumber,
  inCurrentMonth,
  isToday,
  imagesUrl,
  hasTrays,
  isMovingSource,
  onEditLink,
  children,
}: {
  iso: string
  dayNumber: number
  inCurrentMonth: boolean
  isToday: boolean
  imagesUrl: string
  hasTrays: boolean
  isMovingSource: boolean
  onEditLink: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${CELL_PREFIX}${iso}` })

  return (
    <div
      ref={setNodeRef}
      className={
        'day-cell' +
        (inCurrentMonth ? '' : ' day-cell--muted') +
        (isToday ? ' day-cell--today' : '') +
        (isOver ? ' day-cell--droptarget' : '') +
        (isMovingSource ? ' day-cell--movingsource' : '')
      }
    >
      <div className="day-header">
        <div className="day-header-left">
          {hasTrays && <DayDragGrip iso={iso} />}
          <span className="day-number">{dayNumber}</span>
        </div>
        <div className="day-header-right">
          {isToday && <span className="today-dot">today</span>}
          <button
            className={'day-imgchip' + (imagesUrl ? ' day-imgchip--filled' : '')}
            title={
              imagesUrl
                ? "Open / edit this day's images link"
                : "Add this day's images link"
            }
            onClick={onEditLink}
          >
            <ImageIcon />
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}

function ImageIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function DayDragGrip({ iso }: { iso: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${MOVE_PREFIX}${iso}`,
  })
  return (
    <button
      ref={setNodeRef}
      className={'day-movegrip' + (isDragging ? ' day-movegrip--active' : '')}
      title="Drag this whole day's lineup onto another day"
      {...attributes}
      {...listeners}
    >
      ⠿
    </button>
  )
}

function DayTitle({
  title,
  hasTrays,
  onSave,
}: {
  title: string
  hasTrays: boolean
  onSave: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

  useEffect(() => setDraft(title), [title])

  const commit = () => {
    setEditing(false)
    if (draft.trim() !== title) onSave(draft.trim())
  }

  if (editing) {
    return (
      <input
        className="input input--sm day-title-input"
        autoFocus
        value={draft}
        placeholder="Name this lineup…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(title)
            setEditing(false)
          }
        }}
      />
    )
  }

  if (title) {
    return (
      <button
        className="day-title"
        title="Rename this lineup"
        onClick={() => setEditing(true)}
      >
        {title}
      </button>
    )
  }

  if (hasTrays) {
    return (
      <button
        className="day-title day-title--empty"
        onClick={() => setEditing(true)}
      >
        + name lineup
      </button>
    )
  }

  return null
}

function DropChooser({
  from,
  to,
  onCopy,
  onMove,
  onCancel,
}: {
  from: string
  to: string
  onCopy: () => void
  onMove: () => void
  onCancel: () => void
}) {
  return (
    <div className="dropchooser-backdrop" onClick={onCancel}>
      <div className="dropchooser" onClick={(e) => e.stopPropagation()}>
        <div className="dropchooser-title">
          {fmtDay(from)} → {fmtDay(to)}
        </div>
        <div className="dropchooser-sub">
          What should happen to this lineup?
        </div>
        <div className="dropchooser-actions">
          <button className="btn btn--primary btn--sm" onClick={onCopy}>
            Copy — keep {fmtDay(from)}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={onMove}>
            Move — empty {fmtDay(from)}
          </button>
        </div>
        <button className="dropchooser-cancel" onClick={onCancel}>
          Cancel
        </button>
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
      <div className="day-linkpop-title">Images of the day</div>
      <div className="day-linkpop-sub">
        Link to the folder/album of creatives for {fmtDay(day)}.
      </div>
      <input
        className="input input--sm"
        autoFocus
        value={draft}
        placeholder="Paste a link (Drive, Figma…)"
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
