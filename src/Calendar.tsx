import { buildMonthGrid, coversDay, WEEKDAY_LABELS } from './dates'
import { STATUS_META, type Experiment } from './types'

interface Props {
  year: number
  month: number
  experiments: Experiment[]
  onAddOnDay: (iso: string) => void
  onOpenExperiment: (exp: Experiment) => void
}

export default function Calendar({
  year,
  month,
  experiments,
  onAddOnDay,
  onOpenExperiment,
}: Props) {
  const cells = buildMonthGrid(year, month)

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
          return (
            <div
              key={cell.iso}
              className={
                'day-cell' +
                (cell.inCurrentMonth ? '' : ' day-cell--muted') +
                (cell.isToday ? ' day-cell--today' : '')
              }
              onClick={() => onAddOnDay(cell.iso)}
            >
              <div className="day-header">
                <span className="day-number">{cell.date.getDate()}</span>
                {cell.isToday && <span className="today-dot">today</span>}
              </div>
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
                      title={`${exp.title} — ${meta.label}${
                        exp.owner ? ' · ' + exp.owner : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenExperiment(exp)
                      }}
                    >
                      {/* Only show the label on the first day of a range */}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
