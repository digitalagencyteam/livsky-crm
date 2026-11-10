import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

// Приложение целиком без базы: маршруты, проверки, CORS, авторизация, ограничение частоты
const leads = []
mock.module('../config/prisma.js', {
  namedExports: {
    prisma: {
      post: { findMany: async () => [] },
      case: { findMany: async () => [] },
      lead: { create: async ({ data }) => (leads.push(data), { id: 'l1', ...data }) },
    },
  },
})
mock.module('../services/notify.service.js', { namedExports: { notifyLead: async () => {} } })
const { createApp } = await import('../app.js')

const server = createApp().listen(0)
const base = `http://127.0.0.1:${server.address().port}`
test.after(() => server.close())

const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

test('живой и публичный контент', async () => {
  assert.equal((await fetch(`${base}/health`)).status, 200)
  const res = await fetch(`${base}/api/public/posts?locale=en`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), [])
})

test('админские разделы закрыты без входа', async () => {
  for (const path of ['/api/board', '/api/contracts?kind=client', '/api/leads', '/api/site/posts', '/api/clients']) {
    assert.equal((await fetch(base + path)).status, 401, path)
  }
})

test('заявка: проверка полей, ловушка для ботов, CORS сайта', async () => {
  assert.equal((await post('/api/public/leads', { name: 'И', contact: '1' })).status, 400)
  const ok = await post('/api/public/leads', { name: 'Иван', contact: '@ivan', kind: 'call', callAt: '2026-11-12T10:00:00+03:00' }, { Origin: 'http://localhost:3000' })
  assert.equal(ok.status, 201)
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:3000')
  assert.ok(leads[0].callAt instanceof Date)
  // Бот заполнил скрытое поле: «принято», но не сохраняем
  const bot = await post('/api/public/leads', { name: 'Бот', contact: 'spam', website: 'x' })
  assert.equal(bot.status, 201)
  assert.equal(leads.length, 1)
})

test('частые заявки с одного адреса режутся', async () => {
  let last
  for (let i = 0; i < 6; i++) last = await post('/api/public/leads', { name: 'Иван', contact: '@ivan' })
  assert.equal(last.status, 429)
})
