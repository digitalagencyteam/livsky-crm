import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/ApiError.js'
import { notifyLead } from './notify.service.js'

/** Заявка с сайта. Сохраняем сразу, уведомления — следом, без ожидания. */
export async function createLead(data) {
  const lead = await prisma.lead.create({ data })
  notifyLead(lead)
  return { id: lead.id }
}

export async function listLeads({ status, kind, q }) {
  const like = q ? { contains: q, mode: 'insensitive' } : null
  const where = {
    ...(status ? { status } : { status: { not: 'spam' } }),
    ...(kind ? { kind } : {}),
    ...(like ? { OR: [{ name: like }, { contact: like }, { message: like }, { note: like }] } : {}),
  }
  const [items, groups] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.lead.groupBy({ by: ['status'], _count: true }),
  ])
  const counts = Object.fromEntries(groups.map((g) => [g.status, g._count]))
  return { items, counts }
}

export async function newCount() {
  return { count: await prisma.lead.count({ where: { status: 'new' } }) }
}

export async function updateLead(id, patch) {
  try {
    return await prisma.lead.update({ where: { id }, data: patch })
  } catch (e) {
    if (e.code === 'P2025') throw ApiError.notFound('Заявка не найдена')
    throw e
  }
}

export async function removeLead(id) {
  await prisma.lead.delete({ where: { id } }).catch((e) => {
    if (e.code === 'P2025') throw ApiError.notFound('Заявка не найдена')
    throw e
  })
}
