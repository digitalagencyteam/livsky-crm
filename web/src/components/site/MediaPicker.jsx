import { useRef, useState } from 'react'
import { useSiteStore } from '../../core/store/siteStore'
import { Button, Input, Spinner } from '../../shared/ui'
import { uploadAsset } from './media'

/**
 * Картинка или видео для сайта: превью, загрузка, подпись (alt), убрать.
 * value — MediaAsset сайта или null.
 */
export function MediaPicker({ label, hint, value, onChange, accept = 'image/*,video/mp4,video/webm', ratio = '16 / 9' }) {
  const store = useSiteStore()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function take(file) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadAsset(store, file, value?.alt ?? ''))
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="caption">{label}</p>
      <div
        className="relative grid place-items-center overflow-hidden rounded-[18px] border border-dashed border-line-2 bg-panel"
        style={{ aspectRatio: ratio }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          take(e.dataTransfer.files?.[0])
        }}
      >
        {busy ? (
          <Spinner />
        ) : value ? (
          value.kind === 'video' ? (
            <video src={value.src} poster={value.poster} muted loop autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <img src={value.src} alt={value.alt} className="h-full w-full object-cover" />
          )
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="px-4 text-center text-sm text-ink-3 hover:text-ink">
            Перетащите файл или нажмите
            <span className="block text-xs mt-1">{hint}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          take(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {value && (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="min-w-[160px] flex-1"
            size="sm"
            placeholder="Описание для незрячих (alt)"
            value={value.alt}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
            Заменить
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            Убрать
          </Button>
        </div>
      )}
      {value && <p className="caption">{value.kind === 'video' ? 'Видео' : 'Картинка'} {value.width}×{value.height}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
