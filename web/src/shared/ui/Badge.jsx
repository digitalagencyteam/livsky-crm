import { cx } from '../lib/cx'

/*
 * Статус читается словом на приглушённой подложке. Точку убрали: она
 * дублировала цвет подложки и добавляла шума в плотных списках.
 */
const tones = {
  neutral: 'bg-panel-2 text-ink-2 border-line',
  brand: 'bg-accent-soft text-accent border-accent/30',
  ok: 'bg-ok-soft text-ok border-ok/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  // Салатовый — «прямо сейчас»: звонок стоит на сегодня и ещё не прошёл.
  now: 'bg-now-soft text-now border-now/35',
}

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center px-2 py-0.5 rounded-md border',
        'text-xs font-semibold whitespace-nowrap',
        tones[tone] || tones.neutral,
        className,
      )}
    >
      {children}
    </span>
  )
}
