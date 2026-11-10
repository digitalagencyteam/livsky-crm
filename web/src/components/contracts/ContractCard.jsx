import { Badge } from '../../shared/ui'
import { money } from '../../utils/board'
import { CONTRACT_STATUS, FILE_KIND } from '../../utils/contracts'
import { archiveDateShort } from '../../utils/files'

export function ContractCard({ contract: c, onOpen, onOpenFile }) {
  const status = CONTRACT_STATUS[c.status]
  return (
    <article className="panel rounded-card p-4 flex flex-col gap-3 transition hover:border-line-2">
      <button type="button" onClick={onOpen} className="flex flex-col gap-1 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{c.party}</span>
          <Badge tone={status.tone}>{status.label}</Badge>
          {c.matchedInText && <Badge tone="brand">найдено в тексте</Badge>}
        </span>
        <span className="text-sm text-ink-3">
          {[c.number && `№ ${c.number}`, c.subject, c.signedAt && `подписан ${archiveDateShort(c.signedAt)}`]
            .filter(Boolean)
            .join(' · ') || 'Без номера'}
        </span>
        {(c.amountCents !== null || c.endsAt) && (
          <span className="text-sm text-ink-2 tabular">
            {[c.amountCents !== null && money(c.amountCents), c.endsAt && `до ${archiveDateShort(c.endsAt)}`]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </button>
      {c.files.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {c.files.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onOpenFile(f.id)}
              title={f.fileName}
              className="inline-flex max-w-[260px] items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-accent hover:text-ink"
            >
              <span className="font-semibold text-accent">PDF</span>
              <span className="truncate">{FILE_KIND[f.kind]}: {f.fileName}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="caption">Файла ещё нет</p>
      )}
    </article>
  )
}
