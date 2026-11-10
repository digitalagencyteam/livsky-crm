export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-line-2 border-t-white ${className}`}
      style={{ width: size, height: size }}
      aria-label="Загрузка"
    />
  )
}
