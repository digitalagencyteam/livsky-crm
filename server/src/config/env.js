import 'dotenv/config'

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv.trim().toLowerCase() === 'production'

// Секреты подписи токенов. В разработке подставляются временные; на боевом
// сервере без них не стартуем — иначе токен подделал бы кто угодно.
function secret(name, devFallback) {
  const value = process.env[name]
  if (value && value.trim()) return value
  if (isProduction) {
    throw new Error(`Не задана переменная окружения ${name}. На боевом сервере она обязательна.`)
  }
  return devFallback
}

const list = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv,
  isProduction,
  databaseUrl: process.env.DATABASE_URL || '',

  jwtAccessSecret: secret('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  accessTokenTtl: '15m',
  // Админка одного человека: выход только по кнопке
  refreshTokenTtl: '400d',

  // Адрес админки (CORS с куками) и адреса сайта (публичное API и заявки из браузера)
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  siteOrigins: list(process.env.SITE_ORIGINS || 'http://localhost:3000'),
  // Публичный адрес самого API: из него собираются ссылки на загруженные картинки при локальном хранении
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 4000}`).replace(/\/$/, ''),

  // Куда слать «контент изменился»: ревалидация Next (/api/revalidate) или deploy hook хостинга
  siteHooks: list(process.env.SITE_HOOKS),
  siteHookSecret: process.env.SITE_HOOK_SECRET || '',

  // Уведомления о заявках
  notifyEmail: process.env.NOTIFY_EMAIL || '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

  // Хранилище файлов: Cloudflare R2 (или любое S3). Не задано — папка uploads/ на диске (для разработки).
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
    // Публичный адрес бакета/домена для картинок и видео сайта (https://media.livsky.ru)
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
  },
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',

  maxContractBytes: 25 * 1024 * 1024,
  maxImageBytes: 15 * 1024 * 1024,
  maxVideoBytes: 60 * 1024 * 1024,

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'LIVSKY CRM <no-reply@livsky.ru>',
  },
}
