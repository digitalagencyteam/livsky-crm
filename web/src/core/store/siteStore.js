import { create } from 'zustand'
import { api } from '../api/client'

async function call(fn) {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/** Контент сайта: статьи, кейсы и загрузка картинок/видео */
export const useSiteStore = create((set) => ({
  posts: [],
  cases: [],
  loading: false,
  error: null,

  async fetchLists() {
    set({ loading: true, error: null })
    try {
      const [posts, cases] = await Promise.all([api.get('/site/posts'), api.get('/site/cases')])
      set({ posts, cases, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  getPost: (id) => call(() => api.get(`/site/posts/${id}`)),
  savePost: (id, body) => call(() => (id ? api.put(`/site/posts/${id}`, body) : api.post('/site/posts', body))),
  removePost: (id) => call(() => api.del(`/site/posts/${id}`)),

  getCase: (id) => call(() => api.get(`/site/cases/${id}`)),
  saveCase: (id, body) => call(() => (id ? api.put(`/site/cases/${id}`, body) : api.post('/site/cases', body))),
  removeCase: (id) => call(() => api.del(`/site/cases/${id}`)),

  /** Файл → медиатека. Для видео передаём размеры (браузер знает их до загрузки). */
  uploadMedia(file, meta = {}) {
    const form = new FormData()
    for (const [k, v] of Object.entries(meta)) if (v) form.append(k, String(v))
    form.append('file', file)
    return call(() => api.upload('/site/media', form))
  },
}))
