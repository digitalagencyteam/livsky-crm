import { useEffect, useState } from 'react'
import { Button, DatePicker, Modal, Select, Textarea } from '../../shared/ui'
import { dayKey } from '../../utils/board'

// Готовые причины из задания — быстрый выбор для частых случаев.
const REASONS = [
  'Не устроила цена',
  'Не устроил результат',
  'Закончился бюджет',
  'Другое',
]

const OTHER = 'Другое'

// Столько принимает сервер. Считаем здесь же, чтобы не дать написать текст,
// который потом отвалится с ошибкой уже после нажатия кнопки.
const LIMIT = 500

/**
 * Клиент ушёл. Причина обязательна — ради неё колонка ушедших и заводится:
 * доска нужна, чтобы видеть не только сколько заработали, но и почему
 * перестали.
 *
 * Готовый список плюс своё пояснение, а не одно из двух. Четыре строчки
 * списка не вмещают настоящую причину ухода, а чистое поле заставляло бы
 * каждый раз печатать одно и то же. Поэтому выбор задаёт тип, а пояснение —
 * подробности, и в карточке они потом читаются одной фразой:
 * «Не устроила цена: просили скидку 30%, не сошлись».
 */
export function LeaveModal({ open, onClose, onSubmit, card }) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [leftAt, setLeftAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setReason(''); setDetail(''); setLeftAt(dayKey()); setError(null)
  }, [open])

  const other = reason === OTHER
  const text = detail.trim()
  // У готовой причины пояснение дописывается к ней, у «Другого» заменяет её.
  const prefix = reason && !other ? `${reason}: ` : ''
  const value = other ? text : (text ? prefix + text : reason)

  async function submit() {
    if (!reason) return setError('Выберите причину ухода')
    if (other && !text) return setError('Опишите причину своими словами')
    setBusy(true)
    setError(null)
    const res = await onSubmit({ reason: value, leftAt })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${card?.client?.name || 'Клиент'} уходит`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button variant="danger" onClick={submit} loading={busy}>Перенести в ушедшие</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Причина"
          required
          placeholder="Выберите"
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(null) }}
          options={REASONS.map((r) => ({ value: r, label: r }))}
          hint="Подходящей нет — возьмите «Другое» и напишите своими словами"
        />

        {/* Поле показываем сразу, а не только под «Другое»: пояснение нужно
            и к готовой причине, а спрятанное поле просто не находят. */}
        <Textarea
          label={other ? 'Что случилось' : 'Подробнее — по желанию'}
          required={other}
          rows={3}
          maxLength={LIMIT - prefix.length}
          value={detail}
          onChange={(e) => { setDetail(e.target.value); setError(null) }}
          placeholder={other
            ? 'Например: ушли к другому подрядчику, у них дешевле ведение'
            : 'Например: просили скидку 30%, не сошлись'}
        />

        <DatePicker label="Дата ухода" value={leftAt} onChange={setLeftAt} today={dayKey()} max={dayKey()} />

        <p className="text-xs text-ink-3 leading-relaxed">
          Цифры за прошлые месяцы останутся в сводке — клиент тогда работал, и выручка агентства была.
        </p>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
