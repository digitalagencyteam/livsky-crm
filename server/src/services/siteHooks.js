import { env } from '../config/env.js'

/**
 * «Контент сайта изменился». Сайт на сервере Next — ревалидирует теги (/api/revalidate),
 * сайт-статика — пересобирается по deploy hook. Адреса и секрет — в SITE_HOOKS / SITE_HOOK_SECRET.
 * Не ждём и не роняем сохранение: в худшем случае сайт обновится по таймеру кэша.
 */
export function notifySite(tags) {
  for (const url of env.siteHooks) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.siteHookSecret, tags }),
      signal: AbortSignal.timeout(10_000),
    })
      .then((res) => {
        if (!res.ok) console.error(`[сайт] ${url} ответил ${res.status}`)
      })
      .catch((e) => console.error(`[сайт] не достучались до ${url}:`, e.message))
  }
}
