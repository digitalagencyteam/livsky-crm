import { useRef, useState } from 'react'
import { cx } from '../lib/cx'
import { fileSize } from '../../utils/files'

/**
 * Поле для файла: перетащить или выбрать. Проверка типа и размера — сразу, до загрузки;
 * настоящую проверку всё равно делает сервер.
 */
export function FileDrop({ accept, maxMb, file, onFile, onError, title = 'Перетащите файл сюда', hint, check }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function take(picked) {
    if (!picked) return
    const problem = check?.(picked) || (maxMb && picked.size > maxMb * 1024 * 1024 ? `Файл больше ${maxMb} МБ` : null)
    if (problem) return onError?.(problem)
    onError?.(null)
    onFile(picked)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        take(e.dataTransfer.files?.[0])
      }}
      onClick={() => inputRef.current?.click()}
      className={cx(
        'flex cursor-pointer flex-col items-center gap-1.5 rounded-[18px] border border-dashed px-4 py-6 text-center transition-colors',
        dragging ? 'border-accent bg-accent-soft' : 'border-line-2 hover:border-accent hover:bg-panel-2',
      )}
    >
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
      {file ? (
        <>
          <p className="max-w-full truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-ink-3">{fileSize(file.size)} · нажмите, чтобы выбрать другой</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-ink-3">{hint}</p>
        </>
      )}
    </div>
  )
}
