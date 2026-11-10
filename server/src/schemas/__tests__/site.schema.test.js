import { test } from 'node:test'
import assert from 'node:assert/strict'
import { saveCaseSchema, savePostSchema } from '../site.schema.js'
import { publicLeadSchema } from '../lead.schema.js'
import { createContractSchema } from '../contract.schema.js'

test('кейс-черновик: пустые тексты заполняются по шаблону', () => {
  const r = saveCaseSchema.parse({
    body: { slug: 'burger-franchise', status: 'draft', year: 2026, translations: { ru: { title: 'Сеть бургерных' } } },
  })
  const d = r.body.translations.ru.details
  assert.equal(d.results.main.value, '')
  assert.deepEqual(d.strategy, [])
  assert.equal(r.body.projectStatus, 'live')
})

test('кейс: плохой слаг и чужая услуга не проходят', () => {
  assert.equal(saveCaseSchema.safeParse({ body: { slug: 'Бургер', status: 'draft', year: 2026, translations: { ru: {} } } }).success, false)
  assert.equal(
    saveCaseSchema.safeParse({ body: { slug: 'a-b', status: 'draft', year: 2026, serviceSlugs: ['nope'], translations: { ru: {} } } }).success,
    false,
  )
})

test('статья: дата и рубрика', () => {
  const ok = savePostSchema.safeParse({
    body: { slug: 'website-cost', status: 'draft', topic: 'web-development', publishedAt: '2026-11-12', translations: { ru: { body: '## A\nтекст' } } },
  })
  assert.equal(ok.success, true)
  assert.equal(savePostSchema.safeParse({ body: { ...ok.data.body, topic: 'smm-partnerships' } }).success, false)
})

test('заявка с сайта: форма и звонок', () => {
  const form = publicLeadSchema.parse({ body: { name: 'Иван', contact: '@ivan', message: 'Нужен сайт', needs: ['site'] } })
  assert.equal(form.body.kind, 'form')
  const call = publicLeadSchema.parse({
    body: { name: 'Звонок', contact: '+7999', kind: 'call', callAt: '2026-11-12T10:00:00+03:00', platform: 'Telegram' },
  })
  assert.equal(call.body.kind, 'call')
  assert.equal(publicLeadSchema.safeParse({ body: { name: 'И', contact: '1' } }).success, false)
})

test('договор: сумма и даты', () => {
  const r = createContractSchema.parse({ body: { kind: 'employee', party: 'Иванов Иван', signedAt: '2026-11-01', amount: 1200.5 } })
  assert.ok(r.body.signedAt instanceof Date)
  assert.equal(createContractSchema.parse({ body: { kind: 'client', party: 'ООО Ромашка', signedAt: '' } }).body.signedAt, null)
})
