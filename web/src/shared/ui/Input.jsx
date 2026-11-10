import { Field, controlClasses, useFieldId } from './Field'
import { cx } from '../lib/cx'

export function Input({
  label,
  hint,
  error,
  required,
  size = 'md',
  icon,
  rightSlot,
  id: propId,
  className,
  ...props
}) {
  const id = useFieldId(propId)
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">{icon}</span>
        )}
        <input
          id={id}
          className={cx(controlClasses({ error, size }), icon && 'pl-10', rightSlot && 'pr-11')}
          {...props}
        />
        {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
    </Field>
  )
}
