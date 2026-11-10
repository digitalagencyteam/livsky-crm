import { useEffect, useState } from 'react'
import { Button, Modal } from '../../shared/ui'
import { ServiceFields, newService, serviceToPayload, validateService } from './ServiceFields'
import { dayKey, monthKey } from '../../utils/board'

/** Одна услуга за месяц. Поля те же, что и в форме нового клиента. */
export function ServiceModal({ open, onClose, onSubmit, service }) {
  const editing = Boolean(service)
  const [value, setValue] = useState(() => newService())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setValue(service
      ? {
        key: service.id,
        title: service.title,
        month: monthKey(service.month),
        // Услуги, заведённые до появления поля, даты не имеют: форма покажет
        // пустое обязательное поле, и при правке её придётся назвать.
        paidAt: service.paidAt ? dayKey(service.paidAt) : '',
        revenue: String(service.revenueCents / 100),
        expenses: service.expenses.map((e) => ({
          key: e.id,
          id: e.id,
          title: e.title,
          amount: String(e.amountCents / 100),
          paid: Boolean(e.paid),
          // У расходов, оплаченных до появления поля, дня нет.
          paidAt: e.paidAt ? dayKey(e.paidAt) : '',
        })),
      }
      : newService())
    setError(null)
  }, [open, service])

  async function submit() {
    const problem = validateService(value)
    if (problem) return setError(problem)

    setBusy(true)
    setError(null)
    const res = await onSubmit(serviceToPayload(value))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Услуга' : 'Новая услуга'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} loading={busy}>{editing ? 'Сохранить' : 'Добавить'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ServiceFields value={value} onChange={setValue} />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
