import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { prisma } from '../config/prisma.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteObject, publicUrlFor, putObject } from '../utils/storage.js'

/**
 * Картинки и видео для сайта.
 * Картинки пережимаем в WebP (не шире 2400 px) — как остальные картинки сайта.
 * Видео храним как есть: MP4 H.264, размеры и кадр-заставку присылает админка.
 */
const MAX_WIDTH = 2400
const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm' }

export async function uploadMedia(file, { width, height }) {
  if (!file) throw ApiError.badRequest('Файл не получен')
  const id = randomUUID()

  if (file.mimetype.startsWith('image/')) {
    if (file.size > env.maxImageBytes) throw ApiError.badRequest('Картинка больше 15 МБ')
    const gif = file.mimetype === 'image/gif'
    let out
    try {
      // Анимированный GIF → анимированный WebP: в 3–5 раз легче
      out = await sharp(file.buffer, { animated: gif })
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toBuffer({ resolveWithObject: true })
    } catch {
      throw ApiError.badRequest('Не получилось прочитать картинку')
    }
    const key = `media/${id}.webp`
    await putObject(key, out.data, 'image/webp')
    const h = gif && out.info.pageHeight ? out.info.pageHeight : out.info.height
    return save({ key, kind: 'image', mime: 'image/webp', size: out.data.length, width: out.info.width, height: h })
  }

  const ext = VIDEO_TYPES[file.mimetype]
  if (!ext) throw ApiError.badRequest('Подходят картинки (JPG, PNG, WebP, GIF) и видео MP4/WebM')
  if (file.size > env.maxVideoBytes) throw ApiError.badRequest('Видео больше 60 МБ — сожмите его (H.264, без звука)')
  const key = `media/${id}.${ext}`
  await putObject(key, file.buffer, file.mimetype)
  return save({
    key,
    kind: 'video',
    mime: file.mimetype,
    size: file.size,
    width: Number(width) || null,
    height: Number(height) || null,
  })
}

async function save(data) {
  return prisma.media.create({ data: { ...data, url: publicUrlFor(data.key) } })
}

export function listMedia() {
  return prisma.media.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
}

export async function removeMedia(id) {
  const m = await prisma.media.findUnique({ where: { id } })
  if (!m) throw ApiError.notFound('Файл не найден')
  await prisma.media.delete({ where: { id } })
  await deleteObject(m.key)
}
