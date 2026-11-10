import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Field, controlClasses, useFieldId } from './Field'
import { useAnchoredPanel } from './useAnchoredPanel'
import { cx } from '../lib/cx'

const pad = (n) => String(n).padStart(2, '0')

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i))

/** Из набранного оставляем цифры и собираем ЧЧ:ММ. */
function format(raw) {
  const digits = String(raw).replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/** Приводим к настоящему времени: 9:7 → 09:07, 25:99 → 23:59. */
function normalize(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  const h = Math.min(23, Number(digits.slice(0, 2).padEnd(2, '0')))
  const m = Math.min(59, Number(digits.slice(2, 4).padEnd(2, '0')))
  return `${pad(h)}:${pad(m)}`
}

/** Разбираем ЧЧ:ММ на части. Пустое поле — полночь, чтобы было с чего начать. */
function parts(value) {
  const m = /^(\d{2}):(\d{2})$/.exec(normalize(value) || '')
  return m ? { h: m[1], m: m[2] } : { h: '00', m: '00' }
}

/**
 * Родной <input type="time"> открывает часы операционной системы: на
 * телефоне это колесо, на макбуке — свои стрелки и своё оформление.
 *
 * Здесь поле остаётся обычным текстовым — набрать «1845» по-прежнему самый
 * быстрый способ. Рядом кнопка, которая открывает те же две прокручиваемые
 * колонки, что и системное колесо: часы и минуты по отдельности, любая
 * минута. Готовый список ходовых времён тут был бы удобнее ровно до
 * первого «нужно на 18:37».
 */
export function TimePicker({ label, hint, error, required, disabled, value, onChange, id: propId, className }) {
  const id = useFieldId(propId)
  const { open, setOpen, pos, boxRef, panelRef, host } = useAnchoredPanel({ height: 260 })
  const [raw, setRaw] = useState(value || '')

  // Значение могли поменять снаружи — например, открыли карточку другого
  // звонка в том же окне.
  useEffect(() => { setRaw(value || '') }, [value])

  const current = parts(raw || value)

  // Обе колонки подкручиваем к текущему времени поля: иначе часы открываются
  // на полуночи, а минуты — на нуле, и до нужного значения далеко.
  //
  // Зависим и от pos: панели в DOM ещё нет, пока не посчитано её место.
  // И делаем это один раз за открытие — иначе пересчёт положения при
  // прокрутке страницы возвращал бы колонки под пальцем на исходное место.
  const scrolled = useRef(false)
  useEffect(() => { if (!open) scrolled.current = false }, [open])
  useEffect(() => {
    if (!open || scrolled.current || !panelRef.current) return
    for (const [key, val] of [['hours', current.h], ['minutes', current.m]]) {
      const col = panelRef.current.querySelector(`[data-col="${key}"]`)
      const item = col?.querySelector(`[data-value="${val}"]`)
      if (col && item) col.scrollTop = item.offsetTop - col.clientHeight / 2 + item.offsetHeight / 2
    }
    scrolled.current = true
  }, [open, pos])

  function emit(next) {
    setRaw(next)
    onChange?.(next)
  }

  function type(next) {
    const shown = format(next)
    setRaw(shown)
    // Наружу отдаём только готовое время: полуфабрикат «18:4» сломал бы
    // сборку даты у вызывающего.
    onChange?.(shown.length === 5 ? normalize(shown) : '')
  }

  function blur() {
    const fixed = normalize(raw)
    setRaw(fixed)
    onChange?.(fixed)
  }

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <div className="relative" ref={boxRef}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="18:45"
          disabled={disabled}
          value={raw}
          onChange={(e) => type(e.target.value)}
          onBlur={blur}
          className={cx(controlClasses({ error }), 'pr-11 tabular-nums')}
        />

        <button
          type="button"
          tabIndex={-1}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-label="Выбрать время из списка"
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink cursor-pointer disabled:cursor-default"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>

        {open && !disabled && pos && createPortal(
          <div
            ref={panelRef}
            style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            className="z-[60] panel panel-solid rounded-card p-1 animate-fade-in shadow-xl overflow-hidden flex flex-col"
          >
            <div className="flex min-h-0 flex-1 gap-1">
              <Column
                name="hours"
                title="часы"
                items={HOURS}
                selected={current.h}
                // Час поменяли — окно оставляем открытым: минуту ещё не выбрали.
                onPick={(h) => emit(`${h}:${current.m}`)}
              />
              <Column
                name="minutes"
                title="минуты"
                items={MINUTES}
                selected={current.m}
                // Минута — последний шаг, после неё закрываемся.
                onPick={(m) => { setOpen(false); emit(`${current.h}:${m}`) }}
              />
            </div>
          </div>,
          host || document.body,
        )}
      </div>
    </Field>
  )
}

function Column({ name, title, items, selected, onPick }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="caption px-2 pb-1 pt-0.5">{title}</p>
      <div data-col={name} className="min-h-0 flex-1 overflow-y-auto">
        {items.map((v) => (
          <button
            key={v}
            data-value={v}
            type="button"
            onClick={() => onPick(v)}
            className={cx(
              'block w-full rounded-[8px] px-2 py-1.5 text-sm tabular-nums transition-colors cursor-pointer',
              v === selected
                ? 'bg-accent text-on-accent font-semibold'
                : 'text-ink-2 hover:bg-panel-2 hover:text-ink',
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
