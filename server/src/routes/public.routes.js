import { Router } from 'express'
import cors from 'cors'
import { env } from '../config/env.js'
import { validate } from '../middlewares/validate.middleware.js'
import { rateLimit } from '../middlewares/rateLimit.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { slugLocale } from '../schemas/site.schema.js'
import { publicLeadSchema } from '../schemas/lead.schema.js'
import { createLead } from '../services/lead.service.js'
import * as posts from '../services/site/post.service.js'
import * as cases from '../services/site/case.service.js'

/**
 * Публичное API для сайта (API_URL сайта = https://<crm-api>/api/public).
 * Контракт — как ждёт сайт: /posts, /posts/slugs, /posts/:slug, /cases…, POST /leads.
 * Сервер сайта ходит без Origin; из браузера (статический сайт) — только с адресов SITE_ORIGINS.
 */
const router = Router()
router.use(cors({ origin: env.siteOrigins, methods: ['GET', 'POST'] }))

// Контент кэшируется сайтом; короткий кэш здесь — на случай прямых запросов
const cache = (res) => res.setHeader('Cache-Control', 'public, max-age=60')

router.get('/posts', validate(slugLocale), asyncHandler(async (req, res) => {
  cache(res)
  res.json(await posts.publicPosts(req.query.locale))
}))
router.get('/posts/slugs', asyncHandler(async (req, res) => res.json(await posts.publicPostSlugs())))
router.get('/posts/:slug', validate(slugLocale), asyncHandler(async (req, res) => {
  cache(res)
  res.json(await posts.publicPost(req.params.slug, req.query.locale))
}))

router.get('/cases', validate(slugLocale), asyncHandler(async (req, res) => {
  cache(res)
  res.json(await cases.publicCases(req.query.locale))
}))
router.get('/cases/slugs', asyncHandler(async (req, res) => res.json(await cases.publicCaseSlugs())))
router.get('/cases/:slug', validate(slugLocale), asyncHandler(async (req, res) => {
  cache(res)
  res.json(await cases.publicCase(req.params.slug, req.query.locale))
}))

// Заявки: 5 за 10 минут с одного адреса — людям хватает, спам-боту нет
const leadLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, message: 'Слишком много заявок, попробуйте позже' })
router.post('/leads', leadLimit, validate(publicLeadSchema), asyncHandler(async (req, res) => {
  const { website, callAt, ...data } = req.body
  // Бот заполнил скрытое поле — отвечаем «принято», но не сохраняем
  if (website) return res.status(201).json({ ok: true })
  await createLead({ ...data, callAt: callAt ? new Date(callAt) : null })
  res.status(201).json({ ok: true })
}))

export default router
