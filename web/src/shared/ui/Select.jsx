import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Field, controlClasses, useFieldId } from './Field'
import { useAnchoredPanel } from './useAnchoredPanel'
import { cx } from '../lib/cx'

const PANEL_MAX = 264

/**
 * Родной <select> рисует список силами операционной системы: на телефоне
 * это колесо iOS, на макбуке — серое системное меню посреди тёмной панели.
 * Тему CRM он не знает и знать не может.
 *
 * Здесь тот же договор, что и раньше: наружу уходит onChange с объектом
 * вида { target: { value } }. Поэтому все семнадцать форм, которые читают
 * e.target.value, продолжают работать без единой правки.
 */
export function Select({
  label,
  hint,
  error,
  required,
  size = 'md',
  options = [],
  placeholder,
  disabled,
  value,
  onChange,
  id: propId,
  className,
  ...rest
}) {
  const id = useFieldId(propId)
  const { open, setOpen, pos, boxRef, panelRef, host } = useAnchoredPanel({ height: PANEL_MAX })
  const listRef = useRef(null)
  const [active, setActive] = useState(-1)

  // Пустая строка — это «ничего не выбрано», её показывает placeholder.
  const rows = useMemo(
    () => (placeholder ? [{ value: '', label: placeholder, placeholder: true }, ...options] : options),
    [options, placeholder],
  )

  const current = rows.find((o) => String(o.value) === String(value ?? ''))
  const shown = current && !current.placeholder ? current.label : placeholder || 'Выберите'

  // Открыли — подсвечиваем выбранное и прокручиваем к нему: в списке из
  // двенадцати месяцев иначе непонятно, где ты находишься.
  useEffect(() => {
    if (!open) return
    const i = rows.findIndex((o) => String(o.value) === String(value ?? ''))
    setActive(i)
    requestAnimationFrame(() => {
      listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function pick(option) {
    if (option.disabled) return
    // Отдаём наружу то же, что отдавал бы родной select.
    onChange?.({ target: { value: option.value } })
    setOpen(false)
  }

  function onKeyDown(e) {
    if (disabled) return
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); setOpen(true) }
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      let next = active
      for (let i = 0; i < rows.length; i += 1) {
        next = (next + step + rows.length) % rows.length
        if (!rows[next]?.disabled) break
      }
      setActive(next)
      requestAnimationFrame(() => {
        listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
      })
      return
    }
    if (e.key === 'Enter' && rows[active]) { e.preventDefault(); pick(rows[active]) }
  }

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <div ref={boxRef}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          className={cx(
            controlClasses({ error, size }),
            'flex items-center justify-between gap-2 text-left cursor-pointer',
            'disabled:opacity-60 disabled:cursor-default',
            open && 'border-accent ring-2 ring-accent/25',
          )}
          {...rest}
        >
          <span className={cx('truncate', (!current || current.placeholder) && 'text-ink-3')}>{shown}</span>
          <svg
            className={cx('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && !disabled && pos && createPortal(
          <div
            ref={panelRef}
            style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            className="z-[60] panel panel-solid rounded-card p-1 animate-fade-in shadow-xl overflow-hidden flex flex-col"
          >
            <div ref={listRef} role="listbox" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {rows.length === 0 && <p className="px-3 py-2 text-sm text-ink-3">Пусто</p>}

              {rows.map((o, i) => {
                const selected = String(o.value) === String(value ?? '')
                return (
                  <button
                    key={`${o.value}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-active={i === active}
                    disabled={o.disabled}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={cx(
                      'flex items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-left text-sm transition-colors',
                      o.disabled ? 'text-ink-3/50 cursor-default' : 'cursor-pointer',
                      o.placeholder && 'text-ink-3',
                      i === active && !o.disabled && 'bg-panel-2',
                      selected && !o.placeholder ? 'text-accent font-medium' : 'text-ink-2',
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {selected && !o.placeholder && (
                      <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>,
          host || document.body,
        )}
      </div>
    </Field>
  )
}
