import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GLASS_ICONS, SERVICES, slugify } from '@shared/site.js'
import { useSiteStore } from '../../core/store/siteStore'
import { Button, Card, ConfirmModal, Input, Segmented, Select, Spinner, Textarea } from '../../shared/ui'
import { cx } from '../../shared/lib/cx'
import { MediaPicker } from '../../components/site/MediaPicker'

const LOCALES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]
const ICON_OPTIONS = GLASS_ICONS.map((i) => ({ value: i, label: i }))
const fact = () => ({ value: '', label: '', note: '' })

/** Пустой кейс по шаблону страницы кейса сайта (v7) */
const emptyCase = () => ({
  title: '',
  client: '',
  excerpt: '',
  category: '',
  metric: { value: '', label: '' },
  tags: [],
  details: {
    h1: '',
    seoTitle: '',
    seoDescription: '',
    about: '',
    task: '',
    services: '',
    term: '',
    result: '',
    brief: { task: '', solution: '' },
    problemTitle: '',
    problemText: '',
    before: { headline: '', stats: [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }] },
    strategy: [{ icon: 'strategy', title: '', text: '' }],
    results: { main: fact(), speed: fact(), goal: fact() },
    screens: [],
    quote: { text: '', author: '', role: '' },
  },
})

// Слить сохранённое с пустым шаблоном: в старых записях может не быть новых полей
function withDefaults(data) {
  const e = emptyCase()
  if (!data) return e
  return { ...e, ...data, metric: { ...e.metric, ...data.metric }, details: { ...e.details, ...data.details } }
}

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
function setIn(obj, path, value) {
  const [k, ...rest] = path.split('.')
  if (!rest.length) return { ...obj, [k]: value }
  return { ...obj, [k]: setIn(obj?.[k] ?? {}, rest.join('.'), value) }
}

function Section({ title, hint, children }) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="font-semibold">{title}</p>
        {hint && <p className="text-sm text-ink-3 mt-0.5">{hint}</p>}
      </div>
      {children}
    </Card>
  )
}

/**
 * Кейс по шаблону сайта: поля идут в том же порядке, что блоки на странице кейса.
 * Заполнили — страница собирается сама. Видео и картинки грузятся прямо здесь.
 */
