import { create } from 'zustand'
import { api } from '../api/client'

function query(params) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
  return `?${q.toString()}`
}

async function call(fn) {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/** Договоры с клиентами и сотрудниками. Поиск и фильтры — на сервере. */
export const useContractsStore = create((set) => ({
  items: [],
  loading: false,
  error: null,

  async fetch(filters) {
    set({ loading: true, error: null })
    try {
      set({ items: await api.get(`/contracts${query(filters)}`), loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  create: (body) => call(() => api.post('/contracts', body)),
  update: (id, body) => call(() => api.patch(`/contracts/${id}`, body)),
  remove: (id) => call(() => api.del(`/contracts/${id}`)),
  get: (id) => call(() => api.get(`/contracts/${id}`)),

  upload(id, file, kind) {
    const form = new FormData()
    form.append('file', file)
    return call(() => api.upload(`/contracts/${id}/files?kind=${kind}`, form))
  },

  removeFile: (fileId) => call(() => api.del(`/contracts/files/${fileId}`)),

  /** Файл закрыт токеном: ссылкой <a href> его не открыть, тянем сами и открываем во вкладке */
  async openFile(fileId) {
    // Вкладку открываем сразу по клику — иначе браузер сочтёт её всплывающим окном
    const tab = window.open('', '_blank')
    try {
      const blob = await api.blob(`/contracts/files/${fileId}`)
      const url = URL.createObjectURL(blob)
      if (tab) tab.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      return { ok: true }
    } catch (e) {
      tab?.close()
      return { ok: false, error: e.message }
    }
  },
}))
