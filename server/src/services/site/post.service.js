import { prisma } from '../../config/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { articleText, parseArticle, readingMinutes } from '../../../../shared/article.js'
import { notifySite } from '../siteHooks.js'

const day = (d) => new Date(d).toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// Админка
// ---------------------------------------------------------------------------

export async function listPosts() {
  const posts = await prisma.post.findMany({
    include: { translations: { select: { locale: true, title: true, category: true } } },
    orderBy: { publishedAt: 'desc' },
  })
  return posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    status: p.status,
    topic: p.topic,
    publishedAt: day(p.publishedAt),
    cover: p.cover,
    title: p.translations.find((t) => t.locale === 'ru')?.title ?? p.slug,
    category: p.translations.find((t) => t.locale === 'ru')?.category ?? '',
    locales: p.translations.map((t) => t.locale),
    updatedAt: p.updatedAt,
  }))
}

export async function getPost(id) {
  const p = await prisma.post.findUnique({ where: { id }, include: { translations: true } })
  if (!p) throw ApiError.notFound('Статья не найдена')
  return {
    ...p,
    publishedAt: day(p.publishedAt),
    translations: Object.fromEntries(p.translations.map((t) => [t.locale, t])),
  }
}

/** Проверка перед публикацией + разбор текста. Возвращает разделы по языкам и предупреждения. */
function build(body) {
  const warnings = []
  const parsed = {}
  for (const [locale, t] of Object.entries(body.translations)) {
    if (!t) continue
    const { sections, warnings: w } = parseArticle(t.body)
    parsed[locale] = sections
    for (const msg of w) warnings.push(`${locale.toUpperCase()}: ${msg}`)
  }
  if (body.status === 'published') {
    const ru = body.translations.ru
    const missing = [
      !ru.title && 'заголовок',
      !ru.excerpt && 'анонс',
      !ru.category && 'рубрика',
      !parsed.ru?.length && 'хотя бы один раздел «## …»',
    ].filter(Boolean)
    if (missing.length) throw ApiError.badRequest(`Для публикации не хватает: ${missing.join(', ')}`)
  }
  return { parsed, warnings }
}

export async function savePost(id, body) {
  const { parsed, warnings } = build(body)
  const base = {
    slug: body.slug,
    status: body.status,
    topic: body.topic,
    publishedAt: new Date(`${body.publishedAt}T09:00:00Z`),
    cover: body.cover ?? null,
    bookCover: body.bookCover ?? null,
  }

  const previous = id ? await prisma.post.findUnique({ where: { id }, select: { slug: true } }) : null
  if (id && !previous) throw ApiError.notFound('Статья не найдена')

  const post = await prisma.$transaction(async (tx) => {
    const p = id ? await tx.post.update({ where: { id }, data: base }) : await tx.post.create({ data: base })
    for (const [locale, t] of Object.entries(body.translations)) {
      if (!t || (locale !== 'ru' && !t.title)) {
        // Пустой перевод = нет перевода: сайт покажет русский текст
        await tx.postTranslation.deleteMany({ where: { postId: p.id, locale } })
        continue
      }
      const data = { ...t, sections: parsed[locale] ?? [] }
      await tx.postTranslation.upsert({
        where: { postId_locale: { postId: p.id, locale } },
        create: { ...data, postId: p.id, locale },
        update: data,
      })
    }
    return p
  })

  notifySite(['posts', `post:${post.slug}`, ...(previous && previous.slug !== post.slug ? [`post:${previous.slug}`] : [])])
  return { ...(await getPost(post.id)), warnings }
}

export async function removePost(id) {
  const p = await prisma.post.delete({ where: { id } }).catch((e) => {
    if (e.code === 'P2025') throw ApiError.notFound('Статья не найдена')
    throw e
  })
  notifySite(['posts', `post:${p.slug}`])
}

export function previewArticle(body) {
  const result = parseArticle(body)
  return { ...result, readingMinutes: readingMinutes(result.sections) }
}

// ---------------------------------------------------------------------------
// Публичное API для сайта: форма Post из src/entities/post сайта
// ---------------------------------------------------------------------------

function toSite(p, locale) {
  const t = p.translations.find((x) => x.locale === locale) ?? p.translations.find((x) => x.locale === 'ru')
  if (!t) return null
  const sections = t.sections ?? []
  return {
    slug: p.slug,
    title: t.title,
    excerpt: t.excerpt,
    category: t.category,
    topic: p.topic,
    author: t.author,
    publishedAt: day(p.publishedAt),
    readingMinutes: readingMinutes(sections),
    ...(p.cover ? { cover: p.cover } : {}),
    ...(p.bookCover ? { bookCover: p.bookCover } : {}),
    ...(t.takeaways.length ? { takeaways: t.takeaways } : {}),
    ...(t.seoTitle ? { seoTitle: t.seoTitle } : {}),
    ...(t.seoDescription ? { seoDescription: t.seoDescription } : {}),
    sections,
    content: articleText(sections),
  }
}

const PUBLISHED = { status: 'published', publishedAt: { lte: new Date() } }

export async function publicPosts(locale) {
  const posts = await prisma.post.findMany({
    where: PUBLISHED,
    include: { translations: true },
    orderBy: { publishedAt: 'desc' },
  })
  return posts.map((p) => toSite(p, locale)).filter(Boolean)
}

export async function publicPost(slug, locale) {
  const p = await prisma.post.findFirst({ where: { slug, ...PUBLISHED }, include: { translations: true } })
  const shaped = p && toSite(p, locale)
  if (!shaped) throw ApiError.notFound('Статья не найдена')
  return shaped
}

export async function publicPostSlugs() {
  const rows = await prisma.post.findMany({ where: PUBLISHED, select: { slug: true } })
  return rows.map((r) => r.slug)
}
