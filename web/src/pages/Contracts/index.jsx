import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useContractsStore } from '../../core/store/contractsStore'
import { useClientsStore } from '../../core/store/clientsStore'
import { PageSection } from '../../widgets'
import { Button, ConfirmModal, DateRangePicker, EmptyState, Input, Segmented, Select, Spinner } from '../../shared/ui'
import { ContractCard } from '../../components/contracts/ContractCard'
import { ContractModal } from '../../components/contracts/ContractModal'
import { STATUS_OPTIONS } from '../../utils/contracts'
import { archiveDayKey, contractsWord } from '../../utils/files'

const KINDS = [
  { value: 'client', label: 'Клиенты' },
  { value: 'employee', label: 'Сотрудники' },
]

/**
 * Договоры — логика «Архива»: PDF в хранилище, поиск по полям и по тексту внутри файлов.
 * Фильтры живут в адресной строке: ссылку на выборку можно сохранить.
 */
export default function ContractsPage() {
  const store = useContractsStore()
  const { items, loading, error, fetch } = store
  const clients = useClientsStore((s) => s.clients)
  const fetchClients = useClientsStore((s) => s.fetchClients)

  const [params, setParams] = useSearchParams()
  const filters = useMemo(
    () => ({
      kind: params.get('kind') || 'client',
      status: params.get('status') || '',
      q: params.get('q') || '',
      from: params.get('from') || '',
      to: params.get('to') || '',
    }),
    [params],
  )
  const setFilters = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  // Поиск не дёргает сервер на каждую букву
  const [search, setSearch] = useState(filters.q)
  useEffect(() => {
    const t = setTimeout(() => search !== filters.q && setFilters({ q: search.trim() }), 350)
    return () => clearTimeout(t)
  }, [search, filters.q, setFilters])

  useEffect(() => {
    fetch(filters)
  }, [fetch, filters])
  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const [modal, setModal] = useState(null) // { contract } | { contract: null } для нового
  const [confirm, setConfirm] = useState(null)

  const refresh = () => {
    fetch(filters)
    fetchClients()
  }

  const openFile = async (id) => {
    const res = await store.openFile(id)
    if (!res.ok) window.alert(res.error)
  }

  const isClients = filters.kind === 'client'

  return (
    <PageSection
      pill="Договоры"
      title={isClients ? 'Договоры с клиентами' : 'Договоры с сотрудниками'}
      subtitle="PDF хранятся здесь. Поиск находит договор по стороне, номеру, предмету и по словам внутри файла."
      actions={<Button onClick={() => setModal({ contract: null })}>Новый договор</Button>}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Segmented label="Вид договоров" options={KINDS} value={filters.kind} onChange={(kind) => setFilters({ kind })} />
        <Input
          className="min-w-[220px] flex-1"
          placeholder="Поиск: имя, номер, слово из договора"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск по договорам"
        />
        <Select
          className="w-[170px]"
          placeholder="Все статусы"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
        />
        <DateRangePicker
          className="w-[230px]"
          value={{ from: filters.from, to: filters.to }}
          onChange={({ from, to }) => setFilters({ from, to })}
          today={archiveDayKey()}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading && items.length === 0 ? (
        <div className="grid place-items-center py-14">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          label={filters.q || filters.status || filters.from ? 'Ничего не нашлось' : 'Пока пусто'}
          text={
            filters.q || filters.status || filters.from
              ? 'Попробуйте другое слово или сбросьте фильтры.'
              : 'Заведите первый договор и прикрепите PDF.'
          }
          action={<Button variant="secondary" onClick={() => setModal({ contract: null })}>Новый договор</Button>}
        />
      ) : (
        <>
          <p className="caption">{contractsWord(items.length)}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((c) => (
              <ContractCard key={c.id} contract={c} onOpen={() => setModal({ contract: c })} onOpenFile={openFile} />
            ))}
          </div>
        </>
      )}

      <ContractModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        kind={filters.kind}
        contract={modal?.contract ?? null}
        clients={clients}
        store={store}
        onChanged={(saved) => {
          if (modal?.contract) setModal({ contract: saved })
          refresh()
        }}
        onDelete={() => setConfirm(modal.contract)}
      />

      <ConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        danger
        title="Удалить договор?"
        text="Удалятся карточка и все PDF-файлы договора. Вернуть их будет нельзя."
        confirmText="Удалить"
        onConfirm={async () => {
          const id = confirm.id
          setConfirm(null)
          const res = await store.remove(id)
          if (!res.ok) return window.alert(res.error)
          setModal(null)
          refresh()
        }}
      />
    </PageSection>
  )
}
