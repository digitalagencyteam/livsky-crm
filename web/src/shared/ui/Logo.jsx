/** Маскот + вордмарк LIVSKY, как в шапке сайта */
export function Logo({ suffix = 'CRM' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/mascot.png" alt="" width="30" height="30" className="h-[30px] w-auto" />
      <span className="font-display text-[17px] font-bold tracking-wide">LIVSKY</span>
      {suffix && (
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-ink-3">
          {suffix}
        </span>
      )}
    </span>
  )
}
