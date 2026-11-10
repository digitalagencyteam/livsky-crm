import { Router } from 'express'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { rateLimit } from '../middlewares/rateLimit.middleware.js'
import {
  loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema, updateMeSchema, changePasswordSchema,
} from '../schemas/auth.schema.js'
import * as authController from '../controllers/auth.controller.js'

const router = Router()

// Подбор пароля и спам кодами на почту: 10 попыток за 15 минут с одного адреса
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

router.post('/login', authLimit, validate(loginSchema), authController.login)
router.post('/forgot-password', authLimit, validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/reset-password', authLimit, validate(resetPasswordSchema), authController.resetPassword)
router.post('/refresh', validate(refreshSchema), authController.refresh)
router.get('/me', authenticate, authController.me)
router.patch('/me', authenticate, validate(updateMeSchema), authController.updateMe)
router.patch('/me/password', authenticate, validate(changePasswordSchema), authController.changePassword)

export default router
