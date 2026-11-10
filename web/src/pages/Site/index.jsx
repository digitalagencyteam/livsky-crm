import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SERVICES, TOPICS } from '@shared/site.js'
import { useSiteStore } from '../../core/store/siteStore'
import { PageSection } from '../../widgets'
import { Badge, Button, EmptyState, Segmented, Spinner } from '../../shared/ui'

const TABS = [
  { value: 'posts', label: 'Статьи' },
  { value: 'cases', label: 'Кейсы' },
]
const topicTitle = Object.fromEntries(TOPICS.map((t) => [t.slug, t.title]))
const serviceTitle = Object.fromEntries(SERVICES.map((s) => [s.slug, s.title]))

function Status({ status }) {
  return status === 'published' ? <Badge tone="ok">На сайте</Badge> : <Badge>Черновик</Badge>
}

function Langs({ locales }) {
  return <span className="caption">{locales.includes('en') ? 'RU · EN' : 'RU'}</span>
}

function Thumb({ media }) {
  if (!media) return <span className="h-14 w-20 shrink-0 rounded-[12px] border border-line bg-panel" aria-hidden />
  const src = media.kind === 'video' ? media.poster : media.src
  return src ? (
    <img src={src} alt="" className="h-14 w-20 shrink-0 rounded-[12px] object-cover" />
  ) : (
    <span className="grid h-14 w-20 shrink-0 place-items-center rounded-[12px] border border-line text-xs text-ink-3">видео</span>
  )
}

/** Контент сайта: статьи блога и кейсы. Сохранили — сайт обновляется сам. */
export default function SitePage() {
  const { posts, cases, loading, error, fetchLists } = useSiteStore()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'posts'
  const navigate = useNavigate()

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  const isPosts = tab === 'posts'
  const list = isPosts ? posts : cases

  return (
    <PageSection
      pill="Сайт"
      title={isPosts ? 'Статьи блога' : 'Кейсы'}
      subtitle={
        isPosts
          ? 'Вставьте текст — статья соберётся по разделам сама: оглавление, цитаты, таблицы, советы и тесты.'
          : 'Кейс по шаблону сайта: заполните поля по порядку, приложите видео или картинки — страница соберётся сама.'
      }
      actions={
        <Button onClick={() => navigate(isPosts ? '/site/posts/new' : '/site/cases/new')}>
          {isPosts ? 'Новая статья' : 'Новый кейс'}
        </Button>
      }
    >
      <Segmented
        label="Раздел сайта"
        options={TABS.map((t) => ({ ...t, count: (t.value === 'posts' ? posts : cases).length }))}
        value={tab}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        className="self-start"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading && list.length === 0 ? (
        <div className="grid place-items-center py-14">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          label="Пока пусто"
          text={
            isPosts
              ? 'Напишите первую статью. Уже готовые статьи сайта можно перенести командой import:site — см. README.'
              : 'Добавьте первый кейс. Готовые кейсы сайта переносятся командой import:site.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((item) => (
            <Link
              key={item.id}
              to={`/site/${isPosts ? 'posts' : 'cases'}/${item.id}`}
              className="panel rounded-[20px] p-3 pr-5 flex items-center gap-4 transition hover:border-line-2"
            >
              <Thumb media={isPosts ? item.cover : item.media} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-semibold">{item.title}</span>
                <span className="truncate text-sm text-ink-3">
                  {isPosts
                    ? [item.category, topicTitle[item.topic], item.publishedAt].filter(Boolean).join(' · ')
                    : [item.client, item.metric?.value, item.serviceSlugs.map((s) => serviceTitle[s]).join(', ')]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
              </span>
              <span className="hidden sm:flex items-center gap-3">
                <Langs locales={item.locales} />
                <Status status={item.status} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageSection>
  )
}
