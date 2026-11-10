import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, DatePicker, FileDrop, Input, Modal, MoneyInput, Select, Textarea } from '../../shared/ui'
import { cx } from '../../shared/lib/cx'
import { money } from '../../utils/board'
import { CONTRACT_STATUS, FILE_KIND, KIND_TEXT, STATUS_OPTIONS, toDay } from '../../utils/contracts'
import { archiveDayKey, fileSize } from '../../utils/files'

const NEW_CLIENT = '__new__'
const MAX_MB = 25

const empty = (kind) => ({
  kind,
  clientId: '',
  party: '',
  subject: '',
  number: '',
  status: 'draft',
  signedAt: '',
  startsAt: '',
  endsAt: '',
  amount: '',
  notes: '',
})

function fromContract(c) {
  return {
    kind: c.kind,
    clientId: c.clientId || '',
    party: c.party,
    subject: c.subject,
    number: c.number,
    status: c.status,
    signedAt: toDay(c.signedAt),
    startsAt: toDay(c.startsAt),
    endsAt: toDay(c.endsAt),
    amount: c.amountCents === null ? '' : String(c.amountCents / 100),
    notes: c.notes,
  }
}

/**
 * Договор целиком: поля, файлы (проект, подписанный скан, приложения) и загрузка PDF.
 * Новый договор можно сразу завести с файлом: сначала сохраняются поля, следом уходит PDF.
 */
export function ContractModal({ open, onClose, kind, contract, clients, store, onChanged, onDelete }) {
  const editing = Boolean(contract)
  const text = KIND_TEXT[contract?.kind ?? kind]
  const [form, setForm] = useState(empty(kind))
  const [file, setFile] = useState(null)
  const [fileKind, setFileKind] = useState('original')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(contract ? fromContract(contract) : empty(kind))
    setFile(null)
    setFileKind(contract?.status === 'sent' ? 'signed' : 'original')
    setError(null)
    setNotice(null)
  }, [open, contract, kind])

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value?.target ? value.target.value : value }))

  const clientOptions = useMemo(
    () => [...clients.map((c) => ({ value: c.id, label: c.name })), { value: NEW_CLIENT, label: '+ Новый клиент' }],
    [clients],
  )
  const isClient = form.kind === 'client'
  const newClient = isClient && form.clientId === NEW_CLIENT

  async function save() {
    setError(null)
    const party = isClient && !newClient ? clients.find((c) => c.id === form.clientId)?.name : form.party
    if (!party?.trim()) return setError(isClient ? 'Выберите клиента или «+ Новый клиент»' : 'Укажите ФИО сотрудника')

    const body = {
      ...(editing ? {} : { kind: form.kind }),
      party: party.trim(),
      clientId: isClient && !newClient ? form.clientId : null,
      subject: form.subject,
      number: form.number,
      status: form.status,
      signedAt: form.signedAt,
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      amount: form.amount === '' ? null : Number(form.amount),
      notes: form.notes,
    }
    setBusy(true)
    const res = editing ? await store.update(contract.id, body) : await store.create(body)
    if (!res.ok) {
      setBusy(false)
      return setError(res.error)
    }
    let saved = res.data
    if (file) {
      const up = await store.upload(saved.id, file, fileKind)
      if (!up.ok) {
        setBusy(false)
        onChanged(saved)
        return setError(`Договор сохранён, но файл не загрузился: ${up.error}`)
      }
      saved = up.data
      if (!up.data.textFound) setNotice('Файл загружен, но текста в нём нет (скан): по словам внутри он не найдётся')
    }
    setBusy(false)
    onChanged(saved)
    if (!file || saved.textFound !== false) onClose()
    else setFile(null)
  }

  async function removeFile(f) {
    if (!window.confirm(`Удалить файл «${f.fileName}»?`)) return
    const res = await store.removeFile(f.id)
    if (!res.ok) return setError(res.error)
    const fresh = await store.get(contract.id)
    if (fresh.ok) onChanged(fresh.data)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? contract.party : text.create}
      footer={
        <>
          {editing && (
            <Button variant="danger" className="mr-auto" onClick={onDelete}>
              Удалить
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {isClient ? (
            <Select
              label={text.party}
              required
              options={clientOptions}
              placeholder="Выберите клиента"
              value={form.clientId}
              onChange={set('clientId')}
            />
          ) : (
            <Input label={text.party} required value={form.party} onChange={set('party')} placeholder="Иванова Анна Сергеевна" />
          )}
          {newClient && (
            <Input label="Название нового клиента" required value={form.party} onChange={set('party')} placeholder="ООО «Ромашка»" />
          )}
          <Input label="Номер договора" value={form.number} onChange={set('number')} placeholder={isClient ? '2026/14' : 'ТД-07'} />
          <Input label={text.subject} hint={text.subjectHint} value={form.subject} onChange={set('subject')} />
          <Select label="Статус" options={STATUS_OPTIONS} value={form.status} onChange={set('status')} />
          <DatePicker label="Дата подписания" value={form.signedAt} onChange={set('signedAt')} today={archiveDayKey()} />
          <MoneyInput label={text.amount} value={form.amount} onChange={set('amount')} />
          <DatePicker label="Действует с" value={form.startsAt} onChange={set('startsAt')} today={archiveDayKey()} />
          <DatePicker label="Действует до" value={form.endsAt} onChange={set('endsAt')} today={archiveDayKey()} hint="Пусто — бессрочный" />
        </div>
        <Textarea label="Заметки" rows={3} value={form.notes} onChange={set('notes')} placeholder="Условия, особые пункты, кто подписывает" />

        {editing && (
          <section className="flex flex-col gap-2">
            <p className="caption">Файлы</p>
            {contract.files.length === 0 && <p className="text-sm text-ink-3">Файлов пока нет — загрузите PDF ниже.</p>}
            {contract.files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-[14px] border border-line px-3 py-2">
                <Badge tone={f.kind === 'signed' ? 'ok' : 'neutral'}>{FILE_KIND[f.kind]}</Badge>
                <button type="button" onClick={() => store.openFile(f.id)} className="min-w-0 flex-1 truncate text-left text-sm hover:text-accent">
                  {f.fileName}
                </button>
                <span className="caption shrink-0">{fileSize(f.fileSize)}</span>
                <button type="button" onClick={() => removeFile(f)} aria-label={`Удалить ${f.fileName}`} className="text-ink-3 hover:text-danger px-1">
                  ✕
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="caption mr-1">{editing ? 'Добавить файл' : 'Файл договора'}</p>
            {Object.entries(FILE_KIND).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFileKind(value)}
                aria-pressed={fileKind === value}
                className={cx(
                  'h-8 rounded-full px-3 text-xs font-semibold border transition',
                  fileKind === value ? 'accent-fill border-transparent text-white' : 'border-line text-ink-2 hover:bg-panel-2',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <FileDrop
            accept="application/pdf,.pdf"
            maxMb={MAX_MB}
            file={file}
            onFile={setFile}
            onError={setError}
            check={(f) => (f.type && f.type !== 'application/pdf' ? 'Нужен PDF-файл' : null)}
            title="Перетащите PDF сюда"
            hint={
              fileKind === 'signed'
                ? `Подписанный скан: договор станет «Подписан». До ${MAX_MB} МБ`
                : `или нажмите и выберите файл. До ${MAX_MB} МБ`
            }
          />
        </section>

        {editing && contract.amountCents !== null && (
          <p className="text-xs text-ink-3">
            Сейчас в договоре: {money(contract.amountCents)} · {CONTRACT_STATUS[contract.status].label}
          </p>
        )}
        {notice && <p className="text-sm text-warn">{notice}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
