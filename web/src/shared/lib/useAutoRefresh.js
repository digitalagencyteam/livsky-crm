import { useEffect, useRef } from 'react'

/**
 * Свежие данные без перезагрузки страницы: callback раз в interval, пока
 * вкладка браузера видна, и сразу, когда на неё вернулись. Открытые окна и
 * выбранные фильтры не сбрасываются: перезапрашиваются только данные.
 */
export function useAutoRefresh(callback, interval = 30000) {
  const ref = useRef(callback)
  ref.current = callback
  useEffect(() => {
    // Возврат на вкладку даёт сразу два события, focus и visibilitychange:
    // второе за пару секунд пропускаем, иначе запросы уходят дважды.
    let last = 0
    const run = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - last < 2000) return
      last = now
      ref.current()
    }
    const id = setInterval(run, interval)
    document.addEventListener('visibilitychange', run)
    window.addEventListener('focus', run)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('focus', run)
    }
  }, [interval])
}
