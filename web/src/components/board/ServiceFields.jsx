import { AddAction, Checkbox, DatePicker, Input, MoneyInput, Select } from '../../shared/ui'
import { cx } from '../../shared/lib/cx'
import { dayKey, marginText, money, monthOptions } from '../../utils/board'

// id есть только у расходов, уже сохранённых на сервере. paidAt — день выплаты
// строкой ГГГГ-ММ-ДД, пустой, пока расход не оплачен.
export const newExpense = () => ({
  key: Math.random().toString(36).slice(2), title: '', amount: '', paid: false, paidAt: '',
})
export const newService = () => ({
  key: Math.random().toString(36).slice(2),
  // Месяц и дата оплаты пустые, а не «открытый месяц» и «сегодня»: их
  // называют сами, иначе в отчёте о деньгах окажется выдуманный день, а
  // услуга, оплаченная в конце октября, ляжет в ноябрь.
  title: '', month: '', paidAt: '', revenue: '', expenses: [],
})

export const num = (v) => (v === '' ? 0 : Number(String(v).replace(',', '.')))

/** Сумма расходов и прибыль по одной услуге — подсказка, пока человек печатает. */
export function serviceProfit(service) {
  const spent = service.expenses.reduce((n, e) => n + (Number.isFinite(num(e.amount)) ? num(e.amount) : 0), 0)
  return num(service.revenue) - spent
}

/**
 * Поля одной услуги: что делали, за какой месяц, выручка, день оплаты и
 * строки расходов.
 *
 * Один компонент на два места — форму новой услуги и форму нового клиента,
 * где услуги заводятся сразу. Заказчик так и описывал: «нажали на кнопочку
 * новый клиент, у нас прямо большой лист, который нужно заполнить». Держать
 * два одинаковых набора полей значило бы однажды поправить только один.
 */
