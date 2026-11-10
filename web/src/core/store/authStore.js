import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

/** Вход единственного админа. Токены — в localStorage: выход только по кнопке. */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      error: null,

      async login({ email, password }) {
        return authCall(set, () => api.post('/auth/login', { email, password }))
      },

      async forgotPassword(email) {
        set({ loading: true, error: null })
        try {
          await api.post('/auth/forgot-password', { email })
          set({ loading: false })
          return { ok: true }
        } catch (e) {
          set({ error: e.message, loading: false })
          return { ok: false, error: e.message }
        }
      },

      async resetPassword({ email, code, newPassword }) {
        return authCall(set, () => api.post('/auth/reset-password', { email, code, newPassword }))
      },

      async changePassword({ currentPassword, newPassword }) {
        try {
          await api.patch('/auth/me/password', { currentPassword, newPassword })
          set({ user: { ...get().user, mustChangePassword: false } })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e.message }
        }
      },

      async updateName(name) {
        try {
          const user = await api.patch('/auth/me', { name })
          set({ user })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e.message }
        }
      },

      logout() {
        set({ user: null, token: null, refreshToken: null, error: null })
      },

      /** Вызывается api-клиентом после тихого обновления access-токена. */
      setTokens({ accessToken, refreshToken, user }) {
        set({ token: accessToken, ...(refreshToken ? { refreshToken } : {}), ...(user ? { user } : {}) })
      },

      async refreshMe() {
        if (!get().token) return
        try {
          set({ user: await api.get('/auth/me') })
        } catch {
          // Выход по просроченной сессии делает клиент API
        }
      },
    }),
    { name: 'livsky-crm-auth', partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken }) },
  ),
)

async function authCall(set, fn) {
  set({ loading: true, error: null })
  try {
    const { user, accessToken, refreshToken } = await fn()
    set({ user, token: accessToken, refreshToken, loading: false })
    return { ok: true }
  } catch (e) {
    set({ error: e.message, loading: false })
    return { ok: false, error: e.message }
  }
}
