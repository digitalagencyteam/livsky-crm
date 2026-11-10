import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Несколько запросов могут словить 401 одновременно (например, страница
// с параллельными fetchUsers/fetchDepartments/fetchTasks при истёкшем
// access-токене) — без этой блокировки каждый из них попытался бы
// обновить токен сам по себе. Одна попытка обновления на всех, остальные
// ждут её результата.
let refreshInFlight = null

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) throw new Error('Нет refresh-токена')

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) throw new Error('Refresh не прошёл')

      const data = await res.json()
      useAuthStore.getState().setTokens(data)
      return data.accessToken
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}, isRetry = false) {
  const token = useAuthStore.getState().token

  // Файлы уходят формой, а не JSON. Content-Type в этом случае не ставим
  // руками: браузер добавляет его сам вместе с разделителем частей,
  // который мы подобрать не можем.
  const isForm = body instanceof FormData

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  })

  const isAuthRoute = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'].includes(path)

  if (res.status === 401 && !isAuthRoute) {
    // Первый раз на этом запросе — не сдаёмся сразу. Access-токен живёт
    // 15 минут, это истекает в середине обычной сессии постоянно, а не
    // значит, что человека реально нужно выкинуть с сайта.
    if (!isRetry) {
      try {
        await refreshAccessToken()
        return request(path, { method, body, headers, raw }, true)
      } catch {
        useAuthStore.getState().logout()
      }
    } else {
      // Не помог даже свежий токен — значит и refresh-токен просрочен
      // или отозван, тут разлогин уже обоснован.
      useAuthStore.getState().logout()
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const err = new Error(data?.error?.message || `Ошибка ${res.status}`)
    err.status = res.status
    err.details = data?.error?.details
    throw err
  }

  // Ответ целиком нужен там, где тело не JSON: PDF отчёта отдаётся
  // потоком, и разбирать его как объект нечем.
  if (raw) return res

  return res.status === 204 ? null : res.json()
}

export const api = {
  get: (path) => request(path),
  // Ответ целиком — для файлов: выгрузка отдаётся не JSON, а документом.
  getRaw: (path) => request(path, { raw: true }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  // Замена целиком: статья и кейс сохраняются всей формой.
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),

  /** Отправка файла формой. Тело — готовая FormData. */
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),

  /**
   * Скачивание файла. Ссылкой не обойтись: файл закрыт токеном, а тег
   * <a href> заголовок авторизации не отправит. Поэтому тянем сами и
   * отдаём содержимое вызывающему.
   */
  blob: async (path) => (await request(path, { raw: true })).blob(),
}
