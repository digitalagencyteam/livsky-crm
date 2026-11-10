import { cx } from '../lib/cx'

const pads = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

export function Card({ hover = false, pad = 'md', className, children, ...props }) {
  return (
    <div
      className={cx(
        'panel rounded-card',
        hover && 'transition-colors duration-150 hover:border-line-2',
        pads[pad],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
