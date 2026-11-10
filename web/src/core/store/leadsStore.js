import { create } from 'zustand'
import { api } from '../api/client'

function query(params) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** Заявки с сайта: форма и бронь звонка. Счётчик новых — для бейджа в меню. */
export const useLeadsStore = create((set) => ({
  items: [],
  counts: {},
  newCount: 0,
  loading: false,
  error: null,

  async fetchLeads(filters) {
    set({ loading: true, error: null })
    try {
      const { items, counts } = await api.get(`/leads${query(filters)}`)
      set({ items, counts, newCount: counts.new ?? 0, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  async fetchNewCount() {
    try {
      const { count } = await api.get('/leads/new-count')
      set({ newCount: count })
    } catch {
      // Бейдж не критичен: следующий опрос попробует снова
    }
  },

  async update(id, patch) {
    try {
      const lead = await api.patch(`/leads/${id}`, patch)
      set((s) => ({ items: s.items.map((l) => (l.id === id ? lead : l)) }))
      return { ok: true, data: lead }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  async remove(id) {
    try {
      await api.del(`/leads/${id}`)
      set((s) => ({ items: s.items.filter((l) => l.id !== id) }))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },
}))
