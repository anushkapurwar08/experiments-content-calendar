import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DayTray } from './types'

interface Props {
  day: string
  trays: DayTray[] // already sorted by position, for this day
  color: string // lineup color ('' = default)
  allTrayNames: string[] // autocomplete across all days
  canCopyPrev: boolean
  onReorder: (day: string, orderedIds: string[]) => void
  onAddTray: (day: string, name: string) => void
  onDeleteTray: (id: string) => void
  onCopyPrev: (day: string) => void
}

export default function TrayStack({
  day,
  trays,
  color,
  allTrayNames,
  canCopyPrev,
  onReorder,
  onAddTray,
  onDeleteTray,
  onCopyPrev,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = trays.map((t) => t.id)
    const from = ids.indexOf(active.id as string)
    const to = ids.indexOf(over.id as string)
    if (from === -1 || to === -1) return
    onReorder(day, arrayMove(ids, from, to))
  }

  const submitNew = () => {
    const name = newName.trim()
    if (!name) {
      setAdding(false)
      return
    }
    onAddTray(day, name)
    setNewName('')
    // keep the input open so several trays can be added in a row
  }

  const listId = `daytrays-${day}`

  return (
    <div className="daytray-stack">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={trays.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {trays.map((tray, i) => (
            <TrayBlock
              key={tray.id}
              tray={tray}
              index={i}
              color={color}
              onDelete={() => onDeleteTray(tray.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {adding ? (
        <div className="daytray-add">
          <input
            className="input input--sm"
            list={listId}
            value={newName}
            autoFocus
            placeholder="Tray name…"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNew()
              if (e.key === 'Escape') {
                setNewName('')
                setAdding(false)
              }
            }}
            onBlur={submitNew}
          />
          <datalist id={listId}>
            {allTrayNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
      ) : (
        <div className="daytray-actions">
          <button className="daytray-addbtn" onClick={() => setAdding(true)}>
            + tray
          </button>
          {trays.length === 0 && canCopyPrev && (
            <button
              className="daytray-copybtn"
              title="Copy the previous day's lineup"
              onClick={() => onCopyPrev(day)}
            >
              ⧉ copy prev
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function TrayBlock({
  tray,
  index,
  color,
  onDelete,
}: {
  tray: DayTray
  index: number
  color: string
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tray.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 3 : undefined,
    opacity: isDragging ? 0.9 : 1,
    ...(color ? { borderColor: color, background: color + '0f' } : {}),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={'daytray' + (isDragging ? ' daytray--dragging' : '')}
      {...attributes}
      {...listeners}
    >
      <span
        className="daytray-pos"
        style={color ? { background: color } : undefined}
      >
        {index + 1}
      </span>
      <span className="daytray-name">{tray.name}</span>
      <button
        className="daytray-del"
        aria-label={`Remove ${tray.name}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        ×
      </button>
    </div>
  )
}
