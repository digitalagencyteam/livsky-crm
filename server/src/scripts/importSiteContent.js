import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { serializeArticle } from '../../../shared/article.js'

/**
 * Перенос готовых статей и кейсов сайта (моки из макета) в CRM, чтобы после
 * подключения сайта к CRM контент не пропал. Повторный запуск обновляет записи по слагу.
 *
 *   npm run import:site -- ../../website            # путь к папке сайта
 *   npm run import:site -- ../../website --dry      # только показать, что будет перенесено
 *
 * Статьи и кейсы переносятся опубликованными. Картинки остаются ссылками на сайт.
 */

const [siteDir, flag] = process.argv.slice(2)
if (!siteDir) {
  console.error('Укажите путь к папке сайта: npm run import:site -- ../website')
  process.exit(1)
}
const dry = flag === '--dry'

// Моки сайта — TypeScript без расширений в импортах. Копируем во временную папку,
// дописываем «.ts» и загружаем средствами Node (типы он вырезает сам).
async function loadMocks() {
  const dir = await mkdtemp(path.join(tmpdir(), 'livsky-import-'))
  const files = {
    'post.mock.ts': 'src/entities/post/api/post.mock.ts',
    'post.interactive.mock.ts': 'src/entities/post/api/post.interactive.mock.ts',
    'case-study.mock.ts': 'src/entities/case-study/api/case-study.mock.ts',
    'case-study.details.mock.ts': 'src/entities/case-study/api/case-study.details.mock.ts',
  }
  for (const [name, rel] of Object.entries(files)) {
    const src = await readFile(path.resolve(siteDir, rel), 'utf8')
    await writeFile(path.join(dir, name), src.replace(/from '(\.\/[^']+)'/g, "from '$1.ts'"))
  }
  const load = (name) => import(pathToFileURL(path.join(dir, name)).href)
  const [{ postsMock }, { postsInteractiveMock }, { casesMock }] = await Promise.all([
    load('post.mock.ts'),
    load('post.interactive.mock.ts'),
    load('case-study.mock.ts'),
  ])
  await rm(dir, { recursive: true, force: true })
  return { postsMock, postsInteractiveMock, casesMock }
}

export function postRecords({ postsMock, postsInteractiveMock }) {
  return postsMock.ru.map((ru) => {
    const translations = {}
    for (const locale of ['ru', 'en']) {
      const p = postsMock[locale].find((x) => x.slug === ru.slug)
      if (!p) continue
      const extra = postsInteractiveMock[locale]?.[p.slug]
      const sections = p.sections.map((s) => ({ ...s, ...(extra?.blocks[s.id] ? { blocks: extra.blocks[s.id] } : {}) }))
      translations[locale] = {
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        author: p.author,
        takeaways: extra?.takeaways ?? [],
        body: serializeArticle(sections),
        sections,
        seoTitle: '',
        seoDescription: '',
      }
    }
    return { slug: ru.slug, topic: ru.topic, publishedAt: ru.publishedAt, translations }
  })
}

export function caseRecords({ casesMock }) {
  return casesMock.ru.map((ru, index) => {
    const translations = {}
    for (const locale of ['ru', 'en']) {
      const c = casesMock[locale].find((x) => x.slug === ru.slug)
      if (!c) continue
      translations[locale] = {
        title: c.title,
        client: c.client,
        excerpt: c.excerpt,
        category: c.category,
        metric: c.metric,
        tags: c.tags,
        details: c.details,
      }
    }
    return {
      slug: ru.slug,
      year: ru.year,
      projectStatus: ru.status,
      serviceSlugs: ru.serviceSlugs,
      domain: ru.preview?.domain ?? '',
      media: ru.media ?? null,
      sortOrder: index,
      translations,
    }
  })
}

const mocks = await loadMocks()
const posts = postRecords(mocks)
const cases = caseRecords(mocks)
console.log(`Статей: ${posts.length}, кейсов: ${cases.length}`)
if (dry) {
  for (const p of posts) console.log(`  статья ${p.slug}: ${Object.keys(p.translations).join(', ')}`)
  for (const c of cases) console.log(`  кейс ${c.slug}: ${Object.keys(c.translations).join(', ')}`)
  process.exit(0)
}

const { prisma } = await import('../config/prisma.js')
for (const p of posts) {
  const base = { topic: p.topic, status: 'published', publishedAt: new Date(`${p.publishedAt}T09:00:00Z`) }
  const post = await prisma.post.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...base }, update: base })
  for (const [locale, data] of Object.entries(p.translations)) {
    await prisma.postTranslation.upsert({
      where: { postId_locale: { postId: post.id, locale } },
      create: { ...data, postId: post.id, locale },
      update: data,
    })
  }
}
for (const c of cases) {
  const { translations, slug, ...base } = c
  const row = await prisma.case.upsert({
    where: { slug },
    create: { slug, status: 'published', ...base },
    update: { status: 'published', ...base },
  })
  for (const [locale, data] of Object.entries(translations)) {
    await prisma.caseTranslation.upsert({
      where: { caseId_locale: { caseId: row.id, locale } },
      create: { caseId: row.id, locale, data },
      update: { data },
    })
  }
}
console.log('Готово: контент сайта перенесён в CRM')
await prisma.$disconnect()
