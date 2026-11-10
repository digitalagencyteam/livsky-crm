import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseArticle, readingMinutes } from '../article.js'
import { slugify } from '../site.js'

const SAMPLE = `Вступление про цены.

## Из чего складывается цена
Цена сайта зависит от трёх вещей.
Вторая строка того же абзаца.

Второй абзац.

| Тип | Срок | Цена |
|---|---|---|
| Лендинг | 2 недели | от $1000 |

> «Дешёвый сайт обходится дорого» — Софья, сооснователь

![Схема цены](https://cdn.test/a.webp "1600x900")

!! Совет: Тест пяти секунд
Покажите первый экран знакомому.

Проверьте первый экран:
[ ] Понятно, что вы продаёте
[ ] Одна главная кнопка

?? Что выгоднее?
- Шаблон
+ Сайт с нуля
= Шаблон переделывают через полгода.

## Итог
Начните с лендинга.`

test('разбирает разделы, абзацы и блоки', () => {
  const { sections, intro, warnings } = parseArticle(SAMPLE)
  assert.equal(intro, 'Вступление про цены.')
  assert.deepEqual(warnings, [])
  assert.equal(sections.length, 2)
  const [s] = sections
  assert.equal(s.id, 'iz-chego-skladyvaetsya-tsena')
  assert.deepEqual(s.paragraphs, ['Цена сайта зависит от трёх вещей. Вторая строка того же абзаца.', 'Второй абзац.'])
  assert.deepEqual(s.table, { head: ['Тип', 'Срок', 'Цена'], rows: [['Лендинг', '2 недели', 'от $1000']] })
  assert.deepEqual(s.quote, { text: 'Дешёвый сайт обходится дорого', author: 'Софья, сооснователь' })
  assert.deepEqual(s.images, [{ src: 'https://cdn.test/a.webp', alt: 'Схема цены', width: 1600, height: 900 }])
  assert.deepEqual(s.blocks.map((b) => b.type), ['callout', 'checklist', 'quiz'])
  assert.equal(s.blocks[1].title, 'Проверьте первый экран')
  assert.equal(s.blocks[2].options[1].correct, true)
  assert.equal(s.blocks[2].explanation, 'Шаблон переделывают через полгода.')
})

test('предупреждает о пустой статье и плохом тесте', () => {
  assert.match(parseArticle('Просто текст').warnings[0], /Нет ни одного раздела/)
  const { warnings } = parseArticle('## A\n?? Вопрос\n- один')
  assert.match(warnings[0], /минимум два варианта/)
})

test('одинаковые заголовки дают разные якоря', () => {
  const { sections } = parseArticle('## Итог\nа\n\n## Итог\nб')
  assert.notEqual(sections[0].id, sections[1].id)
})

test('время чтения и транслит', () => {
  assert.equal(readingMinutes([{ title: 'a', paragraphs: ['слово '.repeat(360)] }]), 2)
  assert.equal(slugify('Сколько стоит сайт в 2026 году'), 'skolko-stoit-sayt-v-2026-godu')
})

test('текст ↔ разделы: обратимо, включая JSON-блоки', async () => {
  const { serializeArticle } = await import('../article.js')
  const { sections } = parseArticle(SAMPLE)
  sections[1].blocks = [{ type: 'growth', title: 'Заявки', ads: { label: 'Реклама', perMonth: 20 }, seo: { label: 'SEO', values: [1, 2] }, caption: 'x' }]
  const again = parseArticle(serializeArticle(sections))
  assert.deepEqual(again.warnings, [])
  assert.deepEqual(again.sections, sections)
})
