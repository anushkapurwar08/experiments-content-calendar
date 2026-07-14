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
import type { Tray } from './types'

interface Props {
  experimentId: string
  trays: Tray[] // already sorted by position, for this experiment
  allTrayNames: string[] // for autocomplete across experiments
  onReorder: (orderedIds: string[]) => void
  onAddTray: (experimentId: string, name: string) => void
  onDeleteTray: (id: string) => void
}

export default function TrayStack({
  experimentId,
  trays,
  allTrayNames,
  onReorder,
  onAddTray,
  onDeleteTray,
}: Props) {
  const [newName, setNewName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
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
    onReorder(arrayMove(ids, from, to))
  }

  const submitNew = () => {
    const name = newName.trim()
    if (!name) return
    onAddTray(experimentId, name)
    setNewName('')
  }

  const listId = `trays-${experimentId}`

  return (
    <div className="tray-stack">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={trays.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {trays.length === 0 && (
            <p className="tray-empty">No trays yet — add the first one below.</p>
          )}
          {trays.map((tray, i) => (
            <TrayCard
              key={tray.id}
              tray={tray}
              index={i}
              onDelete={() => onDeleteTray(tray.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="tray-add">
        <input
          className="input input--sm"
          list={listId}
          value={newName}
          placeholder="Add a tray…"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitNew()
          }}
        />
        <datalist id={listId}>
          {allTrayNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <button className="btn btn--ghost btn--sm" onClick={submitNew}>
          + Add
        </button>
      </div>
    </div>
  )
}

function TrayCard({
  tray,
  index,
  onDelete,
}: {
  tray: Tray
  index: number
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={'tray-card' + (isDragging ? ' tray-card--dragging' : '')}
    >
      <button
        className="tray-handle"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="tray-pos">{index + 1}</span>
      <span className="tray-name">{tray.name}</span>
      <button
        className="tray-delete"
        aria-label={`Remove ${tray.name}`}
        onClick={onDelete}
      >
        ×
      </button>
    </div>
  )
}
