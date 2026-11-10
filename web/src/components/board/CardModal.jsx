import { AddAction, Badge, Button, Checkbox, DatePicker, EmptyState, Modal, Spinner } from '../../shared/ui'
import { cx } from '../../shared/lib/cx'
import {
  dateLabel, dayKey, finishingNote, isFinishing, marginText, money, monthLabel, servicesWord, tenure,
} from '../../utils/board'

/**
 * Развёрнутая карточка: услуги выбранного периода, под каждой её расходы и
 * посчитанная прибыль.
 *
 * Все суммы приходят с сервера уже посчитанными. Здесь ничего не считается —
 * иначе две арифметики однажды разойдутся.
 */
export function CardModal({
  open, onClose, card, loading, periodLabel, notice, payingExpenses,
  onAddService, onEditService, onDeleteService, onChangePaid, onLeave, onReturn, onRemove,
}) {
  const left = card?.status === 'left'
  // Доделки идут отдельным списком: их деньги относятся к другому периоду.
  const services = card?.services ?? []
  const regular = services.filter((s) => !isFinishing(s))
  const finishing = services.filter(isFinishing)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={card?.client?.name || 'Клиент'}
      footer={card ? (
        <>
          <Button variant="ghost" className="!text-danger mr-auto" onClick={onRemove}>
            Убрать из бухгалтерии
          </Button>
          {left
            ? <Button variant="secondary" onClick={onReturn}>Вернуть в работу</Button>
            : <Button variant="danger" onClick={onLeave}>Клиент ушёл</Button>}
        </>
      ) : null}
    >
      {loading || !card ? (
        <div className="grid place-items-center py-10"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {left ? <Badge tone="danger">Ушёл</Badge> : <Badge tone="ok">В работе</Badge>}
                <span className="text-xs text-ink-3">
                  с нами {tenure(card.daysWithUs)}, с {dateLabel(card.startedAt)}
                </span>
              </div>
              {card.contact && <p className="text-sm text-ink-2">{card.contact}</p>}
              {left && card.leftReason && (
                <p className="text-sm text-ink-3">
                  Ушёл {dateLabel(card.leftAt)} — {card.leftReason}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <Figure label={`Выручка · ${periodLabel}`} value={money(card.revenueCents)} />
              <Figure
                label={`Прибыль · ${periodLabel}`}
                value={money(card.profitCents)}
                tone={card.profitCents < 0 ? 'text-danger' : 'text-ok'}
                note={marginText(card.profitCents, card.revenueCents)}
              />
              {/* Расходы, которые ещё предстоит выплатить. В прибыль они уже
                  вычтены, так что это не третья сумма, а напоминание. */}
              {card.unpaidCents > 0 && (
                <Figure label="Не выплачено" value={money(card.unpaidCents)} tone="text-warn" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="caption">Услуги · {periodLabel}</p>
              <p className="caption">{servicesWord(card.serviceCountTotal)} за всё время</p>
            </div>

            {notice && <p className="text-sm text-ok" role="status">{notice}</p>}

            {services.length === 0 ? (
              <EmptyState
                label="Пусто"
                text={card.serviceCountTotal === 0
                  ? 'Услуг пока нет. Добавьте первую.'
                  : 'В этом периоде услуг не было. Добавьте их или переключите период наверху страницы.'}
              />
            ) : (
              regular.map((s) => (
                <ServiceBlock
                  key={s.id}
                  service={s}
                  paying={payingExpenses}
                  onEdit={() => onEditService(s)}
                  onDelete={() => onDeleteService(s)}
                  onChangePaid={onChangePaid}
                />
              ))
            )}

            {finishing.length > 0 && (
              <>
                <p className="caption mt-1">Доделки</p>
                {finishing.map((s) => (
                  <FinishingBlock key={s.id} service={s} onEdit={() => onEditService(s)} />
                ))}
              </>
            )}

            <AddAction onClick={onAddService}>Добавить услугу</AddAction>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Figure({ label, value, tone, note }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="caption whitespace-nowrap">{label}</span>
      <span className={cx('font-display text-xl font-bold tabular-nums', tone)}>{value}</span>
      {note && <span className="text-xs text-ink-3 tabular-nums">{note}</span>}
    </div>
  )
}

/**
 * Услуга другого месяца, по которой работы идут в этом периоде. Сумм здесь
 * нет намеренно: выручка и расходы лежат в месяце услуги, а в итоги этого
 * периода не входят. Править её можно, например продлить срок.
 */
function FinishingBlock({ service, onEdit }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-card border border-dashed border-line-2 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-ink-2" title={service.title}>{service.title}</p>
        <span className="text-xs text-ink-3">{finishingNote(service)}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>Изменить</Button>
    </section>
  )
}

function ServiceBlock({ service, paying, onEdit, onDelete, onChangePaid }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate font-semibold leading-snug">{service.title}</p>
          <span className="caption">
            {monthLabel(service.month)}
            {/* У услуг, заведённых до появления поля, даты нет — их строка
                остаётся прежней. */}
            {service.paidAt && ` · оплачено ${dateLabel(service.paidAt)}`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>Изменить</Button>
          <Button variant="ghost" size="sm" className="!text-ink-3 hover:!text-danger" onClick={onDelete}>
            Удалить
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Line label="Выручка" value={money(service.revenueCents)} />

        {service.expenses.map((e) => (
          <ExpenseLine key={e.id} expense={e} pending={paying?.[e.id]} onChange={(next) => onChangePaid(e, next)} />
        ))}

        {service.expenses.length === 0 && (
          <p className="pl-3 text-xs text-ink-3">Расходов нет</p>
        )}

        <div className="mt-1 border-t border-line pt-2">
          <Line
            label="Прибыль"
            note={marginText(service.profitCents, service.revenueCents)}
            value={money(service.profitCents)}
            tone={service.profitCents < 0 ? 'text-danger' : 'text-ok'}
            strong
          />
        </div>
      </div>
    </section>
  )
}

/**
 * Строка расхода с галочкой «оплачено» и днём выплаты. Любое изменение сразу
 * уходит на сервер: отдельной кнопки «сохранить» нет. Пока запрос идёт,
 * показываем уже новое значение и не даём нажать второй раз.
 *
 * Ставишь галочку, день по умолчанию сегодняшний (по Москве); его можно сменить
 * в календаре, в том числе задним числом. Оплаченный расход приглушён: внимание
 * нужно тому, что ещё не выплачено. У старых оплаченных расходов дня нет, и
 * тогда пишем просто «оплачено».
 */
function ExpenseLine({ expense, pending, onChange }) {
  const { paid, paidAt } = pending ?? {
    paid: Boolean(expense.paid),
    paidAt: expense.paidAt ? dayKey(expense.paidAt) : '',
  }
  const busy = pending !== undefined
  const tone = paid ? 'text-ink-3' : 'text-ink-2'
  const today = dayKey()

  return (
    <div className="flex flex-col gap-1.5 pl-3">
      <div className="flex items-center gap-2">
        {/* Отрицательный отступ раздвигает зону нажатия, не меняя высоту строки:
            квадрат в 20 пикселей пальцем на телефоне не поймать. */}
        <Checkbox
          className={cx('-m-1.5 p-1.5', busy && 'opacity-60')}
          checked={paid}
          disabled={busy}
          onChange={(ev) => onChange(ev.target.checked ? { paid: true, paidAt: today } : { paid: false })}
          aria-label={`Расход «${expense.title}» оплачен`}
        />
        <span className={cx('min-w-0 flex-1 truncate text-sm', tone)} title={expense.title}>{expense.title}</span>
        <span className={cx('shrink-0 text-sm tabular-nums', tone)}>{`− ${money(expense.amountCents)}`}</span>
      </div>

      {/* Отступ слева равен ширине галочки и зазору: день стоит под названием. */}
      {paid && paidAt && (
        <DatePicker
          className="ml-7 w-44"
          size="sm"
          value={paidAt}
          onChange={(v) => onChange({ paid: true, paidAt: v })}
          today={today}
          max={today}
          disabled={busy}
        />
      )}
      {paid && !paidAt && <span className="pl-7 text-[11px] leading-tight text-ink-3">оплачено</span>}
    </div>
  )
}

function Line({ label, value, tone, muted, indent, strong, note }) {
  return (
    <div className={cx('flex items-baseline justify-between gap-3', indent && 'pl-3')}>
      {/* Подпись и пометка про долю держим вместе слева, чтобы суммы
          справа остались в одной колонке и читались столбиком. */}
      <span className="flex min-w-0 items-baseline gap-2">
        <span className={cx('min-w-0 truncate text-sm', muted ? 'text-ink-3' : 'text-ink-2')} title={label}>
          {label}
        </span>
        {note && <span className="shrink-0 text-xs text-ink-3 tabular-nums">{note}</span>}
      </span>
      <span className={cx('shrink-0 tabular-nums', strong ? 'text-sm font-semibold' : 'text-sm', tone, muted && 'text-ink-3')}>
        {value}
      </span>
    </div>
  )
}
