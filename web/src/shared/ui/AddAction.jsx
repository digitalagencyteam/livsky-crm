import { cx } from '../lib/cx'

/*
 * Кнопка добавления внутри карточки. Раньше это была тихая ghost-кнопка,
 * которую заказчик просто не находил: серый текст без фона и границы
 * читался как подпись, а не как действие. Теперь у неё пунктирная рамка —
 * узнаваемая форма «сюда можно добавить» — и акцентный цвет.
 */
export function AddAction({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] px-3 py-2',
        'border border-dashed border-line-2 text-sm font-semibold text-ink-2',
        'transition-colors duration-150 cursor-pointer',
        'hover:border-accent hover:text-accent hover:bg-accent-soft',
        className,
      )}
      {...props}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {children}
    </button>
  )
}
