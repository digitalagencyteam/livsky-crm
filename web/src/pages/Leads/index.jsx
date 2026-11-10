import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLeadsStore } from '../../core/store/leadsStore'
import { PageSection } from '../../widgets'
import { Badge, Button, ConfirmModal, EmptyState, Input, Segmented, Spinner } from '../../shared/ui'
import { cx } from '../../shared/lib/cx'
import { useAutoRefresh } from '../../shared/lib/useAutoRefresh'

const STATUSES = [
  { value: 'new', label: 'Новые' },
  { value: 'in_work', label: 'В работе' },
  { value: 'done', label: 'Готово' },
  { value: 'spam', label: 'Спам' },
]
const KINDS = [
  { value: '', label: 'Все' },
  { value: 'form', label: 'Заявки' },
  { value: 'call', label: 'Звонки' },
]
const NEEDS = { site: 'Сайт', seo: 'SEO', ads: 'Реклама', smm: 'SMM', other: 'Другое' }
const TZ = 'Europe/Moscow'

const when = (v, opts) => new Date(v).toLocaleString('ru-RU', { timeZone: TZ, ...opts })

/** Контакт ссылкой: @ник — в Telegram, номер — звонок, почта — письмо */
function contactHref(contact) {
  const c = contact.trim()
  if (/^@?[a-z0-9_]{4,}$/i.test(c) && !/^\d+$/.test(c)) return `https://t.me/${c.replace(/^@/, '')}`
  if (/^\+?[\d\s()-]{7,}$/.test(c)) return `tel:${c.replace(/[^\d+]/g, '')}`
  if (/^\S+@\S+\.\S+$/.test(c)) return `mailto:${c}`
  return null
}

function LeadCard({ lead, highlighted, onStatus, onNote, onDelete }) {
  const [note, setNote] = useState(lead.note)
  const ref = useRef(null)
  useEffect(() => setNote(lead.note), [lead.note])
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlighted])

  const href = contactHref(lead.contact)
  const callSoon = lead.callAt && new Date(lead.callAt) > new Date()

  return (
    <article
      ref={ref}
      className={cx('panel rounded-card p-5 flex flex-col gap-3', highlighted && 'ring-2 ring-accent', lead.status === 'new' && 'spine spine--accent')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={lead.kind === 'call' ? 'now' : 'brand'}>{lead.kind === 'call' ? 'Звонок' : 'Заявка'}</Badge>
        <span className="font-semibold">{lead.name}</span>
        <span className="caption ml-auto">{when(lead.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
            {lead.contact}
          </a>
        ) : (
          <span className="font-semibold">{lead.contact}</span>
        )}
        <button type="button" className="caption hover:text-ink" onClick={() => navigator.clipboard?.writeText(lead.contact)}>
          скопировать
        </button>
      </div>

      {lead.callAt && (
        <p className={cx('text-sm font-semibold', callSoon ? 'text-now' : 'text-ink-3')}>
          📞 {when(lead.callAt, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} МСК
          {lead.platform ? ` · ${lead.platform}` : ''}
        </p>
      )}
      {/* У брони звонка текст — дубль времени и площадки, они уже показаны выше */}
      {lead.message && lead.kind !== 'call' && <p className="text-sm text-ink-2 whitespace-pre-line">{lead.message}</p>}
      {lead.needs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lead.needs.map((n) => (
            <Badge key={n}>{NEEDS[n] ?? n}</Badge>
          ))}
        </div>
      )}
      {lead.page && <p className="caption truncate">Со страницы {lead.page}{lead.locale === 'en' ? ' · EN' : ''}</p>}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== lead.note && onNote(note)}
        rows={2}
        placeholder="Заметка: о чём договорились"
        className="w-full rounded-[14px] border border-line bg-panel px-3 py-2 text-sm placeholder:text-ink-3 outline-none focus:border-accent"
      />

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onStatus(s.value)}
            aria-pressed={lead.status === s.value}
            className={cx(
              'h-8 rounded-full px-3 text-xs font-semibold border transition',
              lead.status === s.value ? 'accent-fill border-transparent text-white' : 'border-line text-ink-2 hover:bg-panel-2',
            )}
          >
            {s.label}
          </button>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onDelete}>
          Удалить
        </Button>
      </div>
    </article>
  )
}

/** Заявки с сайта: форма «Обсудить проект» и бронь звонка. Новые обновляются сами раз в минуту. */
export default function LeadsPage() {
  const { items, counts, loading, error, fetchLeads, update, remove } = useLeadsStore()
  const [params, setParams] = useSearchParams()
  const filters = useMemo(
    () => ({
      status: params.get('status') ?? (params.get('open') ? '' : 'new'),
      kind: params.get('kind') || '',
      q: params.get('q') || '',
    }),
    [params],
  )
  const openId = params.get('open')
  const [search, setSearch] = useState(filters.q)
  const [confirm, setConfirm] = useState(null)

  const setFilters = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) next.set(k, v)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  useEffect(() => {
    const t = setTimeout(() => search !== filters.q && setFilters({ q: search.trim() }), 350)
    return () => clearTimeout(t)
  }, [search, filters.q, setFilters])

  const load = useCallback(() => fetchLeads(filters), [fetchLeads, filters])
  useEffect(() => {
    load()
  }, [load])
  useAutoRefresh(load, 60_000)

  const statusOptions = [
    ...STATUSES.map((s) => ({ ...s, count: counts[s.value] ?? 0 })),
    { value: '', label: 'Все' },
  ]

  async function changeStatus(lead, status) {
    const res = await update(lead.id, { status })
    if (!res.ok) return window.alert(res.error)
    load()
  }

  return (
    <PageSection
      pill="Заявки"
      title="Заявки с сайта"
      subtitle="Форма «Обсудить проект» и бронь звонка. О новых приходит письмо (и сообщение в Telegram, если подключён)."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Статус" options={statusOptions} value={filters.status} onChange={(status) => setFilters({ status })} />
        <Segmented label="Тип" options={KINDS} value={filters.kind} onChange={(kind) => setFilters({ kind })} />
        <Input
          className="min-w-[200px] flex-1"
          placeholder="Поиск: имя, контакт, текст"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск по заявкам"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading && items.length === 0 ? (
        <div className="grid place-items-center py-14">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          label={filters.status === 'new' ? 'Новых нет' : 'Пусто'}
          text={filters.status === 'new' ? 'Как только кто-то заполнит форму на сайте, заявка появится здесь.' : 'Под эти фильтры заявок нет.'}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              highlighted={lead.id === openId}
              onStatus={(status) => changeStatus(lead, status)}
              onNote={(note) => update(lead.id, { note })}
              onDelete={() => setConfirm(lead)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        danger
        title="Удалить заявку?"
        text="Если это спам, лучше отметить «Спам»: так видно, сколько его приходит."
        confirmText="Удалить"
        onConfirm={async () => {
          const id = confirm.id
          setConfirm(null)
          const res = await remove(id)
          if (!res.ok) window.alert(res.error)
          else load()
        }}
      />
    </PageSection>
  )
}
