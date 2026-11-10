import { z } from 'zod'
import { GLASS_ICONS, LOCALES, SERVICES, TOPICS } from '../../../shared/site.js'
import { objectId } from './common.js'

const str = (max = 500) => z.string().trim().max(max).default('')
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Только латиница, цифры и дефис: my-case')

/** MediaAsset сайта */
export const mediaAsset = z.object({
  kind: z.enum(['image', 'video']),
  src: z.string().url(),
  alt: str(200),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  poster: z.string().url().optional(),
})

const metric = z.object({ value: str(40), label: str(120) }).default({})
const fact = z.object({ value: str(40), label: str(120), note: str(200) }).default({})

/** Тексты кейса на одном языке — шаблон страницы кейса сайта (v7) */
export const caseData = z.object({
  title: str(160),
  client: str(120),
  excerpt: str(400),
  category: str(60),
  metric,
  tags: z.array(z.string().trim().max(40)).max(10).default([]),
  details: z
    .object({
      h1: str(200),
      seoTitle: str(120),
      seoDescription: str(300),
      about: str(200),
      task: str(300),
      services: str(200),
      term: str(60),
      result: str(200),
      brief: z.object({ task: str(300), solution: str(300) }).default({}),
      problemTitle: str(200),
      problemText: str(1500),
      before: z
        .object({ headline: str(200), stats: z.array(metric).max(4).default([]) })
        .default({}),
      strategy: z
        .array(z.object({ icon: z.enum(GLASS_ICONS).default('strategy'), title: str(120), text: str(500) }))
        .max(6)
        .default([]),
      results: z.object({ main: fact, speed: fact, goal: fact }).default({}),
      screens: z
        .array(
          z.object({
            path: str(120),
            title: str(120),
            headline: str(200),
            cta: str(60),
            image: mediaAsset.optional(),
          }),
        )
        .max(6)
        .default([]),
      quote: z.object({ text: str(600), author: str(80), role: str(120) }).default({}),
    })
    .default({}),
})

/** Что обязательно для публикации (черновик можно сохранять пустым) */
export const CASE_REQUIRED = [
  ['title', 'Название'],
  ['client', 'Клиент'],
  ['excerpt', 'Короткое описание'],
  ['category', 'Направление'],
  ['metric.value', 'Главная цифра'],
  ['details.h1', 'Заголовок страницы'],
  ['details.task', 'Задача'],
  ['details.result', 'Результат'],
]

const localized = (schema) =>
  z.object(Object.fromEntries(LOCALES.map((l) => [l, l === 'ru' ? schema : schema.optional().nullable()])))

export const saveCaseSchema = z.object({
  params: z.object({ id: objectId }).partial().optional(),
  body: z.object({
    slug,
    status: z.enum(['draft', 'published']),
    projectStatus: z.enum(['live', 'in-progress']).default('live'),
    year: z.number().int().min(2000).max(2100),
    serviceSlugs: z.array(z.enum(SERVICES.map((s) => s.slug))).max(6).default([]),
    domain: str(120),
    media: mediaAsset.nullable().optional(),
    sortOrder: z.number().int().default(0),
    translations: localized(caseData),
  }),
})

const postText = z.object({
  title: z.string().trim().max(200).default(''),
  excerpt: str(500),
  category: str(60),
  author: z.object({ name: str(80), role: str(120) }).default({}),
  takeaways: z.array(z.string().trim().min(1).max(300)).max(6).default([]),
  body: z.string().max(200_000).default(''),
  seoTitle: str(120),
  seoDescription: str(300),
})

export const savePostSchema = z.object({
  params: z.object({ id: objectId }).partial().optional(),
  body: z.object({
    slug,
    status: z.enum(['draft', 'published']),
    topic: z.enum(TOPICS.map((t) => t.slug)),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cover: mediaAsset.nullable().optional(),
    bookCover: mediaAsset.nullable().optional(),
    translations: localized(postText),
  }),
})

export const previewPostSchema = z.object({ body: z.object({ body: z.string().max(200_000) }) })

export const idParam = z.object({ params: z.object({ id: objectId }) })
export const slugLocale = z.object({
  params: z.object({ slug: z.string().max(80) }).partial(),
  query: z.object({ locale: z.enum(LOCALES).default('ru') }),
})
