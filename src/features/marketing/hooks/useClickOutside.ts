import { useEffect, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutside: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return
    const handler = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target || !ref.current || ref.current.contains(target)) return
      onOutside()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [ref, onOutside, active])
}

export function useEscape(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEscape, active])
}
