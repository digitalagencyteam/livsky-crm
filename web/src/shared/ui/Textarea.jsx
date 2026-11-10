import { Field, controlClasses, useFieldId } from './Field'
import { cx } from '../lib/cx'

export function Textarea({ label, hint, error, required, rows = 4, id: propId, className, ...props }) {
  const id = useFieldId(propId)
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <textarea
        id={id}
        rows={rows}
        className={cx(controlClasses({ error }), 'h-auto py-3 resize-y leading-relaxed')}
        {...props}
      />
    </Field>
  )
}