export default function CaseEditorPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const store = useSiteStore()

  const [loading, setLoading] = useState(!isNew)
  const [locale, setLocale] = useState('ru')
  const [meta, setMeta] = useState({
    slug: '',
    status: 'draft',
    projectStatus: 'live',
    year: new Date().getFullYear(),
    serviceSlugs: [],
    domain: '',
    media: null,
    sortOrder: 0,
  })
  const [texts, setTexts] = useState({ ru: emptyCase(), en: emptyCase() })
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (isNew) return
    store.getCase(id).then((res) => {
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      const { translations, ...c } = res.data
      setMeta({
        slug: c.slug,
        status: c.status,
        projectStatus: c.projectStatus,
        year: c.year,
        serviceSlugs: c.serviceSlugs,
        domain: c.domain,
        media: c.media,
        sortOrder: c.sortOrder,
      })
      setTexts({ ru: withDefaults(translations.ru), en: withDefaults(translations.en) })
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!slugTouched) setMeta((m) => ({ ...m, slug: slugify(texts.ru.client || texts.ru.title) }))
  }, [texts.ru.client, texts.ru.title, slugTouched])

  const d = texts[locale]
  const val = (path) => get(d, path) ?? ''
  const put = (path, value) => setTexts((all) => ({ ...all, [locale]: setIn(all[locale], path, value) }))
  const bind = (path) => ({ value: val(path), onChange: (e) => put(path, e.target.value) })

  function listPut(path, index, patch) {
    put(path, val(path).map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function toggleService(slug) {
    setMeta((m) => ({
      ...m,
      serviceSlugs: m.serviceSlugs.includes(slug) ? m.serviceSlugs.filter((s) => s !== slug) : [...m.serviceSlugs, slug],
    }))
  }

  // Пустые строки статистики и стратегии не уходят на сайт
  function clean(data) {
    if (!data) return null
    const det = data.details
    return {
      ...data,
      tags: data.tags.map((t) => t.trim()).filter(Boolean),
      details: {
        ...det,
        before: { ...det.before, stats: det.before.stats.filter((s) => s.value || s.label) },
        strategy: det.strategy.filter((s) => s.title || s.text),
        screens: det.screens.filter((s) => s.title || s.path || s.image),
      },
    }
  }

  async function save(status = meta.status) {
    setBusy(true)
    setMsg(null)
    const body = {
      ...meta,
      year: Number(meta.year),
      sortOrder: Number(meta.sortOrder) || 0,
      status,
      translations: { ru: clean(texts.ru), en: texts.en.title ? clean(texts.en) : null },
    }
    const res = await store.saveCase(isNew ? null : id, body)
    setBusy(false)
    if (!res.ok) return setMsg({ ok: false, text: res.error })
    setMeta((m) => ({ ...m, status }))
    setMsg({ ok: true, text: status === 'published' ? 'Опубликовано — сайт обновится в течение минуты.' : 'Черновик сохранён.' })
    if (isNew) navigate(`/site/cases/${res.data.id}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-[980px]">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/site?tab=cases')}>
          ← Кейсы
        </Button>
        <h1 className="font-display text-xl mr-auto">{isNew ? 'Новый кейс' : texts.ru.title || 'Кейс'}</h1>
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

      <Section title="Проект" hint="Общее для обоих языков">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Адрес (слаг)"
            hint={`livsky.ru/cases/${meta.slug || '…'}`}
            value={meta.slug}
            onChange={(e) => {
              setSlugTouched(true)
              setMeta((m) => ({ ...m, slug: e.target.value.toLowerCase() }))
            }}
          />
          <Input label="Год" type="number" value={meta.year} onChange={(e) => setMeta((m) => ({ ...m, year: e.target.value }))} />
          <Select
            label="Статус проекта"
            options={[
              { value: 'live', label: 'Запущен' },
              { value: 'in-progress', label: 'В работе' },
            ]}
            value={meta.projectStatus}
            onChange={(e) => setMeta((m) => ({ ...m, projectStatus: e.target.value }))}
          />
          <Input label="Сайт клиента" placeholder="burger.ru" value={meta.domain} onChange={(e) => setMeta((m) => ({ ...m, domain: e.target.value }))} />
          <Input
            label="Порядок в списке"
            type="number"
            hint="Меньше — выше"
            value={meta.sortOrder}
            onChange={(e) => setMeta((m) => ({ ...m, sortOrder: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="caption">Услуги в кейсе — по ним кейс покажется на страницах услуг</p>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button
                key={s.slug}
                type="button"
                aria-pressed={meta.serviceSlugs.includes(s.slug)}
                onClick={() => toggleService(s.slug)}
                className={cx(
                  'h-9 rounded-full px-4 text-sm font-semibold border transition',
                  meta.serviceSlugs.includes(s.slug) ? 'accent-fill border-transparent text-white' : 'border-line text-ink-2 hover:bg-panel-2',
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
        <div className="max-w-[560px]">
        <MediaPicker
          label="Видео или картинка кейса (16:9)"
          hint="MP4 без звука или картинка 1600×900. Показывается в карточке и на странице кейса"
          value={meta.media}
          onChange={(media) => setMeta((m) => ({ ...m, media }))}
        />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Язык текстов" options={LOCALES} value={locale} onChange={setLocale} />
        {locale === 'en' && !texts.en.title && (
          <Button size="sm" variant="secondary" onClick={() => setTexts((all) => ({ ...all, en: structuredClone(all.ru) }))}>
            Скопировать русский для перевода
          </Button>
        )}
        {locale === 'en' && <p className="text-sm text-ink-3">Без перевода английская версия покажет русский текст.</p>}
      </div>

      <Section title="Карточка кейса" hint="В списке кейсов и в карусели на главной">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Название" required placeholder="Сеть бургерных" {...bind('title')} />
          <Input label="Клиент" required placeholder="Бургер Бро" {...bind('client')} />
          <Input label="Направление" required placeholder="Разработка" {...bind('category')} />
          <Input
            label="Теги"
            hint="Через запятую"
            value={val('tags').join(', ')}
            onChange={(e) => put('tags', e.target.value.split(','))}
          />
          <Input label="Главная цифра" required placeholder="+120%" {...bind('metric.value')} />
          <Input label="Подпись цифры" placeholder="заявок за месяц" {...bind('metric.label')} />
        </div>
        <Textarea label="Коротко о кейсе" required rows={2} {...bind('excerpt')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea label="Задача — коротко" rows={2} {...bind('details.brief.task')} />
          <Textarea label="Решение — коротко" rows={2} {...bind('details.brief.solution')} />
        </div>
      </Section>

      <Section title="Первый экран страницы" hint="Заголовок с результатом и факты">
        <Input label="Заголовок H1" required placeholder="Сайт для франшизы бургерных: +120% заявок за месяц" {...bind('details.h1')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="О клиенте" placeholder="Сеть из 12 бургерных" {...bind('details.about')} />
          <Input label="Задача" required {...bind('details.task')} />
          <Input label="Что делали" placeholder="Сайт, SEO, реклама" {...bind('details.services')} />
          <Input label="Срок" placeholder="6 недель" {...bind('details.term')} />
        </div>
        <Input label="Результат" required {...bind('details.result')} />
      </Section>

      <Section title="Проблема" hint="Что было до нас">
        <Input label="Заголовок" {...bind('details.problemTitle')} />
        <Textarea label="Текст" rows={4} {...bind('details.problemText')} />
        <Input label="Сайт «до»: заголовок" {...bind('details.before.headline')} />
        <div className="grid gap-3 sm:grid-cols-3">
          {val('details.before.stats').map((s, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Input
                size="sm"
                placeholder="0,8%"
                aria-label={`Цифра «до» ${i + 1}`}
                value={s.value}
                onChange={(e) => listPut('details.before.stats', i, { value: e.target.value })}
              />
              <Input
                size="sm"
                placeholder="конверсия"
                aria-label={`Подпись цифры «до» ${i + 1}`}
                value={s.label}
                onChange={(e) => listPut('details.before.stats', i, { label: e.target.value })}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Стратегия" hint="Шаги решения — до 6, у каждого стеклянная иконка">
        {val('details.strategy').map((s, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[150px_1fr_auto] items-start rounded-[16px] border border-line p-3">
            <Select options={ICON_OPTIONS} value={s.icon} onChange={(e) => listPut('details.strategy', i, { icon: e.target.value })} aria-label="Иконка" />
            <div className="flex flex-col gap-2">
              <Input size="sm" placeholder="Заголовок шага" value={s.title} onChange={(e) => listPut('details.strategy', i, { title: e.target.value })} />
              <Textarea rows={2} placeholder="Что сделали" value={s.text} onChange={(e) => listPut('details.strategy', i, { text: e.target.value })} />
            </div>
            <Button size="sm" variant="ghost" onClick={() => put('details.strategy', val('details.strategy').filter((_, k) => k !== i))}>
              Убрать
            </Button>
          </div>
        ))}
        {val('details.strategy').length < 6 && (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => put('details.strategy', [...val('details.strategy'), { icon: 'rocket', title: '', text: '' }])}
          >
            + Шаг
          </Button>
        )}
      </Section>

      <Section title="Результаты" hint="Три цифры: главный результат, скорость и цель">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['main', 'Главный'],
            ['speed', 'Скорость'],
            ['goal', 'Цель'],
          ].map(([key, title]) => (
            <div key={key} className="flex flex-col gap-2 rounded-[16px] border border-line p-3">
              <p className="caption">{title}</p>
              <Input size="sm" placeholder="+120%" {...bind(`details.results.${key}.value`)} />
              <Input size="sm" placeholder="заявок" {...bind(`details.results.${key}.label`)} />
              <Input size="sm" placeholder="пояснение" {...bind(`details.results.${key}.note`)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Как это выглядит" hint="Экраны сайта клиента — до 3, у каждого скриншот или пусто (будет стеклянная рамка)">
        {val('details.screens').map((s, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[240px_1fr] rounded-[16px] border border-line p-3">
            <MediaPicker
              label={`Экран ${i + 1}`}
              hint="Скриншот 16:10"
              ratio="16 / 10"
              accept="image/*"
              value={s.image ?? null}
              onChange={(image) => listPut('details.screens', i, { image: image ?? undefined })}
            />
            <div className="flex flex-col gap-2">
              <Input size="sm" label="Название экрана" placeholder="Главная" value={s.title} onChange={(e) => listPut('details.screens', i, { title: e.target.value })} />
              <Input size="sm" label="Путь" placeholder="/menu" value={s.path} onChange={(e) => listPut('details.screens', i, { path: e.target.value })} />
              <Button size="sm" variant="ghost" className="self-start" onClick={() => put('details.screens', val('details.screens').filter((_, k) => k !== i))}>
                Убрать экран
              </Button>
            </div>
          </div>
        ))}
        {val('details.screens').length < 3 && (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => put('details.screens', [...val('details.screens'), { path: '/', title: '', headline: '', cta: '' }])}
          >
            + Экран
          </Button>
        )}
      </Section>

      <Section title="Отзыв клиента">
        <Textarea label="Текст" rows={3} {...bind('details.quote.text')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Автор" {...bind('details.quote.author')} />
          <Input label="Должность" {...bind('details.quote.role')} />
        </div>
      </Section>

      <Section title="SEO" hint="Необязательно: пусто — возьмём заголовок и описание">
        <Input label="Title" {...bind('details.seoTitle')} />
        <Textarea label="Description" rows={2} {...bind('details.seoDescription')} />
      </Section>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title="Удалить кейс?"
        text="Кейс пропадёт с сайта и из CRM. Видео и картинки останутся в медиатеке."
        confirmText="Удалить"
        onConfirm={async () => {
          setConfirmDelete(false)
          const res = await store.removeCase(id)
          if (!res.ok) return setMsg({ ok: false, text: res.error })
          navigate('/site?tab=cases', { replace: true })
        }}
      />
    </div>
  )
}
