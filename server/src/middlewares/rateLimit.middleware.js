import { ApiError } from '../utils/ApiError.js'

/**
 * Простой ограничитель запросов в памяти процесса: N запросов за окно с одного IP.
 * Сервер один, поэтому общей базы для счётчиков не нужно.
 */
export function rateLimit({ windowMs, max, message = 'Слишком много запросов, попробуйте позже' }) {
  const hits = new Map()
  setInterval(() => {
    const now = Date.now()
    for (const [ip, list] of hits) {
      const fresh = list.filter((t) => now - t < windowMs)
      if (fresh.length) hits.set(ip, fresh)
      else hits.delete(ip)
    }
  }, windowMs).unref()

  return (req, res, next) => {
    const ip = req.ip || 'unknown'
    const now = Date.now()
    const list = (hits.get(ip) || []).filter((t) => now - t < windowMs)
    if (list.length >= max) return next(new ApiError(429, message))
    list.push(now)
    hits.set(ip, list)
    next()
  }
}
