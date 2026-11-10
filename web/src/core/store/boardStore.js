import { create } from 'zustand'
import { api } from '../api/client'

/**
 * Доска клиентов. Свой стор: данные финансовые, видит их только админ, и
 * смешивать их с общими списками CRM незачем.
 *
 * Все расчёты — на сервере. Здесь лежит то, что он посчитал: если считать
 * прибыль ещё и на фронте, две арифметики однажды разойдутся, и никто не
 * поймёт, какая из них права.
 */

function query(params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, v)
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const useBoardStore = create((set, get) => ({
  summary: null,
  active: [],
  left: [],
  card: null,
  months: [],
  loading: false,
  error: null,

  async fetchBoard(period) {
    set({ loading: true, error: null })
    try {
      const { summary, active, left } = await api.get(`/board${query(period)}`)
      set({ summary, active, left, loading: false })
      return { ok: true }
    } catch (e) {
      set({ error: e.message, loading: false })
      return { ok: false, error: e.message }
    }
  },

  async fetchCard(id, period) {
    try {
      const card = await api.get(`/board/clients/${id}${query(period)}`)
      set({ card })
      return { ok: true, data: card }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  closeCard: () => set({ card: null }),

  async fetchMonths() {
    try {
      set({ months: await api.get('/board/months') })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  addClient: (body) => call(() => api.post('/board/clients', body)),
  editClient: (id, body) => call(() => api.patch(`/board/clients/${id}`, body)),
  markLeft: (id, body) => call(() => api.post(`/board/clients/${id}/leave`, body)),
  markActive: (id) => call(() => api.post(`/board/clients/${id}/return`)),
  removeClient: (id) => call(() => api.del(`/board/clients/${id}`)),

  addService: (body) => call(() => api.post('/board/services', body)),
  editService: (id, body) => call(() => api.patch(`/board/services/${id}`, body)),
  removeService: (id) => call(() => api.del(`/board/services/${id}`)),

  // Отметка «оплачено» у одного расхода и день выплаты, который назвал человек.
  // Снятие галочки шлёт только paid: false. Отвечает сервер обновлённым
  // расходом; карточка и сводка после этого перечитываются страницей.
  setExpensePaid: (id, paid, paidAt) =>
    call(() => api.patch(`/board/expenses/${id}`, paid ? { paid, paidAt } : { paid })),
}))

// Все изменяющие вызовы отвечают одинаково: { ok } либо { ok: false, error }.
// Страница на это и рассчитывает, а сообщение показывает сама.
async function call(fn) {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
