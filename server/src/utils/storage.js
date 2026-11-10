import { createReadStream } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { env } from '../config/env.js'
import { ApiError } from './ApiError.js'

/**
 * Хранилище файлов: Cloudflare R2 (S3-совместимое) на боевом сервере,
 * папка на диске — пока ключи не заданы (локальная разработка).
 *
 * Два вида файлов:
 * - contracts/… — договоры. Отдаются только через API после входа, прямой ссылки нет;
 * - media/…     — картинки и видео сайта. Публичные: ссылка уходит на сайт.
 */

export const r2Ready = () =>
  Boolean(env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucket)

let client = null
function s3() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
    })
  }
  return client
}

// Ключ приходит только от нашего кода, но путь всё равно проверяем: без «..» и абсолютных путей
function localPath(key) {
  if (!/^[a-z]+\/[\w./-]+$/i.test(key) || key.includes('..')) throw ApiError.badRequest('Некорректный ключ файла')
  return path.resolve(env.uploadsDir, key)
}

export async function putObject(key, body, contentType) {
  if (r2Ready()) {
    await s3().send(new PutObjectCommand({ Bucket: env.r2.bucket, Key: key, Body: body, ContentType: contentType }))
    return
  }
  const file = localPath(key)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, body)
}

export async function getObjectStream(key) {
  if (r2Ready()) {
    const res = await s3().send(new GetObjectCommand({ Bucket: env.r2.bucket, Key: key }))
    return res.Body
  }
  return createReadStream(localPath(key))
}

/** Удаление не бросает: файл мог уже исчезнуть, это не повод ронять запрос. */
export async function deleteObject(key) {
  try {
    if (r2Ready()) await s3().send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: key }))
    else await rm(localPath(key), { force: true })
  } catch (e) {
    console.error(`[хранилище] файл ${key} не удалён:`, e.message)
  }
}

/** Публичная ссылка на медиа сайта */
export function publicUrlFor(key) {
  if (r2Ready()) {
    if (!env.r2.publicUrl) throw ApiError.badRequest('Для картинок сайта задайте R2_PUBLIC_URL — публичный адрес бакета')
    return `${env.r2.publicUrl}/${key}`
  }
  return `${env.publicUrl}/uploads/${key}`
}
