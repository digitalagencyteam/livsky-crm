import { cx } from '../lib/cx'

export function Form({ onSubmit, className, children, ...props }) {
  return (
    <form
      className={cx('flex flex-col gap-4', className)}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.(Object.fromEntries(new FormData(e.currentTarget)), e)
      }}
      {...props}
    >
      {children}
    </form>
  )
}


