import { z } from 'zod'
import { emailSchema } from './common.js'

// Пароль админки финансов: не короче 8 символов
const password = z.string().min(8, 'Минимум 8 символов').max(200)

export const loginSchema = z.object({
  body: z.object({ email: emailSchema, password: z.string().min(1).max(200) }),
})

export const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(10) }),
})

export const forgotPasswordSchema = z.object({ body: z.object({ email: emailSchema }) })

export const resetPasswordSchema = z.object({
  body: z.object({ email: emailSchema, code: z.string().length(6), newPassword: password }),
})

export const updateMeSchema = z.object({
  body: z.object({ name: z.string().trim().min(1).max(80) }),
})

export const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1), newPassword: password }),
})
