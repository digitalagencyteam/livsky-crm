import path from 'node:path'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env.js'
import routes from './routes/index.js'
import publicRoutes from './routes/public.routes.js'
import { r2Ready } from './utils/storage.js'
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js'

export function createApp() {
  const app = express()
  // За прокси хостинга: настоящий IP клиента — для ограничения частоты запросов
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(express.json({ limit: '2mb' }))
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'))

  app.get('/health', (req, res) => res.json({ ok: true }))

  // Картинки сайта при локальном хранении (без R2). Договоры здесь не лежат: у них отдельный префикс и доступ через API.
  if (!r2Ready()) {
    app.use('/uploads/media', express.static(path.resolve(env.uploadsDir, 'media'), { maxAge: '365d', immutable: true }))
  }

  app.use('/api/public', publicRoutes)
  app.use('/api', cors({ origin: env.clientUrl, exposedHeaders: ['Content-Disposition'] }), routes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
