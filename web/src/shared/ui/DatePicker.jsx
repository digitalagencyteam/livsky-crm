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

const pad = (n) => String(n).padStart(2, '0')
const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function parse(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!m) return null
  return { y: +m[1], m: +m[2] - 1, d: +m[3] }
}

/**
 * Родной <input type="date"> открывает календарь операционной системы:
 * он игнорирует тему CRM, говорит на языке системы и на macOS выглядит
 * совершенно чужеродно посреди тёмной панели. Здесь тот же формат
 * значения (YYYY-MM-DD), но нарисованный своими токенами.
 *
 * today передаётся снаружи строкой: день считается по Москве, а браузер
 * сотрудника может стоять в другом поясе — вычислять «сегодня» внутри
 * компонента значило бы подсветить не тот день.
 *
 * today только подсвечивает день и даёт кнопку «Сегодня». Границы задают
 * min и max, и это разные вещи: у даты начала работы с клиентом верхняя
 * граница — сегодня, а нижней нет вовсе, потому что работать с ним начали
 * полгода назад. Пока today служил заодно и нижней границей, в таких полях
 * выбиралось ровно одно число — сегодняшнее.
 */
export function DatePicker({ label, hint, error, required, disabled, size = 'md', value, onChange, today, min, max, id: propId, className }) {
  const id = useFieldId(propId)
  // Портал, fixed и пересчёт при прокрутке — общая механика всплывающих
  // панелей, одна на календарь и на выпадающие списки.
  const { open, setOpen, pos, boxRef, panelRef, host } = useAnchoredPanel({ width: 266, height: 320 })

  const selected = parse(value)
  const [view, setView] = useState(() => selected || parse(today) || { y: 2026, m: 0, d: 1 })

  // Открыли окно на другой дате — календарь должен показать её месяц,
  // а не тот, на котором его закрыли в прошлый раз.
  useEffect(() => {
    if (open && selected) setView({ y: selected.y, m: selected.m, d: selected.d })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1))
    // getUTCDay(): 0 — воскресенье. Неделя начинается с понедельника.
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

  const buttonLabel = selected
    ? new Date(Date.UTC(selected.y, selected.m, selected.d)).toLocaleDateString('ru-RU', {
        weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC',
      })
    : 'Выберите день'

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
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
            controlClasses({ error, size }),
            'flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-60 disabled:cursor-default',
            open && 'border-accent ring-2 ring-accent/25',
          )}
        >
          <span className="truncate">{buttonLabel}</span>
          <svg className="shrink-0 text-ink-3" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="4.5" width="18" height="16" rx="3" />
            <path d="M8 2.5v4M16 2.5v4M3 10h18" />
          </svg>
        </button>

        {open && !disabled && pos && createPortal(
          <div
            ref={panelRef}
            style={{ position: 'absolute', top: pos.top, left: pos.left, maxHeight: pos.maxHeight, overflowY: 'auto' }}
            className="z-[60] w-[266px] panel panel-solid rounded-card p-3 flex flex-col gap-2 animate-fade-in shadow-xl"
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
                const isSelected = k === value
                const isToday = k === today
                // За границей день виден, но не кликается: спрятать его
                // целиком значило бы порвать сетку месяца.
                const blocked = (max && k > max) || (min && k < min)
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={blocked}
                    onClick={() => { onChange(k); setOpen(false) }}
                    className={cx(
                      'h-8 rounded-lg text-sm transition-colors',
                      blocked
                        ? 'text-ink-3/35 cursor-default'
                        : isSelected
                          ? 'accent-fill text-white font-semibold cursor-pointer'
                          : isToday
                            ? 'text-accent font-semibold hover:bg-accent-soft cursor-pointer'
                            : 'text-ink-2 hover:bg-panel-2 hover:text-ink cursor-pointer',
                    )}
                  >
                    {d}
                  </button>
                )
              })}
            </div>

            {/* «Сегодня» вне разрешённых дат только сбило бы форму. */}
            {today && !(max && today > max) && !(min && today < min) && (
              <button
                type="button"
                onClick={() => { onChange(today); setOpen(false) }}
                className="caption !text-accent hover:underline cursor-pointer py-0.5"
              >
                Сегодня
              </button>
            )}
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
