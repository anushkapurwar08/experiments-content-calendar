import { useCallback, useEffect, useMemo, useState } from 'react'
import Calendar from './Calendar'
import ExperimentModal from './ExperimentModal'
import LinksBar from './LinksBar'
import Timeline from './Timeline'
import {
  createExperiment,
  deleteExperiment,
  fetchExperiments,
  subscribeToExperiments,
  updateExperiment,
} from './experiments'
import {
  createTray,
  deleteTray,
  fetchTrays,
  reorderTrays,
  subscribeToTrays,
} from './trays'
import {
  fetchDayLinks,
  fetchSettings,
  subscribeToLinks,
  upsertDayLink,
  upsertSetting,
} from './links'
import { isConfigured } from './supabase'
import { monthLabel } from './dates'
import {
  STATUS_META,
  STATUS_ORDER,
  type DayLink,
  type Experiment,
  type ExperimentDraft,
  type SettingKey,
  type Tray,
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
  const [trays, setTrays] = useState<Tray[]>([])
  const [dayLinks, setDayLinks] = useState<DayLink[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(isConfigured)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)

  const reload = useCallback(async () => {
    if (!isConfigured) return
    try {
      // Experiments are the critical fetch; the tray-planner tables degrade
      // gracefully so the calendar still renders if they're not set up yet.
      const exps = await fetchExperiments()
      setExperiments(exps)
      setLoadError(null)

      const [trs, links, sets] = await Promise.all([
        fetchTrays().catch(() => [] as Tray[]),
        fetchDayLinks().catch(() => [] as DayLink[]),
        fetchSettings().catch(() => ({}) as Record<string, string>),
      ])
      setTrays(trs)
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
      subscribeToTrays(reload),
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

  const handleUpdateDates = async (
    id: string,
    startISO: string,
    endISO: string,
  ) => {
    // Optimistic: reflect the drag immediately, then persist.
    setExperiments((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, start_date: startISO, end_date: endISO } : e,
      ),
    )
    const exp = experiments.find((e) => e.id === id)
    if (!exp) return
    await updateExperiment(id, {
      title: exp.title,
      start_date: startISO,
      end_date: endISO,
      status: exp.status,
      owner: exp.owner,
      notes: exp.notes,
    })
    await reload()
  }

  const handleReorderTrays = async (orderedIds: string[]) => {
    // Optimistic local reorder for snappy feel.
    setTrays((prev) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i]))
      return prev.map((t) => (pos.has(t.id) ? { ...t, position: pos.get(t.id)! } : t))
    })
    await reorderTrays(orderedIds)
    await reload()
  }

  const handleAddTray = async (experimentId: string, name: string) => {
    const existing = trays.filter((t) => t.experiment_id === experimentId)
    await createTray({ experiment_id: experimentId, name, position: existing.length })
    await reload()
  }

  const handleDeleteTray = async (id: string) => {
    await deleteTray(id)
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
        <>
          <Calendar
            year={year}
            month={month}
            experiments={experiments}
            onAddOnDay={(iso) => setModal({ existing: null, defaultDate: iso })}
            onOpenExperiment={(exp) =>
              setModal({ existing: exp, defaultDate: exp.start_date })
            }
          />
          <Timeline
            year={year}
            month={month}
            experiments={experiments}
            trays={trays}
            dayLinks={dayLinks}
            onUpdateDates={handleUpdateDates}
            onNewExperiment={() =>
              setModal({ existing: null, defaultDate: `${year}-${String(month + 1).padStart(2, '0')}-01` })
            }
            onOpenExperiment={(exp) =>
              setModal({ existing: exp, defaultDate: exp.start_date })
            }
            onReorderTrays={handleReorderTrays}
            onAddTray={handleAddTray}
            onDeleteTray={handleDeleteTray}
            onSaveDayLink={handleSaveDayLink}
          />
        </>
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
