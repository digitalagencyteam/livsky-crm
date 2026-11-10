import { useId } from 'react'
import { cx } from '../lib/cx'

export function Field({ label, hint, error, required, htmlFor, children, className }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="caption select-none">
          {label}
          {required && <span className="text-accent ml-1">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger leading-snug">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-3 leading-snug">{hint}</p>
      ) : null}
    </div>
  )
}

export function controlClasses({ error, size = 'md' }) {
  return cx(
    'w-full bg-panel border text-ink placeholder:text-ink-3',
    'rounded-(--radius-field) outline-none transition-colors duration-150',
    // Фокус подсвечивается кольцом акцентного цвета: в плотной форме
    // одной смены границы недостаточно, чтобы понять, где каретка.
    'focus:border-accent focus:ring-2 focus:ring-accent/25',
    size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm',
    error ? 'border-danger' : 'border-line-2',
  )
}

export function useFieldId(propId) {
  const autoId = useId()
  return propId || autoId
}
