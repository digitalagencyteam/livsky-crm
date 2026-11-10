import { Pill } from '../shared/ui/Pill'
import { cx } from '../shared/lib/cx'

export function PageSection({ pill, title, subtitle, actions, className, children }) {
  return (
    <section className={cx('flex flex-col gap-5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          {pill && <Pill className="self-start">{pill}</Pill>}
          {title && <h1 className="font-display text-2xl">{title}</h1>}
          {subtitle && <p className="text-sm text-ink-3 max-w-xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {children}
    </section>
  )
}
