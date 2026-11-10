import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Сервисы контента без базы: вместо Prisma — подставной объект с теми методами, что вызываются.
 * Проверяем главное: форму данных для сайта (контракт с src/entities сайта) и проверки перед публикацией.
 */
const calls = []
const db = { post: null, case: null }
const fakePrisma = {
  post: {
    findFirst: async () => db.post,
    findMany: async () => (db.post ? [db.post] : []),
  },
  case: {
    findFirst: async () => db.case,
    findMany: async () => (db.case ? [db.case] : []),
  },
  lead: { create: async ({ data }) => (calls.push(['lead.create', data]), { id: 'l1', ...data }) },
  contract: {
    findUnique: async () => ({ id: 'k1', kind: 'client', status: 'draft', signedAt: null, files: [] }),
    findMany: async (args) => (calls.push(['contract.findMany', args]), []),
  },
  contractFile: { findMany: async () => [] },
}
mock.module('../../../config/prisma.js', { namedExports: { prisma: fakePrisma } })
mock.module('../../siteHooks.js', { namedExports: { notifySite: (tags) => calls.push(['hook', tags]) } })
mock.module('../../notify.service.js', { namedExports: { notifyLead: async () => calls.push(['notify']) } })

const posts = await import('../post.service.js')
const cases = await import('../case.service.js')
const leads = await import('../../lead.service.js')
const contracts = await import('../../contract.service.js')

const sections = [{ id: 'price', title: 'Цена', paragraphs: ['слово '.repeat(400)] }]

test('статья для сайта: форма Post, перевод с запасным русским', async () => {
  db.post = {
    slug: 'website-cost',
    topic: 'web-development',
    publishedAt: new Date('2026-11-12T09:00:00Z'),
    cover: null,
    bookCover: null,
    translations: [
      { locale: 'ru', title: 'Цена сайта', excerpt: 'Анонс', category: 'Цены', author: { name: 'Антон', role: 'CEO' }, takeaways: ['a'], sections, seoTitle: '', seoDescription: 'SEO' },
    ],
  }
  const ru = await posts.publicPost('website-cost', 'ru')
  assert.equal(ru.publishedAt, '2026-11-12')
  assert.equal(ru.readingMinutes, 2)
  assert.deepEqual(ru.takeaways, ['a'])
  assert.equal(ru.seoDescription, 'SEO')
  assert.equal('seoTitle' in ru, false)
  assert.equal('cover' in ru, false)
  assert.deepEqual(ru.sections, sections)
  // Английского нет — отдаём русский, без 404
  assert.equal((await posts.publicPost('website-cost', 'en')).title, 'Цена сайта')
})

test('статья: публикация без раздела отклоняется', async () => {
  const body = {
    slug: 'x',
    status: 'published',
    topic: 'seo-geo',
    publishedAt: '2026-11-12',
    translations: { ru: { title: 'Т', excerpt: 'А', category: 'Р', author: {}, takeaways: [], body: 'без разделов' } },
  }
  await assert.rejects(posts.savePost(null, body), /хотя бы один раздел/)
})

test('кейс для сайта: форма CaseStudy', async () => {
  db.case = {
    slug: 'burger',
    year: 2026,
    projectStatus: 'live',
    serviceSlugs: ['web-development'],
    domain: 'burger.ru',
    media: { kind: 'video', src: 'https://m/x.mp4', alt: '', width: 1280, height: 720 },
    translations: [
      {
        locale: 'ru',
        data: {
          title: 'Бургерные',
          client: 'Бургер Бро',
          excerpt: 'Кратко',
          category: 'Разработка',
          metric: { value: '+120%', label: 'заявок' },
          tags: ['сайт'],
          details: { h1: 'H1', task: 'Задача', problemText: 'Проблема', result: 'Итог', strategy: [{ icon: 'rocket', title: 'Шаг', text: 'Сделали' }], screens: [] },
        },
      },
    ],
  }
  const c = await cases.publicCase('burger', 'en')
  assert.equal(c.status, 'live')
  assert.equal(c.preview.domain, 'burger.ru')
  assert.equal(c.media.kind, 'video')
  assert.deepEqual(c.content, ['Задача', 'Проблема', 'Сделали', 'Итог'])
  assert.deepEqual(c.serviceSlugs, ['web-development'])
})

test('кейс: публикация без обязательных полей — понятная ошибка', async () => {
  await assert.rejects(
    cases.saveCase(null, { slug: 'a', status: 'published', translations: { ru: { title: 'Т', details: {} } } }),
    /Клиент.*Главная цифра/,
  )
})

test('заявка сохраняется и уходит в уведомления', async () => {
  calls.length = 0
  await leads.createLead({ kind: 'form', name: 'Иван', contact: '@ivan', message: '', needs: [] })
  assert.deepEqual(calls.map((c) => c[0]), ['lead.create', 'notify'])
})

test('договор: не-PDF не принимается, поиск ищет и в тексте файлов', async () => {
  await assert.rejects(
    contracts.uploadFile('k1', { buffer: Buffer.from('hello'), originalname: 'a.pdf', size: 5 }, 'original'),
    /PDF/,
  )
  calls.length = 0
  await contracts.listContracts({ kind: 'client', q: 'аренда' })
  const where = calls[0][1].where.AND
  assert.deepEqual(where[0], { kind: 'client' })
  assert.ok(JSON.stringify(where[1]).includes('textContent'))
})
