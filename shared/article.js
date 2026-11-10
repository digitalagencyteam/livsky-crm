import { slugify } from './site.js'

/**
 * Текст статьи → разделы сайта (PostSection[]).
 *
 * Админ вставляет текст как есть — из Google Docs, Notion, заметок — и размечает
 * его несколькими простыми знаками. Разбор один и тот же в админке (живой предпросмотр)
 * и на сервере (сохранение), поэтому файл общий.
 *
 *   ## Раздел                 новый раздел
 *   текст                     абзац (пустая строка — следующий абзац)
 *   > Цитата — Автор          цитата
 *   | A | B |                 таблица, первая строка — шапка
 *   ![подпись](url "1600x900") картинка (кнопка «Картинка» вставляет её сама)
 *   !! Совет: Заголовок       блок-совет, текст — следующие строки
 *   !! Важно: Заголовок       блок-предупреждение
 *   Заголовок чек-листа:      строка с двоеточием перед пунктами
 *   [ ] пункт                 пункт чек-листа
 *   ?? Вопрос                 мини-тест: «- вариант», «+ верный», «= пояснение»
 *   :::                       любой блок сайта в JSON (калькулятор, график…), до закрывающей «:::»
 */

export const ARTICLE_SYNTAX = [
  ['## Раздел', 'новый раздел статьи'],
  ['пустая строка', 'новый абзац'],
  ['> Цитата — Автор', 'цитата'],
  ['| A | B |', 'таблица, первая строка — шапка'],
  ['![подпись](ссылка)', 'картинка — проще кнопкой «Картинка»'],
  ['!! Совет: Заголовок', 'совет, текст — на следующих строках'],
  ['!! Важно: Заголовок', 'предупреждение'],
  ['[ ] пункт', 'чек-лист; строка перед ним с «:» — заголовок'],
  ['?? Вопрос', 'тест: «- вариант», «+ верный», «= пояснение»'],
  ['::: … :::', 'блок сайта в JSON: калькулятор, график, цифры'],
]

const QUOTE_SPLIT = /\s+[—–-]\s+(?=[^—–-]+$)/

function flushParagraph(state) {
  const text = state.para.join(' ').replace(/\s+/g, ' ').trim()
  if (text) state.section.paragraphs.push(text)
  state.para = []
}

function newSection(state, title) {
  let id = slugify(title, 40) || `section-${state.sections.length + 1}`
  while (state.ids.has(id)) id = `${id}-${state.sections.length + 1}`
  state.ids.add(id)
  state.section = { id, title, paragraphs: [] }
  state.sections.push(state.section)
}

function addBlock(section, block) {
  section.blocks = [...(section.blocks || []), block]
}

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

