import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/ApiError.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { generateSixDigitCode, hashCode, compareCode } from '../utils/code.js'
import { sendMail, resetCodeEmailText } from '../utils/mailer.js'

const RESET_CODE_TTL_MS = 10 * 60 * 1000
// Одинаковый ответ на «нет такой почты» и «неверный пароль»: не подсказываем, какие адреса есть
const BAD_LOGIN = 'Неверная почта или пароль'

export async function loginWithPassword({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) throw ApiError.unauthorized(BAD_LOGIN)
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw ApiError.unauthorized(BAD_LOGIN)
  return issueTokens(user)
}

/** Код на почту. Ответ одинаковый, есть такая почта или нет. */
export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) return

  const code = generateSixDigitCode()
  await prisma.user.update({
    where: { id: user.id },
    data: { resetCodeHash: await hashCode(code), resetCodeExpires: new Date(Date.now() + RESET_CODE_TTL_MS) },
  })
  await sendMail(user.email, 'Код для восстановления пароля', resetCodeEmailText(code))
}

export async function resetPassword({ email, code, newPassword }) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.resetCodeHash || !user.resetCodeExpires) throw ApiError.badRequest('Код недействителен')
  if (user.resetCodeExpires.getTime() < Date.now()) throw ApiError.badRequest('Код истёк, запросите новый')
  if (!(await compareCode(code, user.resetCodeHash))) throw ApiError.badRequest('Неверный код')

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
      resetCodeHash: null,
      resetCodeExpires: null,
    },
  })
  return issueTokens(updated)
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!(await bcrypt.compare(currentPassword || '', user.passwordHash))) {
    throw ApiError.badRequest('Текущий пароль неверный')
  }
  if (currentPassword === newPassword) throw ApiError.badRequest('Новый пароль совпадает с текущим')
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
  })
}

export async function refreshTokens(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized()
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw ApiError.unauthorized('Сессия истекла')
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.active) throw ApiError.unauthorized()
  return issueTokens(user)
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  }
}

function issueTokens(user) {
  const pub = publicUser(user)
  return { user: pub, accessToken: signAccessToken(pub), refreshToken: signRefreshToken(pub) }
}
