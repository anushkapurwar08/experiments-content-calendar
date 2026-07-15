import { useCallback, useEffect, useMemo, useState } from 'react'
import Calendar from './Calendar'
import ExperimentModal from './ExperimentModal'
import LinksBar from './LinksBar'
import {
  createExperiment,
  deleteExperiment,
  fetchExperiments,
  subscribeToExperiments,
  updateExperiment,
} from './experiments'
import {
  copyDayLineup,
  copyDayTrays,
  createDayTray,
  deleteDayLineup,
  deleteDayTray,
  fetchDayLineups,
  fetchDayTrays,
  fillDayLineup,
  moveDayLineup,
  reorderDayTrays,
  subscribeToDayTrays,
  upsertDayLineup,
} from './trays'
import {
  fetchDayLinks,
  fetchSettings,
  subscribeToLinks,
  upsertDayLink,
  upsertSetting,
} from './links'
import { isConfigured } from './supabase'
import { addDaysISO, monthLabel } from './dates'
import {
  STATUS_META,
  STATUS_ORDER,
  type DayLineup,
  type DayLink,
  type DayTray,
  type Experiment,
  type ExperimentDraft,
  type SettingKey,
} from './types'
import './App.css'

// The calendar opens here per the brief: experiments start 9 July 2026.
const INITIAL_YEAR = 2026
const INITIAL_MONTH = 6 // 0-indexed → July

interface ModalState {
  existing: Experiment | null
  defaultDate: string
}

