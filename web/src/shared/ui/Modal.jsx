import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'
import { Button } from './Button'

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

/**
 * Прокрутку страницы под окнами держит счётчик открытых окон, а не каждое
 * окно по отдельности.
 *
 * Раньше окно запоминало прежнее значение overflow при открытии и
 * возвращало его при закрытии. Выглядело разумно, но ломалось на вложенных
 * окнах: onClose приходит новой функцией на каждую перерисовку страницы,
 * эффект из-за этого перезапускается, и «прежним» окно запоминало значение,
 * которое выставило другое окно поверх него. После закрытия обоих на body
 * оставался overflow: hidden, и страница переставала прокручиваться совсем.
 *
 * Со счётчиком порядок и количество перезапусков значения не имеют: первое
 * открытие блокирует, последнее закрытие возвращает как было.
 */
let openModals = 0
let savedOverflow = ''
let savedPadding = ''

function lockScroll() {
  openModals += 1
  if (openModals > 1) return

  savedOverflow = document.body.style.overflow
  savedPadding = document.body.style.paddingRight

  // В index.css у полосы прокрутки задана ширина, поэтому Chrome рисует её
  // занимающей место в раскладке, а не поверх содержимого. Убирая прокрутку
  // под окном, возвращаем эти пиксели отступом — без этого вся CRM заметно
  // прыгает вбок в момент открытия.
  const gap = window.innerWidth - document.documentElement.clientWidth
  document.body.style.overflow = 'hidden'
  if (gap > 0) document.body.style.paddingRight = `${gap}px`
}

function unlockScroll() {
  openModals = Math.max(0, openModals - 1)
  if (openModals > 0) return
  document.body.style.overflow = savedOverflow
  document.body.style.paddingRight = savedPadding
}

export function Modal({ open, onClose, title, size = 'md', closeOnOverlay = true, hideClose = false, footer, children }) {
  // Блокировка прокрутки зависит только от того, открыто окно или нет.
  // Держать её в одном эффекте с обработчиком Escape нельзя: тот зависит
  // от onClose, а он меняется на каждой перерисовке страницы.
  useEffect(() => {
    if (!open) return undefined
    lockScroll()
    return unlockScroll
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && !hideClose && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, hideClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-[#05061a]/55 backdrop-blur-[6px] animate-fade-in"
      onMouseDown={(e) => closeOnOverlay && !hideClose && e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cx(
          'flex w-full max-h-[calc(100dvh-2rem)] flex-col panel panel-solid rounded-card',
          'animate-modal-in',
          sizes[size],
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {!hideClose && (
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded-lg text-ink-3 hover:text-ink hover:bg-panel-2 transition-colors cursor-pointer"
              aria-label="Закрыть"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* relative: всплывающие панели внутри окна укладываются в его
            систему координат и прокручиваются вместе с содержимым. */}
        <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* flex-wrap: на телефоне три кнопки в ряд не помещаются и без
            переноса растягивали окно шире экрана. */}
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 px-6 pb-5 pt-1">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title = 'Вы уверены?', text, confirmText = 'Подтвердить', danger = false, loading = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmText}</Button>
        </>
      }
    >
      {text && <p className="text-sm text-ink-2 leading-relaxed">{text}</p>}
    </Modal>
  )
}
