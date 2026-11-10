/** Размеры видео и кадр-заставка (первый кадр после 0,1 с) — прямо в браузере, до загрузки */
export function readVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.1, video.duration || 0)
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            poster: blob ? new File([blob], 'poster.webp', { type: 'image/webp' }) : null,
          })
        },
        'image/webp',
        0.85,
      )
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Браузер не смог прочитать видео — нужен MP4 (H.264) или WebM'))
    }
  })
}

/**
 * Загрузить картинку или видео и получить MediaAsset сайта:
 * { kind, src, alt, width, height, poster? }
 */
export async function uploadAsset(store, file, alt = '') {
  if (file.type.startsWith('video/')) {
    const { width, height, poster } = await readVideo(file)
    let posterUrl
    if (poster) {
      const p = await store.uploadMedia(poster)
      if (!p.ok) throw new Error(p.error)
      posterUrl = p.data.url
    }
    const v = await store.uploadMedia(file, { width, height })
    if (!v.ok) throw new Error(v.error)
    return { kind: 'video', src: v.data.url, alt, width, height, ...(posterUrl ? { poster: posterUrl } : {}) }
  }
  const res = await store.uploadMedia(file)
  if (!res.ok) throw new Error(res.error)
  return { kind: 'image', src: res.data.url, alt, width: res.data.width, height: res.data.height }
}