export function parseArticle(body) {
  const warnings = []
  const intro = []
  const state = { sections: [], section: null, para: [], ids: new Set() }
  const lines = String(body || '').replace(/\r\n?/g, '\n').split('\n')

  let i = 0
  // Текст до первого «##» — вступление: в разделы не идёт, админка предложит его как анонс
  const flushIntro = () => {
    const text = state.para.join(' ').trim()
    if (text) intro.push(text)
    state.para = []
  }
  const flush = () => (state.section ? flushParagraph(state) : flushIntro())

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    if (/^##\s+/.test(line)) {
      flush()
      newSection(state, line.replace(/^##\s+/, '').trim())
      i++
      continue
    }

    // Заголовок статьи «# …» пропускаем — он задаётся отдельным полем
    if (/^#\s+/.test(line) && !state.section) {
      i++
      continue
    }

    if (!line) {
      flush()
      i++
      continue
    }

    const section = state.section
    if (!section) {
      state.para.push(line)
      i++
      continue
    }

    // Цитата
    if (line.startsWith('>')) {
      flushParagraph(state)
      const text = line.replace(/^>\s*/, '').replace(/^[«"]|[»"]$/g, '')
      const [quote, author = ''] = text.split(QUOTE_SPLIT)
      section.quote = { text: quote.replace(/[«»"]/g, '').trim(), author: author.trim() }
      i++
      continue
    }

    // Таблица: подряд идущие строки с «|»
    if (line.startsWith('|')) {
      flushParagraph(state)
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = cells(lines[i])
        if (!row.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(row)
        i++
      }
      const [head = [], ...rest] = rows
      if (rest.length) section.table = { head, rows: rest.map((r) => head.map((_, k) => r[k] ?? '')) }
      else warnings.push(`Таблица в разделе «${section.title}» без строк — пропущена`)
      continue
    }

    // Картинка
    const img = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"(\d+)x(\d+)")?\s*\)$/.exec(line)
    if (img) {
      flushParagraph(state)
      const [, alt, src, w, h] = img
      section.images = [
        ...(section.images || []),
        { src, alt: alt.trim(), ...(w && h ? { width: Number(w), height: Number(h) } : {}) },
      ]
      i++
      continue
    }

    // Совет / предупреждение
    const callout = /^!!\s*(совет|важно|tip|warning)\s*:?\s*(.*)$/i.exec(line)
    if (callout) {
      flushParagraph(state)
      const tone = /^(совет|tip)$/i.test(callout[1]) ? 'tip' : 'warning'
      const text = []
      i++
      while (i < lines.length && lines[i].trim()) text.push(lines[i].trim()), i++
      addBlock(section, { type: 'callout', tone, title: callout[2].trim(), text: text.join(' ') })
      continue
    }

    // Чек-лист
    if (/^\[\s?[xх]?\s?\]\s+/i.test(line)) {
      // Заголовок — последний абзац, если он закончился двоеточием
      let title = ''
      const last = state.para.join(' ').trim()
      if (last.endsWith(':')) {
        title = last.slice(0, -1).trim()
        state.para = []
      } else flushParagraph(state)
      const items = []
      while (i < lines.length && /^\[\s?[xх]?\s?\]\s+/i.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\[\s?[xх]?\s?\]\s+/i, ''))
        i++
      }
      addBlock(section, { type: 'checklist', title: title || 'Проверьте себя', items })
      continue
    }

    // Блок сайта в JSON между «:::»
    if (line === ':::') {
      flushParagraph(state)
      const json = []
      i++
      while (i < lines.length && lines[i].trim() !== ':::') json.push(lines[i]), i++
      i++
      try {
        const block = JSON.parse(json.join('\n'))
        if (!block || typeof block.type !== 'string') throw new Error('нет type')
        addBlock(section, block)
      } catch (e) {
        warnings.push(`Блок ::: в разделе «${section.title}» не разобран: ${e.message}`)
      }
      continue
    }

    // Мини-тест
    if (line.startsWith('??')) {
      flushParagraph(state)
      const question = line.replace(/^\?\?\s*/, '')
      const options = []
      let explanation = ''
      i++
      while (i < lines.length && /^[-+=]\s+/.test(lines[i].trim())) {
        const l = lines[i].trim()
        if (l.startsWith('=')) explanation = l.slice(1).trim()
        else
          options.push({ text: l.slice(1).trim(), ...(l.startsWith('+') ? { correct: true } : {}) })
        i++
      }
      if (options.length < 2 || !options.some((o) => o.correct)) {
        warnings.push(`Тест «${question}»: нужно минимум два варианта и один верный (+)`)
      } else addBlock(section, { type: 'quiz', question, options, explanation })
      continue
    }

    state.para.push(line)
    i++
  }
  flush()

  if (!state.sections.length) warnings.push('Нет ни одного раздела: начните раздел строкой «## Заголовок»')
  for (const s of state.sections) {
    if (!s.paragraphs.length && !s.table && !s.blocks && !s.images) warnings.push(`Раздел «${s.title}» пустой`)
  }

  return { sections: state.sections, intro: intro.join('\n\n'), warnings }
}

/** Плоский текст статьи: для RSS, превью и подсчёта времени чтения */
export function articleText(sections) {
  return sections.flatMap((s) => [s.title, ...s.paragraphs, ...(s.blocks || []).map((b) => b.text || '')])
}

/** Минуты чтения: 180 слов в минуту, не меньше одной */
export function readingMinutes(sections) {
  const words = articleText(sections).join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 180))
}

/**
 * Обратно: разделы → текст для редактора. Нужен для переноса уже готовых статей сайта в CRM.
 * parseArticle(serializeArticle(x)) даёт те же разделы.
 */
export function serializeArticle(sections) {
  const out = []
  for (const s of sections) {
    out.push(`## ${s.title}`, '')
    for (const p of s.paragraphs) out.push(p, '')
    if (s.table) {
      out.push(`| ${s.table.head.join(' | ')} |`, `|${s.table.head.map(() => '---').join('|')}|`)
      for (const r of s.table.rows) out.push(`| ${r.join(' | ')} |`)
      out.push('')
    }
    if (s.quote) out.push(`> ${s.quote.text}${s.quote.author ? ` — ${s.quote.author}` : ''}`, '')
    for (const img of s.images || []) {
      out.push(`![${img.alt}](${img.src}${img.width && img.height ? ` "${img.width}x${img.height}"` : ''})`, '')
    }
    for (const b of s.blocks || []) {
      if (b.type === 'callout') out.push(`!! ${b.tone === 'tip' ? 'Совет' : 'Важно'}: ${b.title}`, b.text, '')
      else if (b.type === 'checklist') out.push(`${b.title}:`, ...b.items.map((x) => `[ ] ${x}`), '')
      else if (b.type === 'quiz') {
        out.push(`?? ${b.question}`, ...b.options.map((o) => `${o.correct ? '+' : '-'} ${o.text}`))
        if (b.explanation) out.push(`= ${b.explanation}`)
        out.push('')
      } else out.push(':::', JSON.stringify(b, null, 2), ':::', '')
    }
  }
  return out.join('\n').trim() + '\n'
}
