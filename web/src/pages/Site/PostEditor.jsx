import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ARTICLE_SYNTAX, parseArticle, readingMinutes } from '@shared/article.js'
import { slugify, TOPICS } from '@shared/site.js'
import { useSiteStore } from '../../core/store/siteStore'
import { Button, Card, ConfirmModal, DatePicker, Input, Segmented, Select, Spinner, Textarea } from '../../shared/ui'
import { ArticlePreview } from '../../components/site/ArticlePreview'
import { MediaPicker } from '../../components/site/MediaPicker'
import { uploadAsset } from '../../components/site/media'
import { archiveDayKey } from '../../utils/files'

const LOCALES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]
const TOPIC_OPTIONS = TOPICS.map((t) => ({ value: t.slug, label: t.title }))

const emptyText = () => ({
  title: '',
  excerpt: '',
  category: '',
  author: { name: '', role: '' },
  takeaways: [],
  body: '',
  seoTitle: '',
  seoDescription: '',
})

// Заготовки для панели вставки: ставятся в место курсора
const SNIPPETS = [
  { label: 'Раздел', text: '\n## Заголовок раздела\n\nТекст раздела.\n' },
  { label: 'Цитата', text: '\n> Текст цитаты — Автор, должность\n' },
  { label: 'Таблица', text: '\n| Колонка | Колонка |\n|---|---|\n| Значение | Значение |\n' },
  { label: 'Совет', text: '\n!! Совет: Заголовок совета\nТекст совета.\n' },
  { label: 'Важно', text: '\n!! Важно: Заголовок\nТекст предупреждения.\n' },
  { label: 'Чек-лист', text: '\nПроверьте себя:\n[ ] Пункт первый\n[ ] Пункт второй\n' },
  { label: 'Тест', text: '\n?? Вопрос?\n- Неверный вариант\n+ Верный вариант\n= Почему верный\n' },
]

/**
 * Редактор статьи: слева текст и поля, справа живой предпросмотр.
 * Текст размечается простыми знаками (## раздел, > цитата…) — разбор тот же, что на сервере.
 */
