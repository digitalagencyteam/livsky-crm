export const COLUMNS = [
  { key: 'today', title: 'Сегодня', next: 'progress', nextLabel: 'В процесс' },
  { key: 'progress', title: 'В процессе', prev: 'today', next: 'done', nextLabel: 'Готово' },
  { key: 'done', title: 'Готово', prev: 'progress' },
]

export const REFRESH_MS = 60_000
export const MSK_TZ = 'Europe/Moscow'
// Москва без перехода на летнее время, поэтому сдвиг фиксированный.
// Экспортируется: календарь звонков считает по нему недели и дни,
// и второй копии этой константы в проекте быть не должно.
export const MSK_OFFSET_MS = 3 * 60 * 60 * 1000

export function buildTodayDeadlineMsk(hhmm) {
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(hhmm || '')) throw new Error('invalid time')
  const [h, m] = hhmm.split(':').map(Number)

  const mskNow = new Date(Date.now() + MSK_OFFSET_MS)
  const y = mskNow.getUTCFullYear()
  const mo = mskNow.getUTCMonth()
  const da = mskNow.getUTCDate()

  const utcMs = Date.UTC(y, mo, da, h, m, 0, 0) - MSK_OFFSET_MS
  return new Date(utcMs).toISOString()
}

export function defaultMskTimeValue() {
  const d = new Date(Date.now() + MSK_OFFSET_MS + 30 * 60 * 1000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * В отличие от buildTodayDeadlineMsk (доска «Задачи», всегда сегодня),
 * здесь дату выбирают явно — Иерархии нужны сроки на будущие дни,
 * не только на сегодня.
 */
export function buildDeadlineMsk(dateStr, hhmm) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) throw new Error('invalid date')
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(hhmm || '')) throw new Error('invalid time')

  const [y, mo, da] = dateStr.split('-').map(Number)
  const [h, m] = hhmm.split(':').map(Number)

  const utcMs = Date.UTC(y, mo - 1, da, h, m, 0, 0) - MSK_OFFSET_MS
  return new Date(utcMs).toISOString()
}

export function defaultMskDateValue() {
  const d = new Date(Date.now() + MSK_OFFSET_MS)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

/** Для предзаполнения полей при продлении срока уже существующей задачи. */
export function splitDeadlineMsk(iso) {
  const d = new Date(iso)
  const mskMs = d.getTime() + MSK_OFFSET_MS
  const mskD = new Date(mskMs)
  const y = mskD.getUTCFullYear()
  const mo = String(mskD.getUTCMonth() + 1).padStart(2, '0')
  const da = String(mskD.getUTCDate()).padStart(2, '0')
  const hh = String(mskD.getUTCHours()).padStart(2, '0')
  const mm = String(mskD.getUTCMinutes()).padStart(2, '0')
  return { date: `${y}-${mo}-${da}`, time: `${hh}:${mm}` }
}

export function formatMskTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: MSK_TZ })
}

export function formatMskDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: MSK_TZ })
}

/**
 * Время работы над задачей одной строкой. У старых задач и у пришедших из
 * Иерархии начала нет — тогда это прежнее одно время срока, без пустых мест.
 *
 * crossDay: срок могли перенести на другой день, а начало осталось прежним.
 * Тогда дата стоит у обоих концов, иначе «12:00 – 14:00» соврало бы про один
 * день, и вызывающему не нужно приписывать к строке ещё и дату срока.
 */
export function taskTimes(task) {
  const deadline = formatMskTime(task.deadline)
  if (!task.startAt) return { text: deadline, crossDay: false }

  const start = formatMskTime(task.startAt)
  if (isSameDayMsk(task.startAt, task.deadline)) return { text: `${start} – ${deadline}`, crossDay: false }

  return {
    text: `${formatMskDate(task.startAt)}, ${start} – ${formatMskDate(task.deadline)}, ${deadline}`,
    crossDay: true,
  }
}

/**
 * На сколько дней вперёд разрешено ставить задачу на личной доске.
 * Ноль — сегодня, поэтому всего вариантов DAYS_AHEAD + 1. Горизонт ровно
 * в сутки: доска остаётся планом на день, а не длинным списком на неделю.
 */
export const DAYS_AHEAD = 1

/** Дата по МСК, сдвинутая на N дней вперёд, в формате YYYY-MM-DD. */
export function mskDateValueIn(days = 0) {
  const d = new Date(Date.now() + MSK_OFFSET_MS + days * 24 * 60 * 60 * 1000)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

/**
 * Дни, на которые можно поставить задачу: сегодня и завтра.
 * Короткая подпись для кнопки, полная — для строки «Срок: …», чтобы
 * человек видел не только «завтра», но и само число. Подписи с предлогом
 * и парные: «Задача на день» → «на сегодня» / «на завтра».
 */
export function deadlineDayOptions() {
  const names = ['На сегодня', 'На завтра']
  return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => {
    const value = mskDateValueIn(i)
    const full = new Date(value + 'T12:00:00Z').toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', timeZone: MSK_TZ,
    })
    return { value, label: names[i] || full, full }
  })
}

/** Прошло ли уже это время сегодняшнего дня по МСК. */
export function isPastMsk(dateStr, hhmm) {
  if (!dateStr || !/^\d{1,2}:\d{2}/.test(hhmm || '')) return false
  try {
    return new Date(buildDeadlineMsk(dateStr, hhmm)).getTime() < Date.now()
  } catch {
    return false
  }
}

/** Совпадает ли дата задачи (по МСК) с сегодняшним днём (по МСК). */
export function isTodayMsk(iso) {
  const target = new Date(iso).toLocaleDateString('ru-RU', { timeZone: MSK_TZ })
  const today = new Date().toLocaleDateString('ru-RU', { timeZone: MSK_TZ })
  return target === today
}

/**
 * Срок приходится на день позже сегодняшнего (по МСК). Нужен доске:
 * колонка «Сегодня» не должна врать счётчиком, когда в ней лежат задачи,
 * поставленные наперёд.
 */
export function isFutureDayMsk(iso) {
  return mskDayKey(iso) > mskDayKey(Date.now())
}

/**
 * Один ли день у двух моментов по МСК. Срок можно перенести на другой день,
 * а время начала при этом остаётся прежним, поэтому карточке нужно знать,
 * когда начало надо подписывать датой.
 */
export function isSameDayMsk(a, b) {
  return mskDayKey(a) === mskDayKey(b)
}

function mskDayKey(value) {
  const d = new Date(new Date(value).getTime() + MSK_OFFSET_MS)
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

export function scopeHint(user) {
  if (!user) return ''
  if (user.role === 'admin') return 'Вкладки переключают отделы. Двигать можно только свои задачи.'
  if (user.role === 'lead') return 'Вы видите задачи всего отдела, но двигать можно только свои.'
  return 'Вы видите и двигаете только свои задачи.'
}

/** Единый источник подписей/цветов приоритета — переиспользуется везде,
 * где задача создаётся или показывается (доска, Иерархия, карточки). */
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий', tone: 'neutral' },
  { value: 'medium', label: 'Средний', tone: 'warn' },
  { value: 'high', label: 'Высокий', tone: 'danger' },
]

export function priorityMeta(priority) {
  return PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1]
}
