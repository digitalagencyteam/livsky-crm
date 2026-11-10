export function Pill({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full panel ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
      <span className="caption !text-ink-2">{children}</span>
    </span>
  )
}
