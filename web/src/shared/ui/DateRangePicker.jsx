import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Field, controlClasses, useFieldId } from './Field'
import { useAnchoredPanel } from './useAnchoredPanel'
import { cx } from '../lib/cx'

const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

const pad = (n) => String(n).padStart(2, '0')
const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function parse(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!m) return null
  return { y: +m[1], m: +m[2] - 1, d: +m[3] }
}

function shortLabel(k) {
  const p = parse(k)
  if (!p) return ''
  return `${p.d} ${MONTHS_SHORT[p.m]}`
}

export function DateRangePicker({ label, hint, error, disabled, value, onChange, today, id: propId, className }) {
  const id = useFieldId(propId)
  const { open, setOpen, pos, boxRef, panelRef, host } = useAnchoredPanel({ width: 290, height: 340 })

  const from = value?.from || ''
  const to = value?.to || ''
  const [pending, setPending] = useState(false)
  const [view, setView] = useState(() => parse(to) || parse(from) || parse(today) || { y: 2026, m: 0, d: 1 })

  useEffect(() => {
    if (!open) { setPending(false); return }
    setView(parse(to) || parse(from) || parse(today) || { y: 2026, m: 0, d: 1 })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1))
    const lead = (first.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()
    const out = []
    for (let i = 0; i < lead; i += 1) out.push(null)
    for (let d = 1; d <= daysInMonth; d += 1) out.push(d)
    return out
  }, [view.y, view.m])

  const shiftMonth = (delta) => {
    const d = new Date(Date.UTC(view.y, view.m + delta, 1))
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth(), d: 1 })
  }

  function pick(k) {
    if (!pending) {
      onChange({ from: k, to: k })
      setPending(true)
      return
    }
    const lo = from && from < k ? from : k
    const hi = from && from > k ? from : k
    onChange({ from: lo, to: hi })
    setPending(false)
    setOpen(false)
  }

  function clear() {
    onChange({ from: '', to: '' })
    setPending(false)
  }

  const buttonLabel = from && to
    ? (from === to ? shortLabel(from) : `${shortLabel(from)} – ${shortLabel(to)}`)
    : 'Весь период'

  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <div className="relative" ref={boxRef}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cx(
            controlClasses({ error }),
            'flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-60 disabled:cursor-default',
            open && 'border-accent ring-2 ring-accent/25',
          )}
        >
          <span className="truncate">{buttonLabel}</span>
          <span className="flex items-center gap-1 shrink-0">
            {(from || to) && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); clear() }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); clear() } }}
                aria-label="Сбросить период"
                className="grid place-items-center w-5 h-5 rounded text-ink-3 hover:text-ink hover:bg-panel-2 cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </span>
            )}
            <svg className="text-ink-3" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="4.5" width="18" height="16" rx="3" />
              <path d="M8 2.5v4M16 2.5v4M3 10h18" />
            </svg>
          </span>
        </button>

        {open && !disabled && pos && createPortal(
          <div
            ref={panelRef}
            style={{ position: 'absolute', top: pos.top, left: pos.left, maxHeight: pos.maxHeight, overflowY: 'auto' }}
            className="z-[60] w-[290px] panel panel-solid rounded-card p-3 flex flex-col gap-2 animate-fade-in shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <MonthArrow left onClick={() => shiftMonth(-1)} />
              <p className="text-sm font-semibold">{MONTHS[view.m]} {view.y}</p>
              <MonthArrow onClick={() => shiftMonth(1)} />
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {WEEK.map((w) => (
                <span key={w} className="caption text-center py-1 select-none">{w}</span>
              ))}

              {cells.map((d, i) => {
                if (d === null) return <span key={`x${i}`} />
                const k = key(view.y, view.m, d)
                const isFrom = k === from
                const isTo = k === to
                const isEndpoint = isFrom || isTo
                const inRange = from && to && k > from && k < to
                const isToday = k === today
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pick(k)}
                    className={cx(
                      'h-8 rounded-lg text-sm transition-colors cursor-pointer',
                      isEndpoint
                        ? 'accent-fill text-white font-semibold'
                        : inRange
                          ? 'bg-accent-soft text-ink'
                          : isToday
                            ? 'text-accent font-semibold hover:bg-accent-soft'
                            : 'text-ink-2 hover:bg-panel-2 hover:text-ink',
                    )}
                  >
                    {d}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              {today && (
                <button
                  type="button"
                  onClick={() => pick(today)}
                  className="caption !text-accent hover:underline cursor-pointer py-0.5"
                >
                  Сегодня
                </button>
              )}
              {(from || to) && (
                <button
                  type="button"
                  onClick={() => { clear(); setOpen(false) }}
                  className="caption !text-ink-3 hover:!text-ink hover:underline cursor-pointer py-0.5"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>,
          host || document.body,
        )}
      </div>
    </Field>
  )
}

function MonthArrow({ left, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={left ? 'Предыдущий месяц' : 'Следующий месяц'}
      className="grid place-items-center w-7 h-7 rounded-lg text-ink-3 hover:text-ink hover:bg-panel-2 transition-colors cursor-pointer"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={left ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}
