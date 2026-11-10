import { randomUUID } from 'node:crypto'
import { extractText, getDocumentProxy } from 'unpdf'
import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteObject, getObjectStream, putObject } from '../utils/storage.js'

/**
 * Договоры — логика «Архива» KOMETA CRM: PDF в хранилище, текст из файла
 * вытаскивается при загрузке и нужен только для поиска. Поиск идёт по стороне,
 * номеру, предмету, заметкам, именам файлов и тексту внутри PDF.
 */

// Сырьё для поиска, а не для показа: потолок защищает базу от PDF на тысячу страниц
const MAX_TEXT_CHARS = 200_000

const FILE_SELECT = { id: true, kind: true, fileName: true, fileSize: true, createdAt: true }
const INCLUDE = {
  client: { select: { id: true, name: true } },
  files: { select: FILE_SELECT, orderBy: { createdAt: 'asc' } },
}

function toCents(amount) {
  if (amount === undefined) return undefined
  return amount === null ? null : Math.round(Number(amount) * 100)
}

/** Клиент: выбран из справочника или новое имя. Поиск без учёта регистра, как в бухгалтерии. */
async function resolveClient({ clientId, party }) {
  if (clientId) {
    const c = await prisma.client.findUnique({ where: { id: clientId } })
    if (!c) throw ApiError.badRequest('Клиент не найден')
    return c
  }
  const name = String(party || '').trim()
  const twin = await prisma.client.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
  return twin ?? prisma.client.create({ data: { name } })
}

export async function listContracts({ kind, status, q, from, to }) {
  const and = [{ kind }]
  if (status) and.push({ status })
  if (from || to) {
    and.push({ signedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}) } })
  }
  if (q) {
    const like = { contains: q, mode: 'insensitive' }
    and.push({
      OR: [
        { party: like },
        { number: like },
        { subject: like },
        { notes: like },
        { client: { name: like } },
        { files: { some: { OR: [{ fileName: like }, { textContent: like }] } } },
      ],
    })
  }
  const items = await prisma.contract.findMany({
    where: { AND: and },
    include: INCLUDE,
    orderBy: [{ signedAt: { sort: 'desc', nulls: 'first' } }, { updatedAt: 'desc' }],
  })

  // Где нашлось: «в тексте договора» — чтобы было понятно, почему договор в выдаче
  let inText = new Set()
  if (q) {
    const hits = await prisma.contractFile.findMany({
      where: { contractId: { in: items.map((c) => c.id) }, textContent: { contains: q, mode: 'insensitive' } },
      select: { contractId: true },
    })
    inText = new Set(hits.map((h) => h.contractId))
  }
  return items.map((c) => ({ ...c, matchedInText: inText.has(c.id) }))
}

export async function getContract(id) {
  const c = await prisma.contract.findUnique({ where: { id }, include: INCLUDE })
  if (!c) throw ApiError.notFound('Договор не найден')
  return c
}

export async function createContract(body) {
  const data = { ...body, amountCents: toCents(body.amount) }
  delete data.amount
  if (body.kind === 'client') {
    const client = await resolveClient(body)
    data.clientId = client.id
    data.party = client.name
  } else {
    data.clientId = null
  }
  return prisma.contract.create({ data, include: INCLUDE })
}

export async function updateContract(id, body) {
  const current = await getContract(id)
  const data = { ...body, amountCents: toCents(body.amount) }
  delete data.amount
  delete data.kind
  if (current.kind === 'client' && (body.clientId || body.party)) {
    const client = await resolveClient({ clientId: body.clientId, party: body.party ?? current.party })
    data.clientId = client.id
    data.party = client.name
  }
  // Пометили подписанным без даты — подставляем сегодня: иначе фильтр по дате его не найдёт
  if (body.status === 'signed' && !body.signedAt && !current.signedAt) data.signedAt = new Date()
  return prisma.contract.update({ where: { id }, data, include: INCLUDE })
}

export async function removeContract(id) {
  const c = await getContract(id)
  const keys = await prisma.contractFile.findMany({ where: { contractId: id }, select: { fileKey: true } })
  await prisma.contract.delete({ where: { id: c.id } })
  await Promise.all(keys.map((k) => deleteObject(k.fileKey)))
}

async function pdfText(buffer) {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    return text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_CHARS) || null
  } catch {
    // Скан без текстового слоя или битый файл: договор найдётся по полям, но не по словам внутри
    return null
  }
}

export async function uploadFile(contractId, file, kind) {
  if (!file) throw ApiError.badRequest('Файл не получен')
  // Проверяем содержимое, а не расширение: «договор.pdf» может оказаться чем угодно
  if (file.buffer.subarray(0, 5).toString() !== '%PDF-') throw ApiError.badRequest('Нужен PDF-файл')
  const contract = await getContract(contractId)

  const key = `contracts/${contract.id}/${randomUUID()}.pdf`
  await putObject(key, file.buffer, 'application/pdf')
  const textContent = await pdfText(file.buffer)

  // Имя файла из multer приходит в latin1 — переводим в UTF-8, иначе кириллица ломается
  const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
  try {
    await prisma.contractFile.create({
      data: { contractId: contract.id, kind, fileKey: key, fileName, fileSize: file.size, textContent },
    })
  } catch (e) {
    await deleteObject(key)
    throw e
  }

  // Подписанный скан — значит, договор подписан
  if (kind === 'signed' && contract.status !== 'signed') {
    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'signed', signedAt: contract.signedAt ?? new Date() },
    })
  }
  return { ...(await getContract(contract.id)), textFound: Boolean(textContent) }
}

export async function openFile(fileId) {
  const file = await prisma.contractFile.findUnique({ where: { id: fileId } })
  if (!file) throw ApiError.notFound('Файл не найден')
  return { file, stream: await getObjectStream(file.fileKey) }
}

export async function removeFile(fileId) {
  const file = await prisma.contractFile.findUnique({ where: { id: fileId } })
  if (!file) throw ApiError.notFound('Файл не найден')
  await prisma.contractFile.delete({ where: { id: fileId } })
  await deleteObject(file.fileKey)
}
