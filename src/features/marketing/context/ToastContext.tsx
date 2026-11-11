import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface ToastInput {
  title: string
  description?: string
  tone?: ToastTone
}

interface ToastItem extends ToastInput {
  id: string
  tone: ToastTone
}

interface ToastContextValue {
  pushToast: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const pushToast = useCallback(
    (input: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const toast: ToastItem = { ...input, id, tone: input.tone ?? 'info' }
      setToasts((current) => [...current.slice(-3), toast])
      const timer = window.setTimeout(() => dismiss(id), 4800)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer))
      activeTimers.clear()
    }
  }, [])

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone]
          return (
            <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
              <Icon size={18} aria-hidden="true" className="toast__icon" />
              <div className="toast__body">
                <p className="toast__title">{toast.title}</p>
                {toast.description ? <p className="toast__description">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                className="toast__close"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
