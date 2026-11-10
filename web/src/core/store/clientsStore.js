import { create } from 'zustand'
import { api } from '../api/client'

/** Справочник клиентов: общий для бухгалтерии и договоров. */
export const useClientsStore = create((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  async fetchClients() {
    set({ loading: true, error: null })
    try {
      const clients = await api.get('/clients')
      set({ clients, loading: false })
      return { ok: true }
    } catch (e) {
      set({ error: e.message, loading: false })
      return { ok: false, error: e.message }
    }
  },

  async createClient(name) {
    set({ error: null })
    try {
      const client = await api.post('/clients', { name })
      set({ clients: [...get().clients, client].sort((a, b) => a.name.localeCompare(b.name)) })
      return { ok: true, client }
    } catch (e) {
      set({ error: e.message })
      return { ok: false, error: e.message }
    }
  },

  async updateClient(id, name) {
    set({ error: null })
    try {
      const client = await api.patch(`/clients/${id}`, { name })
      set({
        clients: get().clients.map((c) => (c.id === id ? client : c)).sort((a, b) => a.name.localeCompare(b.name)),
      })
      return { ok: true, client }
    } catch (e) {
      set({ error: e.message })
      return { ok: false, error: e.message }
    }
  },

  async deleteClient(id) {
    set({ error: null })
    try {
      await api.del(`/clients/${id}`)
      set({ clients: get().clients.filter((c) => c.id !== id) })
      return { ok: true }
    } catch (e) {
      set({ error: e.message })
      return { ok: false, error: e.message }
    }
  },
}))
