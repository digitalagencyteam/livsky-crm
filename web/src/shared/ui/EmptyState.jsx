import { Pill } from './Pill'

export function EmptyState({ label = 'Пусто', text, action }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Pill>{label}</Pill>
      {text && <p className="text-sm text-ink-3 max-w-xs leading-relaxed">{text}</p>}
      {action}
    </div>
  )
}
