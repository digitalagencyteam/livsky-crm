/** Русское склонение по числу: plural(1, 'задача', 'задачи', 'задач') → 'задача'. */
export function plural(n, one, few, many) {
  const mod100 = Math.abs(n) % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = mod100 % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export function withPlural(n, one, few, many) {
  return `${n} ${plural(n, one, few, many)}`
}
