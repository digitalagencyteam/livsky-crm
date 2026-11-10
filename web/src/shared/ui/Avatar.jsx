import { cx } from '../lib/cx'

/*
 * Буква в кружке должна быть всегда, иначе получается разнобой: у нового
 * сотрудника, пока он не заполнил имя, кружок оставался пустым, а у него же
 * после сохранения имени — с буквой. Поэтому берём имя, а если его ещё нет,
 * то почту: она есть у каждого с первого дня.
 */
export function initialsOf(name, email) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  const fromName = words.slice(0, 2).map((w) => w[0]).join('')
  if (fromName.length > 1) return fromName.toUpperCase()

  const fromEmail = String(email || '').trim()[0]
  if (fromName) return fromName.toUpperCase()
  return (fromEmail || '?').toUpperCase()
}

export function Avatar({ name = '', email, src, color, size = 36, ring = false, className, title }) {
  const initials = initialsOf(name, email)

  return (
    <span
      title={title || name}
      className={cx(
        'relative inline-grid place-items-center rounded-full overflow-hidden select-none shrink-0',
        'text-white font-semibold',
        !src && !color && 'bg-accent',
        ring && 'ring-2 ring-accent ring-offset-2 ring-offset-panel',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        ...(color && !src ? { background: color } : {}),
      }}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </span>
  )
}

export function AvatarStack({ users = [], size = 30, max = 5, className }) {
  const shown = users.slice(0, max)
  const rest = users.length - shown.length
  return (
    <span className={cx('inline-flex items-center', className)}>
      {shown.map((u, i) => (
        <span key={u.id ?? i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar name={u.name} src={u.src} color={u.color} size={size} className="border-2 border-space" />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="grid place-items-center rounded-full panel text-ink-2 font-mono border-2 border-space"
          style={{ width: size, height: size, marginLeft: -size * 0.3, fontSize: size * 0.34 }}
        >
          +{rest}
        </span>
      )}
    </span>
  )
}
