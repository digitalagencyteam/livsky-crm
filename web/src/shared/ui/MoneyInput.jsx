import { Field, controlClasses, useFieldId } from './Field'
import { cx } from '../lib/cx'

/**
 * Поле суммы. Буквы в него просто не попадают.
 *
 * Обычный текстовый ввод с inputMode=decimal подсказывает телефону цифровую
 * клавиатуру, но на компьютере не мешает набрать что угодно — и «двести»
 * уезжало бы на сервер как ноль. Здесь всё лишнее отбрасывается прямо при
 * наборе: остаются цифры и один разделитель.
 *
 * Запятую превращаем в точку: так набирают по-русски, а считать надо числом.
 */
export function clean(raw) {
  let s = String(raw ?? '').replace(/[^\d.,]/g, '').replace(/,/g, '.')

  // Разделитель только один — второй и дальше отбрасываем.
  const dot = s.indexOf('.')
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '')

  const [whole, fraction] = s.split('.')
  const head = whole.slice(0, 12)
  return fraction === undefined ? head : `${head}.${fraction.slice(0, 2)}`
}

export function MoneyInput({ label, hint, error, required, size = 'md', value, onChange, id: propId, className, ...props }) {
  const id = useFieldId(propId)
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 select-none text-sm text-ink-3">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange?.(clean(e.target.value))}
          className={cx(controlClasses({ error, size }), 'pl-7 tabular-nums')}
          {...props}
        />
      </div>
    </Field>
  )
}
