import { asyncHandler } from '../utils/asyncHandler.js'
import * as authService from '../services/auth.service.js'
import { prisma } from '../config/prisma.js'

export const login = asyncHandler(async (req, res) => {
  res.json(await authService.loginWithPassword(req.body))
})

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email)
  res.json({ message: 'Если почта известна системе, код отправлен' })
})

export const resetPassword = asyncHandler(async (req, res) => {
  res.json(await authService.resetPassword(req.body))
})

export const refresh = asyncHandler(async (req, res) => {
  res.json(await authService.refreshTokens(req.body.refreshToken))
})

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  res.json(authService.publicUser(user))
})

export const updateMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { name: req.body.name } })
  res.json(authService.publicUser(user))
})

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body)
  res.status(204).send()
})