export default function PostEditorPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const store = useSiteStore()

  const [loading, setLoading] = useState(!isNew)
  const [locale, setLocale] = useState('ru')
  const [meta, setMeta] = useState({
    slug: '',
    status: 'draft',
    topic: 'web-development',
    publishedAt: archiveDayKey(),
    cover: null,
    bookCover: null,
  })
  const [texts, setTexts] = useState({ ru: emptyText(), en: emptyText() })
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const bodyRef = useRef(null)
  const imgInput = useRef(null)

  useEffect(() => {
    if (isNew) return
    store.getPost(id).then((res) => {
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      const p = res.data
      setMeta({ slug: p.slug, status: p.status, topic: p.topic, publishedAt: p.publishedAt, cover: p.cover, bookCover: p.bookCover })
      setTexts({
        ru: { ...emptyText(), ...p.translations.ru },
        en: { ...emptyText(), ...(p.translations.en ?? {}) },
      })
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const t = texts[locale]
  const setText = (key, value) => setTexts((all) => ({ ...all, [locale]: { ...all[locale], [key]: value } }))
  const setMetaKey = (key) => (value) => setMeta((m) => ({ ...m, [key]: value?.target ? value.target.value : value }))

  const parsed = useMemo(() => parseArticle(t.body), [t.body])
  const minutes = useMemo(() => readingMinutes(parsed.sections), [parsed])

  // Слаг сам следует за русским заголовком, пока его не поправили руками
  useEffect(() => {
    if (!slugTouched) setMeta((m) => ({ ...m, slug: slugify(texts.ru.title) }))
  }, [texts.ru.title, slugTouched])

  function insert(snippet) {
    const el = bodyRef.current
    const start = el?.selectionStart ?? t.body.length
    const end = el?.selectionEnd ?? t.body.length
    const next = t.body.slice(0, start) + snippet + t.body.slice(end)
    setText('body', next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  async function insertImage(file) {
    if (!file) return
    setImgBusy(true)
    try {
      const asset = await uploadAsset(store, file)
      if (asset.kind !== 'image') throw new Error('В текст статьи вставляются только картинки')
      insert(`\n![Подпись к картинке](${asset.src} "${asset.width}x${asset.height}")\n`)
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setImgBusy(false)
  }

  async function save(status = meta.status) {
    setBusy(true)
    setMsg(null)
    const en = texts.en.title ? texts.en : null
    const body = { ...meta, status, translations: { ru: texts.ru, en } }
    const res = await store.savePost(isNew ? null : id, body)
    setBusy(false)
    if (!res.ok) return setMsg({ ok: false, text: res.error })
    setMeta((m) => ({ ...m, status }))
    const warn = res.data.warnings?.length ? ` Обратите внимание: ${res.data.warnings.join('; ')}` : ''
    setMsg({ ok: true, text: (status === 'published' ? 'Опубликовано — сайт обновится в течение минуты.' : 'Черновик сохранён.') + warn })
    if (isNew) navigate(`/site/posts/${res.data.id}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/site?tab=posts')}>
          ← Статьи
        </Button>
        <h1 className="font-display text-xl mr-auto">{isNew ? 'Новая статья' : texts.ru.title || 'Статья'}</h1>
        {!isNew && (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Удалить
          </Button>
        )}
        <Button variant="secondary" loading={busy} onClick={() => save('draft')}>
          {meta.status === 'published' ? 'Снять с сайта' : 'Сохранить черновик'}
        </Button>
        <Button loading={busy} onClick={() => save('published')}>
          {meta.status === 'published' ? 'Сохранить' : 'Опубликовать'}
        </Button>
      </div>
      {msg && <p className={msg.ok ? 'text-sm text-ok' : 'text-sm text-danger'}>{msg.text}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-5">
          <Card className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Адрес (слаг)"
              hint={`livsky.ru/blog/${meta.slug || '…'}`}
              value={meta.slug}
              onChange={(e) => {
                setSlugTouched(true)
                setMeta((m) => ({ ...m, slug: e.target.value.toLowerCase() }))
              }}
            />
            <Select label="Направление" options={TOPIC_OPTIONS} value={meta.topic} onChange={setMetaKey('topic')} />
            <DatePicker
              label="Дата публикации"
              value={meta.publishedAt}
              onChange={setMetaKey('publishedAt')}
              today={archiveDayKey()}
              hint="Дата в будущем — статья появится на сайте в этот день"
            />
            <div className="flex items-end">
              <Segmented label="Язык текста" options={LOCALES} value={locale} onChange={setLocale} />
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            {locale === 'en' && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-ink-3">
                Перевод необязателен: без него английская версия сайта покажет русский текст.
                {!texts.en.title && (
                  <Button size="sm" variant="secondary" onClick={() => setTexts((all) => ({ ...all, en: { ...all.ru } }))}>
                    Скопировать русский для перевода
                  </Button>
                )}
              </div>
            )}
            <Input label="Заголовок" required value={t.title} onChange={(e) => setText('title', e.target.value)} />
            <Textarea
              label="Анонс"
              rows={2}
              hint="Под заголовком и в карточке блога"
              value={t.excerpt}
              onChange={(e) => setText('excerpt', e.target.value)}
            />
            {!t.excerpt && parsed.intro && (
              <Button size="sm" variant="secondary" className="self-start -mt-2" onClick={() => setText('excerpt', parsed.intro)}>
                Взять вступление из текста
              </Button>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Рубрика" placeholder="Цены" value={t.category} onChange={(e) => setText('category', e.target.value)} />
              <Input label="Автор" value={t.author.name} onChange={(e) => setText('author', { ...t.author, name: e.target.value })} />
              <Input label="Кто автор" placeholder="сооснователь LIVSKY" value={t.author.role} onChange={(e) => setText('author', { ...t.author, role: e.target.value })} />
            </div>
            <Textarea
              label="Главное за 30 секунд"
              rows={3}
              hint="Каждый пункт с новой строки, до 6"
              value={t.takeaways.join('\n')}
              onChange={(e) => setText('takeaways', e.target.value.split('\n').slice(0, 6))}
              onBlur={() => setText('takeaways', t.takeaways.map((x) => x.trim()).filter(Boolean))}
            />
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="caption mr-1">Текст статьи</p>
              {SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => insert(s.text)}
                  className="h-8 rounded-full border border-line px-3 text-xs font-semibold text-ink-2 hover:bg-panel-2 hover:text-ink"
                >
                  + {s.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => imgInput.current?.click()}
                disabled={imgBusy}
                className="h-8 rounded-full accent-fill px-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                {imgBusy ? 'Загружаю…' : '+ Картинка'}
              </button>
              <input
                ref={imgInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  insertImage(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
            <textarea
              ref={bodyRef}
              value={t.body}
              onChange={(e) => setText('body', e.target.value)}
              onPaste={(e) => {
                // Картинку из буфера (скриншот) — сразу загружаем и вставляем
                const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
                if (file) {
                  e.preventDefault()
                  insertImage(file)
                }
              }}
              rows={24}
              spellCheck
              placeholder={'Вставьте текст статьи.\n\n## Первый раздел\nАбзац текста…\n\n## Второй раздел\n…'}
              className="w-full min-h-[420px] rounded-[16px] border border-line-2 bg-panel px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 font-mono"
            />
            <details className="text-sm text-ink-3">
              <summary className="cursor-pointer select-none">Как размечать текст</summary>
              <dl className="mt-2 grid gap-1 sm:grid-cols-[max-content_1fr] sm:gap-x-4">
                {ARTICLE_SYNTAX.map(([code, what]) => (
                  <div key={code} className="contents">
                    <dt className="font-mono text-ink-2">{code}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Card>

          <Card className="grid gap-5 sm:grid-cols-2">
            <MediaPicker
              label="Обложка"
              hint="16:9, для превью и соцсетей"
              accept="image/*"
              value={meta.cover}
              onChange={setMetaKey('cover')}
            />
            <MediaPicker
              label="Арт книжки в блоге"
              hint="4:5, без текста — название наберётся поверх"
              ratio="4 / 5"
              value={meta.bookCover}
              onChange={setMetaKey('bookCover')}
            />
          </Card>

          <Card className="flex flex-col gap-4">
            <p className="caption">SEO ({locale.toUpperCase()}) — необязательно</p>
            <Input label="Title для поиска" hint="Пусто — возьмём заголовок" value={t.seoTitle} onChange={(e) => setText('seoTitle', e.target.value)} />
            <Textarea
              label="Description для поиска"
              rows={2}
              hint="Пусто — возьмём анонс"
              value={t.seoDescription}
              onChange={(e) => setText('seoDescription', e.target.value)}
            />
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 self-start flex flex-col gap-3">
          <p className="caption">Предпросмотр · {locale.toUpperCase()}</p>
          {parsed.warnings.length > 0 && (
            <ul className="rounded-[16px] border border-warn/40 bg-warn-soft p-3 text-sm text-warn grid gap-1">
              {parsed.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
          <Card className="max-h-[calc(100dvh-120px)] overflow-y-auto">
            <ArticlePreview
              title={t.title}
              excerpt={t.excerpt}
              takeaways={t.takeaways.filter(Boolean)}
              sections={parsed.sections}
              readingMinutes={minutes}
            />
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title="Удалить статью?"
        text="Статья пропадёт с сайта и из CRM. Картинки останутся в медиатеке."
        confirmText="Удалить"
        onConfirm={async () => {
          setConfirmDelete(false)
          const res = await store.removePost(id)
          if (!res.ok) return setMsg({ ok: false, text: res.error })
          navigate('/site?tab=posts', { replace: true })
        }}
      />
    </div>
  )
}
