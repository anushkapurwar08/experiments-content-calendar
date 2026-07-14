import { useState } from 'react'
import type { SettingKey } from './types'

interface Props {
  publishingUrl: string
  trayQcUrl: string
  onSave: (key: SettingKey, url: string) => void
}

export default function LinksBar({ publishingUrl, trayQcUrl, onSave }: Props) {
  return (
    <div className="links-bar">
      <LinkItem
        label="Publishing sheet"
        icon="▤"
        url={publishingUrl}
        emptyCta="Add Excel link"
        onSave={(url) => onSave('publishing_url', url)}
      />
      <LinkItem
        label="Tray QC"
        icon="✓"
        url={trayQcUrl}
        emptyCta="Add QC link"
        onSave={(url) => onSave('tray_qc_url', url)}
      />
    </div>
  )
}

function LinkItem({
  label,
  icon,
  url,
  emptyCta,
  onSave,
}: {
  label: string
  icon: string
  url: string
  emptyCta: string
  onSave: (url: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(url)

  const startEdit = () => {
    setDraft(url)
    setEditing(true)
  }

  const commit = () => {
    onSave(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="link-item link-item--editing">
        <span className="link-icon">{icon}</span>
        <span className="link-label">{label}</span>
        <input
          className="input input--sm"
          autoFocus
          value={draft}
          placeholder="Paste URL…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
        <button className="btn btn--primary btn--sm" onClick={commit}>
          Save
        </button>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="link-item">
      <span className="link-icon">{icon}</span>
      <span className="link-label">{label}</span>
      {url ? (
        <>
          <a
            className="link-open"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open ↗
          </a>
          <button className="link-edit" onClick={startEdit} aria-label={`Edit ${label} link`}>
            Edit
          </button>
        </>
      ) : (
        <button className="link-add" onClick={startEdit}>
          {emptyCta}
        </button>
      )}
    </div>
  )
}
