/** Даты по Москве и размеры файлов — для договоров (логика из «Архива» KOMETA CRM). */

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000

/**
 * Дата по Москве — как и везде в CRM, независимо от часов компьютера.
 * Хвост «г.», который добавляет русская локаль, убираем: в предложении
 * «в архиве с 24 сентября 2026 г., занёс Админ» он только мешает.
 */
export function archiveDate(value) {
  if (!value) return ''
  const d = new Date(new Date(value).getTime() + MSK_OFFSET_MS)
  return d
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .replace(/\s*г\.$/, '')
}

/** Короткая форма для плотных списков: «24.09.2026». */
export function archiveDateShort(value) {
  if (!value) return ''
  const d = new Date(new Date(value).getTime() + MSK_OFFSET_MS)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  })
}

/** Значение для поля даты: ГГГГ-ММ-ДД по Москве. */
export function archiveDayKey(value = new Date()) {
  const d = new Date(new Date(value).getTime() + MSK_OFFSET_MS)
  return d.toISOString().slice(0, 10)
}

export function fileSize(bytes) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1).replace('.', ',')} МБ`
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

/**
 * «3 отчёта», «1 отчёт», «5 отчётов» — без этого в интерфейсе появляется
 * «1 отчётов», и выглядит это неряшливо.
 */
export function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`
  return `${n} ${many}`
}

export const contractsWord = (n) => plural(n, 'договор', 'договора', 'договоров')
