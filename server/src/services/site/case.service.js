import { prisma } from '../../config/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { CASE_REQUIRED } from '../../schemas/site.schema.js'
import { notifySite } from '../siteHooks.js'

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

export async function listCases() {
  const cases = await prisma.case.findMany({
    include: { translations: true },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  })
  return cases.map((c) => {
    const ru = c.translations.find((t) => t.locale === 'ru')?.data ?? {}
    return {
      id: c.id,
      slug: c.slug,
      status: c.status,
      year: c.year,
      serviceSlugs: c.serviceSlugs,
      media: c.media,
      title: ru.title || c.slug,
      client: ru.client || '',
      metric: ru.metric || null,
      locales: c.translations.map((t) => t.locale),
      sortOrder: c.sortOrder,
      updatedAt: c.updatedAt,
    }
  })
}

export async function getCase(id) {
  const c = await prisma.case.findUnique({ where: { id }, include: { translations: true } })
  if (!c) throw ApiError.notFound('Кейс не найден')
  return { ...c, translations: Object.fromEntries(c.translations.map((t) => [t.locale, t.data])) }
}

export async function saveCase(id, body) {
  if (body.status === 'published') {
    const missing = CASE_REQUIRED.filter(([path]) => !get(body.translations.ru, path)).map(([, label]) => label)
    if (missing.length) throw ApiError.badRequest(`Для публикации не хватает: ${missing.join(', ')}`)
  }
  const { translations, ...rest } = body
  const base = { ...rest, media: rest.media ?? null }

  const previous = id ? await prisma.case.findUnique({ where: { id }, select: { slug: true } }) : null
  if (id && !previous) throw ApiError.notFound('Кейс не найден')

  const saved = await prisma.$transaction(async (tx) => {
    const c = id ? await tx.case.update({ where: { id }, data: base }) : await tx.case.create({ data: base })
    for (const [locale, data] of Object.entries(translations)) {
      if (!data || (locale !== 'ru' && !data.title)) {
        await tx.caseTranslation.deleteMany({ where: { caseId: c.id, locale } })
        continue
      }
      await tx.caseTranslation.upsert({
        where: { caseId_locale: { caseId: c.id, locale } },
        create: { caseId: c.id, locale, data },
        update: { data },
      })
    }
    return c
  })

  notifySite(['cases', `case:${saved.slug}`, ...(previous && previous.slug !== saved.slug ? [`case:${previous.slug}`] : [])])
  return getCase(saved.id)
}

export async function removeCase(id) {
  const c = await prisma.case.delete({ where: { id } }).catch((e) => {
    if (e.code === 'P2025') throw ApiError.notFound('Кейс не найден')
    throw e
  })
  notifySite(['cases', `case:${c.slug}`])
}

// ---------------------------------------------------------------------------
// Публичное API: форма CaseStudy из src/entities/case-study сайта
// ---------------------------------------------------------------------------

function toSite(c, locale) {
  const tr = c.translations.find((t) => t.locale === locale) ?? c.translations.find((t) => t.locale === 'ru')
  if (!tr) return null
  const d = tr.data
  const details = d.details
  return {
    slug: c.slug,
    title: d.title,
    client: d.client,
    excerpt: d.excerpt,
    year: c.year,
    status: c.projectStatus,
    category: d.category,
    metric: d.metric,
    // Мини-превью сайта клиента: сейчас из него берётся только домен для подписей экранов
    preview: {
      theme: 'expert',
      domain: c.domain,
      brand: d.client,
      headline: details.h1,
      subline: '',
      cta: '',
      stats: [],
    },
    ...(c.media ? { media: c.media } : {}),
    tags: d.tags,
    serviceSlugs: c.serviceSlugs,
    content: [details.task, details.problemText, ...details.strategy.map((s) => s.text), details.result].filter(Boolean),
    details,
  }
}

export async function publicCases(locale) {
  const cases = await prisma.case.findMany({
    where: { status: 'published' },
    include: { translations: true },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  })
  return cases.map((c) => toSite(c, locale)).filter(Boolean)
}

export async function publicCase(slug, locale) {
  const c = await prisma.case.findFirst({ where: { slug, status: 'published' }, include: { translations: true } })
  const shaped = c && toSite(c, locale)
  if (!shaped) throw ApiError.notFound('Кейс не найден')
  return shaped
}

export async function publicCaseSlugs() {
  const rows = await prisma.case.findMany({ where: { status: 'published' }, select: { slug: true } })
  return rows.map((r) => r.slug)
}
