import { cx } from '../lib/cx'
import { Spinner } from './Spinner'

/*
 * Кнопки LIVSKY: основная — тонированное стекло в тонах биома, как на сайте,
 * остальные — светлое стекло. Форма — капсула.
 */
const variants = {
  primary: 'accent-fill text-white border border-transparent hover:brightness-115',
  secondary:
    'bg-panel text-ink border border-line-2 hover:bg-panel-2 hover:border-ink-3',
  outline:
    'bg-transparent text-ink-2 border border-line-2 hover:text-ink hover:border-ink-3 hover:bg-panel-2',
  ghost:
    'bg-transparent text-ink-2 border border-transparent hover:text-ink hover:bg-panel-2 hover:border-line',
  quiet:
    'bg-transparent text-accent border border-transparent hover:bg-accent-soft hover:border-accent/30 font-semibold',
  danger:
    'bg-danger-soft text-danger border border-danger/40 hover:border-danger hover:bg-danger/12',
}

const sizes = {
  sm: 'h-8 px-3.5 text-xs rounded-full gap-1.5',
  md: 'h-10 px-5 text-sm rounded-full gap-2',
  lg: 'h-12 px-7 text-base rounded-full gap-2.5',
}

export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  full = false,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <Tag
      className={cx(
        'inline-flex items-center justify-center font-semibold select-none whitespace-nowrap',
        'transition duration-150 cursor-pointer active:scale-[0.98]',
        'disabled:opacity-45 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={size === 'lg' ? 16 : 13} />}
      {children}
    </Tag>
  )
}
