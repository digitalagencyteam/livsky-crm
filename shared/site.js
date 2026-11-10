/**
 * Справочники сайта LIVSKY, общие для сервера и админки.
 * Должны совпадать с сайтом: слаги услуг — src/entities/service, иконки — GlassIcon.
 */

export const LOCALES = ['ru', 'en']

export const SERVICES = [
  { slug: 'seo-geo', title: 'SEO и GEO' },
  { slug: 'web-development', title: 'Разработка сайтов' },
  { slug: 'ads-targeting', title: 'Реклама и таргет' },
  { slug: 'content-creative', title: 'Контент и креатив' },
  { slug: 'smm-partnerships', title: 'SMM и партнёрства' },
  { slug: 'automation', title: 'Автоматизация' },
]

/** Направления блога (фильтр на странице блога) */
export const TOPICS = SERVICES.filter((s) => s.slug !== 'smm-partnerships')

export const GLASS_ICONS = [
  'bell', 'calendar', 'chart', 'chat', 'cloud', 'dev', 'folder', 'gear', 'handshake', 'heart',
  'idea', 'mail', 'plan', 'process', 'rocket', 'search', 'star', 'strategy', 'target', 'team',
]

const RU = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** «Сколько стоит сайт в 2026» → «skolko-stoit-sayt-v-2026» */
export function slugify(text, max = 60) {
  const out = String(text || '')
    .toLowerCase()
    .split('')
    .map((ch) => RU[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return out.slice(0, max).replace(/-+$/, '')
}
