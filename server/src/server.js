import { createApp } from './app.js'
import { connectDb } from './config/db.js'
import { env } from './config/env.js'
import { r2Ready } from './utils/storage.js'
import { mailReady } from './utils/mailer.js'

async function bootstrap() {
  await connectDb()
  createApp().listen(env.port, () => {
    console.log(`[server] LIVSKY CRM API: порт ${env.port}`)
    if (!r2Ready()) console.log(`[хранилище] R2 не настроен — файлы в папке ${env.uploadsDir}/`)
    if (!mailReady()) console.log('[почта] SMTP не настроен — письма (коды, заявки) только в консоль')
  })
}

bootstrap().catch((err) => {
  console.error('[server] не удалось запуститься:', err)
  process.exit(1)
})
