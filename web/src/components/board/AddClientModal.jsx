import { useEffect, useMemo, useState } from 'react'
import { AddAction, Button, DatePicker, Input, Modal, Select } from '../../shared/ui'
import { ServiceFields, newService, serviceToPayload, validateService } from './ServiceFields'
import { dayKey, money } from '../../utils/board'
import { cx } from '../../shared/lib/cx'
import { serviceProfit } from './ServiceFields'

/**
 * Занести клиента на доску — та самая форма из задания: «нажали на кнопочку
 * новый клиент, у нас прямо большой лист, который нужно заполнить». Поэтому
 * услуги с их расходами заводятся здесь же, а не отдельным заходом потом.
 *
 * Услуги при этом необязательны: клиента заводят и заранее, до первого
 * платежа, и заставлять придумывать услугу ради сохранения формы незачем.
 *
 * Список клиентов в CRM один на всё — и в Иерархии, и в Архиве, и здесь.
 * Поэтому выбираем существующего, а нового можно завести тут же.
 */
export function AddClientModal({ open, onClose, onSubmit, clients, alreadyOnBoard }) {
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [contact, setContact] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [services, setServices] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setClientId(''); setClientName(''); setContact(''); setStartedAt(dayKey())
    setServices([]); setError(null)
  }, [open])

  const available = useMemo(
    () => clients.filter((c) => !alreadyOnBoard.has(c.id)),
    [clients, alreadyOnBoard],
  )

  const totalProfit = services.reduce((n, s) => n + serviceProfit(s), 0)

  async function submit() {
    if (!clientId && !clientName.trim()) return setError('Выберите клиента или впишите нового')
    for (const s of services) {
      const problem = validateService(s)
      if (problem) return setError(problem)
    }

    setBusy(true)
    setError(null)
    const res = await onSubmit({
      ...(clientId ? { clientId } : { clientName: clientName.trim() }),
      contact: contact.trim(),
      startedAt,
      ...(services.length ? { services: services.map(serviceToPayload) } : {}),
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Клиент в бухгалтерию"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} loading={busy}>Занести</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <Select
            label="Клиент из базы"
            placeholder={available.length ? 'Выберите' : 'Все клиенты уже в бухгалтерии'}
            value={clientId}
            disabled={available.length === 0}
            onChange={(e) => { setClientId(e.target.value); setClientName(''); setError(null) }}
            options={available.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="caption">или новый</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <Input
            label="Название нового клиента"
            value={clientName}
            onChange={(e) => { setClientName(e.target.value); setClientId(''); setError(null) }}
            placeholder="Появится и в общей базе клиентов"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Контакт"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Телеграм, телефон или почта"
            />
            <DatePicker
              label="С какого числа работаем"
              value={startedAt}
              onChange={setStartedAt}
              today={dayKey()}
              max={dayKey()}
              hint="От неё считается, сколько клиент с нами"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="caption">Услуги</p>
            {services.length > 1 && (
              <span className={cx('text-sm font-semibold tabular-nums', totalProfit < 0 ? 'text-danger' : 'text-ok')}>
                Итого прибыль {money(Math.round(totalProfit * 100))}
              </span>
            )}
          </div>

          {services.length === 0 && (
            <p className="text-xs text-ink-3 leading-relaxed">
              Можно занести клиента и без услуг, а добавить их позже — карточка откроется по клику на неё.
            </p>
          )}

          {services.map((s) => (
            <ServiceFields
              key={s.key}
              value={s}
              compact
              onChange={(next) => setServices((list) => list.map((x) => (x.key === s.key ? next : x)))}
              onRemove={() => setServices((list) => list.filter((x) => x.key !== s.key))}
            />
          ))}

          <AddAction onClick={() => setServices((l) => [...l, newService()])}>
            Добавить услугу
          </AddAction>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
