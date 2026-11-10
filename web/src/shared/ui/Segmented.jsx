import { cx } from '../lib/cx'

/** Переключатель-капсула (iOS): вкладки «Клиенты · Сотрудники», «Статьи · Кейсы» */
export function Segmented({ options, value, onChange, className, label }) {
  return (
    <div role="tablist" aria-label={label} className={cx('panel inline-flex max-w-full overflow-x-auto rounded-full p-1 gap-1 [scrollbar-width:none]', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition',
            value === o.value ? 'accent-fill text-white' : 'text-ink-2 hover:text-ink hover:bg-panel-2',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-70 tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
