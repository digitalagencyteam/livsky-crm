import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Справочник клиентов по имени — так проще искать глазами в выпадающем списке.
 */
export async function listClients() {
  return prisma.client.findMany({ orderBy: { name: 'asc' } })
}

/**
 * Клиент с таким же именем, не глядя на регистр.
 *
 * Уникальность имени в базе регистрозависимая, то есть «Ozon» и «ozon» для
 * неё разные строки. Для человека это один и тот же клиент, и разъехавшись
 * на два, он потом разъезжается всюду: в бухгалтерии и в договорах.
 * Поэтому сверяемся сами, а не полагаемся на базу.
 */
function findByName(name, exceptId) {
  return prisma.client.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  })
}

export async function createClient(name) {
  const twin = await findByName(name)
  if (twin) throw ApiError.conflict(`Клиент «${twin.name}» уже есть`)

  try {
    return await prisma.client.create({ data: { name } })
  } catch (e) {
    // Гонка: одинаковое имя завели дважды одновременно.
    if (e.code === 'P2002') throw ApiError.conflict('Клиент с таким именем уже есть')
    throw e
  }
}

export async function updateClient(id, name) {
  const twin = await findByName(name, id)
  if (twin) throw ApiError.conflict(`Клиент «${twin.name}» уже есть`)

  try {
    return await prisma.client.update({ where: { id }, data: { name } })
  } catch (e) {
    if (e.code === 'P2002') throw ApiError.conflict('Клиент с таким именем уже есть')
    if (e.code === 'P2025') throw ApiError.notFound('Клиент не найден')
    throw e
  }
}

/**
 * Клиента нельзя удалить, пока по нему ведётся учёт или лежат договоры:
 * одно нажатие унесло бы выручку за все месяцы или подписанные документы.
 */
export async function deleteClient(id) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: { board: { select: { id: true } }, _count: { select: { contracts: true } } },
  })
  if (!client) throw ApiError.notFound('Клиент не найден')
  if (client.board) {
    throw ApiError.badRequest('Клиент есть в бухгалтерии — сначала уберите его оттуда, иначе пропадёт весь учёт по нему')
  }
  if (client._count.contracts) {
    throw ApiError.badRequest('По клиенту есть договоры — сначала удалите их')
  }
  await prisma.client.delete({ where: { id } })
  return { ok: true }
}
