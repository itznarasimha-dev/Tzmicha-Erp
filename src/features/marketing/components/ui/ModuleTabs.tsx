import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react'
import type { MarketingModule } from '../../config/navigation'

interface ModuleTabsProps {
  module: MarketingModule
  activeTab: string
}

export function ModuleTabs({ module, activeTab }: ModuleTabsProps) {
  const reducedMotion = useReducedMotion()
  const scroller = useRef<HTMLDivElement>(null)
  const activeLink = useRef<HTMLAnchorElement>(null)
  const [scrollState, setScrollState] = useState({ left: false, right: false, overflow: false })

  const updateScrollState = () => {
    const container = scroller.current
    if (!container) return
    const max = Math.max(0, container.scrollWidth - container.clientWidth)
    setScrollState({
      left: container.scrollLeft > 4,
      right: container.scrollLeft < max - 4,
      overflow: max > 4,
    })
  }

  useEffect(() => {
    updateScrollState()
    const container = scroller.current
    if (!container) return
    container.addEventListener('scroll', updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(container)
    window.addEventListener('resize', updateScrollState)
    return () => {
      container.removeEventListener('scroll', updateScrollState)
      observer.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [])

  useEffect(() => {
    const container = scroller.current
    const link = activeLink.current
    if (!container || !link) return

    const frame = window.requestAnimationFrame(() => {
      const target = link.offsetLeft - container.clientWidth / 2 + link.clientWidth / 2
      container.scrollTo({
        left: Math.max(0, target),
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeTab, reducedMotion, scrollState.overflow])

  const scrollByDirection = (direction: -1 | 1) => {
    const container = scroller.current
    if (!container) return
    container.scrollBy({
      left: direction * Math.max(190, container.clientWidth * 0.62),
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  if (!module.tabs.length) return null

  return (
    <nav
      className={[
        'module-tabs-shell',
        scrollState.overflow ? 'has-overflow' : '',
        scrollState.left ? 'has-overflow-left' : '',
        scrollState.right ? 'has-overflow-right' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${module.label} sections`}
    >
      <div className="module-tabs" ref={scroller}>
        {module.tabs.map((tab) => {
          const isActive = tab.id === activeTab
          const Icon = tab.icon ?? Circle
          return (
            <Link
              key={tab.id}
              ref={isActive ? activeLink : undefined}
              to={`${module.path}/${tab.id}`}
              className={`module-tab ${isActive ? 'is-active' : ''}`.trim()}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive ? (
                <motion.span
                  layoutId={`module-tab-indicator-${module.id}`}
                  className="module-tab__indicator"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 36, mass: 0.7 }
                  }
                  aria-hidden="true"
                />
              ) : null}
              <span className="module-tab__inner">
                <span className="module-tab__icon" aria-hidden="true">
                  <Icon size={13} strokeWidth={2} />
                </span>
                <span className="module-tab__label">{tab.label}</span>
              </span>
            </Link>
          )
        })}
      </div>
      {scrollState.left ? (
        <button
          type="button"
          className="module-tabs__nav module-tabs__nav--left"
          onClick={() => scrollByDirection(-1)}
          aria-label="Scroll sections left"
        >
          <ChevronLeft size={14} />
        </button>
      ) : null}
      {scrollState.right ? (
        <button
          type="button"
          className="module-tabs__nav module-tabs__nav--right"
          onClick={() => scrollByDirection(1)}
          aria-label="Scroll sections right"
        >
          <ChevronRight size={14} />
        </button>
      ) : null}
    </nav>
  )
}