export default function App() {
  const [year, setYear] = useState(INITIAL_YEAR)
  const [month, setMonth] = useState(INITIAL_MONTH)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [dayTrays, setDayTrays] = useState<DayTray[]>([])
  const [dayLineups, setDayLineups] = useState<DayLineup[]>([])
  const [dayLinks, setDayLinks] = useState<DayLink[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(isConfigured)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)

  const reload = useCallback(async () => {
    if (!isConfigured) return
    try {
      // Experiments are the critical fetch; the planner tables degrade
      // gracefully so the calendar still renders if they're not set up yet.
      const exps = await fetchExperiments()
      setExperiments(exps)
      setLoadError(null)

      const [trs, lineups, links, sets] = await Promise.all([
        fetchDayTrays().catch(() => [] as DayTray[]),
        fetchDayLineups().catch(() => [] as DayLineup[]),
        fetchDayLinks().catch(() => [] as DayLink[]),
        fetchSettings().catch(() => ({}) as Record<string, string>),
      ])
      setDayTrays(trs)
      setDayLineups(lineups)
      setDayLinks(links)
      setSettings(sets)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    const unsubs = [
      subscribeToExperiments(reload),
      subscribeToDayTrays(reload),
      subscribeToLinks(reload),
    ]
    return () => unsubs.forEach((u) => u())
  }, [reload])

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const goToday = () => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  const handleSave = async (draft: ExperimentDraft, id?: string) => {
    if (id) {
      await updateExperiment(id, draft)
    } else {
      await createExperiment(draft)
    }
    await reload()
  }

  const handleDelete = async (id: string) => {
    await deleteExperiment(id)
    await reload()
  }

  const handleReorderTrays = async (_day: string, orderedIds: string[]) => {
    // Optimistic local reorder for snappy feel.
    setDayTrays((prev) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i]))
      return prev.map((t) =>
        pos.has(t.id) ? { ...t, position: pos.get(t.id)! } : t,
      )
    })
    await reorderDayTrays(orderedIds)
    await reload()
  }

  const handleAddTray = async (day: string, name: string) => {
    const existing = dayTrays.filter((t) => t.day === day)
    await createDayTray({ day, name, position: existing.length })
    await reload()
  }

  const handleDeleteTray = async (id: string) => {
    await deleteDayTray(id)
    await reload()
  }

  const handleCopyPrev = async (day: string) => {
    await copyDayTrays(addDaysISO(day, -1), day)
    await reload()
  }

  const handleCopyDay = async (fromDay: string, toDay: string) => {
    await copyDayLineup(fromDay, toDay)
    await reload()
  }

  const handleFillDays = async (fromDay: string, toDays: string[]) => {
    const targets = toDays.filter((d) => d !== fromDay)
    if (targets.length === 0) return
    // Optimistic: mirror the source's trays onto every target locally.
    const targetSet = new Set(targets)
    const sourceTrays = dayTrays.filter((t) => t.day === fromDay)
    const sourceLineup = dayLineups.find((l) => l.day === fromDay)
    setDayTrays((prev) => {
      const kept = prev.filter((t) => !targetSet.has(t.day))
      const copies = targets.flatMap((day) =>
        sourceTrays.map((t) => ({ ...t, id: `${t.id}-fill-${day}`, day })),
      )
      return [...kept, ...copies]
    })
    setDayLineups((prev) => {
      const kept = prev.filter((l) => !targetSet.has(l.day))
      if (!sourceLineup) return kept
      const copies = targets.map((day) => ({ ...sourceLineup, day }))
      return [...kept, ...copies]
    })
    await fillDayLineup(fromDay, targets)
    await reload()
  }

  const handleMoveDay = async (fromDay: string, toDay: string) => {
    // Optimistic: relocate source trays to the target, clearing the target's own.
    setDayTrays((prev) =>
      prev
        .filter((t) => t.day !== toDay)
        .map((t) => (t.day === fromDay ? { ...t, day: toDay } : t)),
    )
    await moveDayLineup(fromDay, toDay)
    await reload()
  }

  const handleSaveLineup = async (day: string, title: string, color: string) => {
    await upsertDayLineup(day, title, color)
    await reload()
  }

  const handleDeleteLineup = async (day: string) => {
    // Optimistic: drop this day's trays locally, then persist trays + title.
    setDayTrays((prev) => prev.filter((t) => t.day !== day))
    setDayLineups((prev) => prev.filter((l) => l.day !== day))
    await deleteDayLineup(day)
    await reload()
  }

  const handleSaveDayLink = async (day: string, url: string) => {
    await upsertDayLink(day, url)
    await reload()
  }

  const handleSaveSetting = async (key: SettingKey, url: string) => {
    await upsertSetting(key, url)
    await reload()
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of STATUS_ORDER) counts[s] = 0
    for (const e of experiments) counts[e.status] = (counts[e.status] ?? 0) + 1
    return counts
  }, [experiments])

  if (!isConfigured) {
    return <NotConfigured />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Experiments Calendar</h1>
          <p className="app-subtitle">
            Plan, run, and track experiments — shared with anyone who has the link.
          </p>
        </div>
        <button
          className="btn btn--primary btn--lg"
          onClick={() =>
            setModal({ existing: null, defaultDate: `${INITIAL_YEAR}-07-09` })
          }
        >
          + New experiment
        </button>
      </header>

      <LinksBar
        publishingUrl={settings.publishing_url ?? ''}
        trayQcUrl={settings.tray_qc_url ?? ''}
        onSave={handleSaveSetting}
      />

      <div className="toolbar">
        <div className="month-nav">
          <button className="nav-btn" onClick={prevMonth} aria-label="Previous month">
            ‹
          </button>
          <h2 className="month-label">{monthLabel(year, month)}</h2>
          <button className="nav-btn" onClick={nextMonth} aria-label="Next month">
            ›
          </button>
          <button className="btn btn--ghost btn--sm" onClick={goToday}>
            Today
          </button>
        </div>
        <div className="legend">
          {STATUS_ORDER.map((s) => (
            <span key={s} className="legend-item">
              <span
                className="legend-dot"
                style={{ background: STATUS_META[s].color }}
              />
              {STATUS_META[s].label}
              <span className="legend-count">{statusCounts[s]}</span>
            </span>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="banner banner--error">
          Couldn’t load experiments: {loadError}
        </div>
      )}
      {loading ? (
        <div className="banner">Loading…</div>
      ) : (
        <Calendar
          year={year}
          month={month}
          experiments={experiments}
          dayTrays={dayTrays}
          dayLineups={dayLineups}
          dayLinks={dayLinks}
          onOpenExperiment={(exp) =>
            setModal({ existing: exp, defaultDate: exp.start_date })
          }
          onReorderTrays={handleReorderTrays}
          onAddTray={handleAddTray}
          onDeleteTray={handleDeleteTray}
          onCopyPrev={handleCopyPrev}
          onCopyDay={handleCopyDay}
          onMoveDay={handleMoveDay}
          onFillDays={handleFillDays}
          onSaveLineup={handleSaveLineup}
          onDeleteLineup={handleDeleteLineup}
          onSaveDayLink={handleSaveDayLink}
        />
      )}

      {modal && (
        <ExperimentModal
          existing={modal.existing}
          defaultDate={modal.defaultDate}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function NotConfigured() {
  return (
    <div className="app">
      <div className="setup-card">
        <h1 className="app-title">Experiments Calendar</h1>
        <p className="setup-lead">
          Almost there — this app just needs a database to store and share your
          experiments.
        </p>
        <ol className="setup-steps">
          <li>
            Create a free project at <code>supabase.com</code>.
          </li>
          <li>
            Run the SQL from <code>SETUP.md</code> in the Supabase SQL editor.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env</code> and paste your
            Project URL and anon key.
          </li>
          <li>
            Restart the dev server (<code>npm run dev</code>).
          </li>
        </ol>
        <p className="setup-note">
          Full click-by-click instructions are in <code>SETUP.md</code>.
        </p>
      </div>
    </div>
  )
}
