import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma.js'

/**
 * Создаёт единственного админа CRM. Повторный запуск ничего не ломает:
 * если админ уже есть, пароль не трогаем (иначе сид сбрасывал бы сменённый пароль).
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:admin
 *
 * После первого входа CRM попросит сменить базовый пароль.
 */
const email = (process.env.ADMIN_EMAIL || 'agencyworkemailone@gmail.com').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD || 'Livsky2026!'
const name = process.env.ADMIN_NAME || 'Админ LIVSKY'

const existing = await prisma.user.findUnique({ where: { email } })
if (existing) {
  console.log(`[сид] админ ${email} уже есть — пароль не меняем`)
} else {
  await prisma.user.create({
    data: { email, name, passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true },
  })
  console.log(`[сид] создан админ ${email}. Базовый пароль сменится при первом входе.`)
}
await prisma.$disconnect()
