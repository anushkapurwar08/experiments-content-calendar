import { useEffect, useState } from 'react'
import {
  STATUS_ORDER,
  STATUS_META,
  type Experiment,
  type ExperimentDraft,
  type ExperimentStatus,
} from './types'

interface Props {
  // When editing, the existing experiment; when adding, null.
  existing: Experiment | null
  // Prefilled start date when adding by clicking a day.
  defaultDate: string
  onSave: (draft: ExperimentDraft, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export default function ExperimentModal({
  existing,
  defaultDate,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState(existing?.title ?? '')
  const [startDate, setStartDate] = useState(
    existing?.start_date ?? defaultDate,
  )
  const [endDate, setEndDate] = useState(existing?.end_date ?? defaultDate)
  const [status, setStatus] = useState<ExperimentStatus>(
    existing?.status ?? 'planned',
  )
  const [owner, setOwner] = useState(existing?.owner ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Keep end >= start.
  useEffect(() => {
    if (endDate < startDate) setEndDate(startDate)
  }, [startDate, endDate])

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Give the experiment a title.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(
        {
          title: title.trim(),
          start_date: startDate,
          end_date: endDate < startDate ? startDate : endDate,
          status,
          owner: owner.trim(),
          notes: notes.trim(),
        },
        existing?.id,
      )
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!confirm(`Delete "${existing.title}"? This can't be undone.`)) return
    setSaving(true)
    setError(null)
    try {
      await onDelete(existing.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {existing ? 'Edit experiment' : 'New experiment'}
        </h2>

        <label className="field">
          <span className="field-label">Title</span>
          <input
            className="input"
            value={title}
            autoFocus
            placeholder="e.g. New checkout CTA copy"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Start</span>
            <input
              className="input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">End</span>
            <input
              className="input"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <div className="field">
          <span className="field-label">Status</span>
          <div className="status-picker">
            {STATUS_ORDER.map((s) => {
              const meta = STATUS_META[s]
              const active = s === status
              return (
                <button
                  key={s}
                  type="button"
                  className={'status-chip' + (active ? ' status-chip--active' : '')}
                  style={
                    active
                      ? { background: meta.color, color: meta.text, borderColor: meta.color }
                      : { color: meta.color, borderColor: meta.color }
                  }
                  onClick={() => setStatus(s)}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Owner</span>
          <input
            className="input"
            value={owner}
            placeholder="Who's running it?"
            onChange={(e) => setOwner(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Notes</span>
          <textarea
            className="input textarea"
            value={notes}
            rows={4}
            placeholder="Hypothesis, metric, links…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          {existing ? (
            <button
              className="btn btn--danger"
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="modal-actions-right">
            <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Add experiment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
