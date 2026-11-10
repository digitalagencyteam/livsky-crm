/**
 * Предпросмотр статьи — те же разделы, что получит сайт. Интерактив показан упрощённо:
 * на сайте калькуляторы, тесты и чек-листы живые.
 */
function Block({ block }) {
  if (block.type === 'callout') {
    return (
      <aside
        className={`rounded-[16px] border p-4 ${block.tone === 'tip' ? 'border-accent/40 bg-accent-soft' : 'border-warn/40 bg-warn-soft'}`}
      >
        <p className="caption">{block.tone === 'tip' ? 'Совет' : 'Важно'}</p>
        <p className="font-semibold mt-1">{block.title}</p>
        <p className="text-sm text-ink-2 mt-1">{block.text}</p>
      </aside>
    )
  }
  if (block.type === 'checklist') {
    return (
      <div className="rounded-[16px] border border-line p-4">
        <p className="font-semibold">{block.title}</p>
        <ul className="mt-2 grid gap-1.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2 text-sm">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border border-line-2" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (block.type === 'quiz') {
    return (
      <div className="rounded-[16px] border border-line p-4">
        <p className="caption">Мини-тест</p>
        <p className="font-semibold mt-1">{block.question}</p>
        <ul className="mt-2 grid gap-1.5">
          {block.options.map((o, i) => (
            <li key={o.text} className={`rounded-[12px] border px-3 py-2 text-sm ${o.correct ? 'border-ok/50 text-ok' : 'border-line'}`}>
              {String.fromCharCode(65 + i)}. {o.text}
            </li>
          ))}
        </ul>
        {block.explanation && <p className="text-sm text-ink-3 mt-2">{block.explanation}</p>}
      </div>
    )
  }
  return (
    <div className="rounded-[16px] border border-dashed border-line-2 p-4">
      <p className="caption">Интерактивный блок «{block.type}»</p>
      <p className="text-sm text-ink-3 mt-1">{block.title || block.question || 'Покажется на сайте'}</p>
    </div>
  )
}

export function ArticlePreview({ title, excerpt, takeaways, sections, readingMinutes }) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl">{title || 'Без заголовка'}</h1>
        {excerpt && <p className="text-ink-2">{excerpt}</p>}
        <p className="caption">{readingMinutes} мин чтения · {sections.length} разд.</p>
      </header>

      {takeaways.length > 0 && (
        <aside className="rounded-[18px] accent-fill p-4">
          <p className="caption !text-white">Главное за 30 секунд</p>
          <ol className="mt-2 grid gap-1.5 list-decimal pl-5 text-sm">
            {takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </aside>
      )}

      {sections.map((s, i) => (
        <section key={s.id} className="flex flex-col gap-3">
          <h2 className="font-display text-lg">
            <span className="text-ink-3 mr-2 tabular">{String(i + 1).padStart(2, '0')}</span>
            {s.title}
          </h2>
          {s.paragraphs.map((p, k) => (
            <p key={k} className="text-[15px] leading-relaxed text-ink-2">
              {p}
            </p>
          ))}
          {s.images?.map((img) => (
            <figure key={img.src} className="flex flex-col gap-1">
              <img src={img.src} alt={img.alt} className="w-full rounded-[16px]" />
              {img.alt && <figcaption className="caption">{img.alt}</figcaption>}
            </figure>
          ))}
          {s.table && (
            <div className="overflow-x-auto rounded-[14px] border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {s.table.head.map((h) => (
                      <th key={h} className="px-3 py-2 text-left caption">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r, k) => (
                    <tr key={k} className="border-t border-line">
                      {r.map((c, j) => (
                        <td key={j} className="px-3 py-2">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.quote && (
            <blockquote className="border-l-2 border-accent pl-4">
              <p className="italic">«{s.quote.text}»</p>
              {s.quote.author && <p className="caption mt-1">{s.quote.author}</p>}
            </blockquote>
          )}
          {s.blocks?.map((b, k) => (
            <Block key={k} block={b} />
          ))}
        </section>
      ))}
    </article>
  )
}
