import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Всплывающая панель, привязанная к полю: календарь, выпадающий список.
 *
 * Главное здесь — панель никогда не догоняет поле кодом.
 *
 * Раньше она стояла в координатах экрана (position: fixed), а её положение
 * пересчитывалось на прокрутку. Браузер двигает страницу на своём потоке, а
 * код выполняется после, поэтому панель отставала на кадр-другой: при живой
 * прокрутке зазор в 6 пикселей раздувался до тридцати, и панель заметно
 * плавала вслед за полем.
 *
 * Теперь она лежит в обычном потоке — absolute внутри того же контейнера,
 * который прокручивается вместе с полем. При прокрутке её координаты не
 * меняются вовсе, и двигает её браузер, а не мы. Отставать нечему.
 *
 * Пересчёт остаётся только для перестроек страницы: пришли данные, сменился
 * режим, изменился размер окна. Там счёт идёт на разы, а не на кадры.
 */

/**
 * Ближайший предок, который прокручивает или обрезает содержимое.
 *
 * Смотрим на стиль, а не на то, переполнен ли он прямо сейчас. Окно с одной
 * услугой в форму помещается, а с тремя — уже нет: если выбрать контейнер по
 * текущему переполнению, панель в первом случае уедет в тело страницы и
 * отвяжется от поля, стоит форме подрасти.
 */
function scrollParent(node) {
  let el = node?.parentElement
  while (el && el !== document.body) {
    const { overflowY, overflowX } = getComputedStyle(el)
    const scrolls = (v) => v === 'auto' || v === 'scroll' || v === 'hidden' || v === 'overlay'
    if (scrolls(overflowY) || scrolls(overflowX)) return el
    el = el.parentElement
  }
  return null
}

export function useAnchoredPanel({ width, height = 280, gap = 6 } = {}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const boxRef = useRef(null)
  const panelRef = useRef(null)
  const posRef = useRef(null)
  const hostRef = useRef(null)

  // Сторону выбираем при открытии и больше не меняем: переворот на ходу —
  // это тоже прыжок. Не хватает места — панель сжимается и прокручивается
  // внутри себя.
  const side = useRef('below')

  const measure = useCallback(() => {
    const box = boxRef.current
    const host = hostRef.current
    if (!box || !host) return null

    const r = box.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) return 'gone'

    const w = width ?? r.width
    const room = side.current === 'below'
      ? window.innerHeight - r.bottom - gap - 8
      : r.top - gap - 8
    const maxHeight = Math.max(120, Math.min(height, room))

    // Координаты внутри контейнера, а не экрана: при его прокрутке они
    // остаются прежними, и панель едет вместе с полем сама собой.
    if (host === document.body) {
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + window.scrollX
      const top = (side.current === 'below' ? r.bottom + gap : r.top - maxHeight - gap) + window.scrollY
      return { left: Math.round(left), top: Math.round(top), width: Math.round(w), maxHeight: Math.round(maxHeight) }
    }

    const h = host.getBoundingClientRect()
    const left = Math.max(0, Math.min(r.left - h.left, host.clientWidth - w)) + host.scrollLeft
    const top = (side.current === 'below' ? r.bottom - h.top + gap : r.top - h.top - maxHeight - gap) + host.scrollTop
    return { left: Math.round(left), top: Math.round(top), width: Math.round(w), maxHeight: Math.round(maxHeight) }
  }, [width, height, gap])

  useEffect(() => {
    if (!open) { setPos(null); posRef.current = null; hostRef.current = null; return undefined }

    hostRef.current = scrollParent(boxRef.current) || document.body

    const r = boxRef.current?.getBoundingClientRect()
    side.current = r && window.innerHeight - r.bottom < height && r.top >= height ? 'above' : 'below'

    const sync = () => {
      const next = measure()
      if (next === 'gone') { setOpen(false); return }
      if (!next) return
      const prev = posRef.current
      if (!prev || prev.top !== next.top || prev.left !== next.left
        || prev.width !== next.width || prev.maxHeight !== next.maxHeight) {
        posRef.current = next
        setPos(next)
      }
    }

    sync()

    // Перестройка страницы события не рождает, поэтому следим за размерами
    // поля и контейнера. Прокрутка сюда не относится — она ничего не меняет.
    const observer = new ResizeObserver(sync)
    if (boxRef.current) observer.observe(boxRef.current)
    observer.observe(document.documentElement)
    if (hostRef.current !== document.body) observer.observe(hostRef.current)

    // Страховка на случаи, которые наблюдатель не видит: перенос строки в
    // соседнем блоке, смена шрифта, анимация раскрытия.
    const timer = setInterval(sync, 250)

    return () => { observer.disconnect(); clearInterval(timer) }
  }, [open, measure, height])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (boxRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    // Escape гасим до всплытия: иначе он закрыл бы заодно и модальное окно,
    // в котором стоит поле.
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return { open, setOpen, pos, boxRef, panelRef, host: hostRef.current }
}
