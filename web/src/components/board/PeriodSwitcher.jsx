import { DatePicker, Select } from '../../shared/ui'
import { cx } from '../../shared/lib/cx'
import { dayKey, monthOptions } from '../../utils/board'

/**
 * Переключатель периода над доской.
 *
 * «Месяц» — это выбор любого месяца, как просил заказчик изначально.
 * Три, шесть и год — скользящие окна от сегодняшнего дня: они считаются на
 * сервере, поэтому ссылка не устаревает и «последний год» не превращается
 * со временем в позапрошлый.
 */
const MODES = [
  { id: 'month', label: 'Месяц' },
  { id: 'last', months: 3, label: '3 месяца' },
  { id: 'last', months: 6, label: '6 месяцев' },
  { id: 'last', months: 12, label: 'Год' },
  { id: 'all', label: 'За всё время' },
  { id: 'period', label: 'Свой период' },
]

const isActive = (value, m) =>
  value.mode === m.id && (m.id !== 'last' || Number(value.months) === m.months)

export function PeriodSwitcher({ value, onChange, monthsWithData }) {
  // Сбрасываем чужие параметры при переключении: иначе в адресе копились бы
  // хвосты от прошлых режимов, а сервер отклоняет несогласованный набор.
  const pick = (m) => onChange({
    mode: m.id,
    months: m.months ? String(m.months) : '',
    month: m.id === 'month' ? value.month : '',
    from: m.id === 'period' ? value.from : '',
    to: m.id === 'period' ? value.to : '',
  })

  const months = monthOptions(monthsWithData, value.month)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.label}
            onClick={() => pick(m)}
            className={cx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer',
              isActive(value, m) ? 'accent-fill text-white' : 'panel text-ink-3 hover:text-ink',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {value.mode === 'month' && (
        <div className="max-w-xs">
          <Select
            label="Какой месяц"
            value={value.month || ''}
            onChange={(e) => onChange({ ...value, month: e.target.value })}
            options={months}
          />
        </div>
      )}

      {value.mode === 'period' && (
        <div className="flex flex-col gap-2">
          <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
            <DatePicker
              label="С"
              value={value.from || ''}
              onChange={(v) => onChange({ ...value, from: v })}
              today={dayKey()}
              max={value.to || dayKey()}
            />
            <DatePicker
              label="По"
              value={value.to || ''}
              onChange={(v) => onChange({ ...value, to: v })}
              today={dayKey()}
              min={value.from || ''}
              max={dayKey()}
            />
          </div>
          <p className="text-xs text-ink-3">
            Месяц попадает в период, если его первое число лежит в выбранном диапазоне. Половины месяца не бывает.
          </p>
        </div>
      )}
    </div>
  )
}
