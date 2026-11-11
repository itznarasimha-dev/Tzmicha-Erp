import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'wide' | 'xl'
  closeOnOverlay?: boolean
  hideClose?: boolean
}

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'modal-panel--sm',
  md: '',
  wide: 'modal-panel--wide',
  xl: 'modal-panel--xl',
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  hideClose = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()
  const reducedMotion = useReducedMotion()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (focusables.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    document.body.classList.add('modal-open')
    window.addEventListener('keydown', handleKeyDown)
    const timer = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
      )
      ;(focusable ?? panel).focus()
    }, 60)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(timer)
      previousFocus.current?.focus?.()
    }
  }, [open, handleKeyDown])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.16 }}
        >
          <motion.div
            className="modal-overlay"
            onClick={closeOnOverlay ? onClose : undefined}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.16 }}
            style={{ animation: 'none' }}
          />
          <motion.div
            ref={panelRef}
            className={`modal-panel ${sizeClass[size]}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ animation: 'none' }}
          >
            <div className="modal-header">
              <div style={{ minWidth: 0 }}>
                <h2 id={titleId}>{title}</h2>
                {description ? <p id={descId}>{description}</p> : null}
              </div>
              {!hideClose ? (
                <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
                  <X size={18} />
                </button>
              ) : null}
            </div>
            <div className="modal-body">{children}</div>
            {footer ? <div className="modal-footer">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