export function ServiceFields({ value, onChange, onRemove, compact }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const patchExpense = (key, patch) =>
    set({ expenses: value.expenses.map((e) => (e.key === key ? { ...e, ...patch } : e)) })

  const profit = serviceProfit(value)
  const margin = marginText(profit, num(value.revenue))
  // День по Москве: в первые три часа суток день по UTC ещё вчерашний, и
  // оплату, пришедшую сегодня, нельзя было бы выбрать.
  const today = dayKey()

  return (
    <div className={cx('flex flex-col gap-4', compact && 'rounded-card border border-line p-4')}>
      <div className="flex items-start gap-2">
        <Input
          className="flex-1"
          label="Что делали"
          required
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Например: SMM — ведение телеграм-канала"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Убрать услугу"
            className="mt-7 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Месяц на всю ширину, а сумма и день оплаты — парой под ним: «сколько»
            и «когда» читаются вместе, и третье поле не висит одно в углу. */}
        <Select
          className="sm:col-span-2"
          label="За какой месяц"
          required
          placeholder="Выберите месяц"
          value={value.month}
          onChange={(e) => set({ month: e.target.value })}
          options={monthOptions([], value.month)}
          hint="Суммы относятся к этому месяцу"
        />
        <MoneyInput
          label="Сколько заплатил клиент"
          required
          value={value.revenue}
          onChange={(v) => set({ revenue: v })}
          placeholder="800"
        />
        <DatePicker
          label="Когда заплатил клиент"
          required
          value={value.paidAt}
          onChange={(v) => set({ paidAt: v })}
          today={today}
          max={today}
          hint="Выручка остаётся в месяце услуги"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="caption">Расходы по этой услуге</p>

        {value.expenses.length === 0 && (
          <p className="text-xs text-ink-3">Расходов нет — вся выручка идёт в прибыль.</p>
        )}

        {/* Колонки подписаны один раз сверху, а не у каждой строки: иначе
            подписи повторялись бы столько раз, сколько расходов. */}
        {value.expenses.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="caption flex-1">На что потратили</span>
            <span className="caption w-28 shrink-0">Сколько</span>
            <span className="w-7 shrink-0" aria-hidden="true" />
          </div>
        )}

        {value.expenses.map((e) => (
          <div key={e.key} className="mb-1 flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <Input
                className="flex-1"
                size="sm"
                value={e.title}
                onChange={(ev) => patchExpense(e.key, { title: ev.target.value })}
                placeholder="Копирайтер"
              />
              <MoneyInput
                className="w-28 shrink-0"
                size="sm"
                value={e.amount}
                onChange={(v) => patchExpense(e.key, { amount: v })}
                placeholder="200"
              />
              <button
                type="button"
                onClick={() => set({ expenses: value.expenses.filter((x) => x.key !== e.key) })}
                title="Убрать расход"
                className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Отметка под строкой, а не в ней: на телефоне в одну строку не
                уместились бы название, сумма, галочка и крестик. День выплаты
                по умолчанию сегодняшний, его можно сменить, в том числе задним
                числом. У старых оплаченных расходов дня нет, и тогда выбор не
                показываем: дату придумывать за человека нельзя. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Checkbox
                label="Оплачено"
                checked={e.paid}
                onChange={(ev) => patchExpense(e.key, ev.target.checked ? { paid: true, paidAt: today } : { paid: false, paidAt: '' })}
              />
              {e.paid && e.paidAt && (
                <DatePicker
                  className="w-44"
                  size="sm"
                  value={e.paidAt}
                  onChange={(v) => patchExpense(e.key, { paidAt: v })}
                  today={today}
                  max={today}
                />
              )}
            </div>
          </div>
        ))}

        <AddAction onClick={() => set({ expenses: [...value.expenses, newExpense()] })}>
          Добавить расход
        </AddAction>
      </div>

      {/* Подсказка, пока печатают. Настоящую прибыль считает сервер и
          возвращает обратно — арифметика живёт в одном месте. */}
      <div className="flex items-baseline justify-between gap-3 rounded-[10px] border border-line px-4 py-2.5">
        <span className="caption">Прибыль по услуге</span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={cx('text-base font-semibold tabular-nums', profit < 0 ? 'text-danger' : 'text-ok')}>
            {money(Math.round(profit * 100))}
          </span>
          {/* Доля прибыли в выручке — её просил заказчик: сумма сама по себе
              не говорит, много это или мало для такой услуги. */}
          {margin && <span className="text-xs text-ink-3 tabular-nums">{margin}</span>}
        </span>
      </div>
    </div>
  )
}

/** Общая проверка полей услуги — одна на обе формы. */
export function validateService(s) {
  if (!s.title.trim()) return 'Укажите название услуги'
  if (!s.month) return `Выберите, за какой месяц услуга «${s.title.trim()}»`
  if (s.revenue === '' || !Number.isFinite(num(s.revenue))) return `Выручка по «${s.title.trim()}» не число`
  if (!s.paidAt) return `Укажите, когда клиент заплатил за «${s.title.trim()}»`
  for (const e of s.expenses) {
    if (!e.title.trim()) return 'У каждого расхода должно быть название — на что он'
    if (e.amount === '' || !Number.isFinite(num(e.amount))) return `Сумма расхода «${e.title}» не число`
  }
  return null
}

/** Приводит поля формы к тому, что ждёт сервер. */
export const serviceToPayload = (s) => ({
  title: s.title.trim(),
  month: s.month,
  // Строка ГГГГ-ММ-ДД: DatePicker отдаёт её, а не событие и не Date.
  paidAt: s.paidAt,
  revenue: num(s.revenue),
  expenses: s.expenses.map((e) => ({
    // id нужен серверу, чтобы узнать расход и не потерять дату оплаты.
    ...(e.id ? { id: e.id } : {}),
    title: e.title.trim(),
    amount: num(e.amount),
    paid: e.paid,
    // День выплаты уходит только у оплаченных; у старых его может не быть.
    ...(e.paid && e.paidAt ? { paidAt: e.paidAt } : {}),
  })),
})
