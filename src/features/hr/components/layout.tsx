import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, Bell, BriefcaseBusiness, CalendarCheck, CalendarDays, ChevronDown, ChevronLeft,
  Command, FileSignature, HelpCircle, LayoutDashboard, LogOut, Menu, MessageSquareText, Moon,
  PanelLeftClose, PanelLeftOpen, Receipt, RotateCcw, Search, Settings2, Sparkles, Sun, Target, User,
  UserMinus, UserPlus, Users, Wallet, X, CheckCheck,
} from 'lucide-react'
import { useStore, useTheme } from '../store'
import { useHrAccess } from '../lib/access'
import type { Employee } from '../types'
import { cn, fullName, relativeTime } from '../lib/utils'
import { Avatar, Badge, Button, ConfirmDialog, IconButton, Kbd } from './ui'

type NavItem = { label: string; to: string; icon: React.ComponentType<{ className?: string }>; badge?: number; accessId: string }

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'My Dashboard', to: '/', icon: LayoutDashboard, accessId: 'dashboard' },
      { label: 'Employees', to: '/employees', icon: Users, accessId: 'employees' },
      { label: 'Attendance', to: '/attendance', icon: CalendarCheck, accessId: 'attendance' },
      { label: 'Leave Management', to: '/leave', icon: CalendarDays, accessId: 'leave' },
    ],
  },
  {
    title: 'Talent',
    items: [
      { label: 'Recruitment', to: '/recruitment', icon: BriefcaseBusiness, accessId: 'recruitment' },
      { label: 'Onboarding', to: '/onboarding', icon: UserPlus, accessId: 'onboarding' },
      { label: 'Performance', to: '/performance', icon: Target, accessId: 'performance' },
    ],
  },
  {
    title: 'Finance & Legal',
    items: [
      { label: 'Payroll', to: '/payroll', icon: Wallet, accessId: 'payroll' },
      { label: 'Contracts', to: '/contracts', icon: FileSignature, accessId: 'contracts' },
      { label: 'Daily Payments', to: '/payments', icon: Wallet, accessId: 'payments' },
      { label: 'HR Expenses', to: '/expenses', icon: Receipt, accessId: 'expenses' },
    ],
  },
  {
    title: 'People Ops',
    items: [
      { label: 'Employee Requests', to: '/requests', icon: MessageSquareText, accessId: 'requests' },
      { label: 'Offboarding', to: '/offboarding', icon: UserMinus, accessId: 'offboarding' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports & Analytics', to: '/reports', icon: BarChart3, accessId: 'reports' },
      { label: 'HR Settings', to: '/settings', icon: Settings2, accessId: 'settings' },
    ],
  },
]

const allPages = navSections.flatMap((s) => s.items).concat([{ label: 'Employee Profile', to: '/employees', icon: Users, accessId: 'employees' }])

function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onOutside])
  return ref
}

export function AppLayout() {
  const { db, update, resetDemo, toast } = useStore()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const access = useHrAccess()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('titan-hr-sidebar') === 'collapsed')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const searchRef = useClickOutside<HTMLDivElement>(() => setSearchOpen(false))
  const notifRef = useClickOutside<HTMLDivElement>(() => setNotifOpen(false))
  const profileRef = useClickOutside<HTMLDivElement>(() => setProfileOpen(false))
  const searchInput = useRef<HTMLInputElement>(null)

  const pendingLeave = db.leaves.filter((l) => l.status === 'Pending').length
  const pendingPayments = db.payments.filter((p) => p.approvalStatus === 'Pending' || p.paymentStatus === 'Pending' || p.paymentStatus === 'Overdue').length
  const openRequests = db.requests.filter((r) => r.status === 'Open' || r.status === 'In Progress').length
  const unread = db.notifications.filter((n) => !n.read).length

  const badges: Record<string, number> = {
    '/leave': pendingLeave,
    '/payments': pendingPayments,
    '/requests': openRequests,
  }

  // The same permission model used by the primary HR portal layout decides
  // which modules this sidebar may show.
  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({ ...section, items: section.items.filter((item) => access.canAccess(item.accessId)) }))
        .filter((section) => section.items.length > 0),
    [access],
  )

  const accessiblePages = useMemo(
    () => allPages.filter((page) => access.canAccess(page.accessId)),
    [access],
  )

  useEffect(() => {
    localStorage.setItem('titan-hr-sidebar', collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
    setNotifOpen(false)
    setProfileOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInput.current?.focus()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearch('')
        setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const pages = accessiblePages.filter((p) => p.label.toLowerCase().includes(q)).filter((p, i, arr) => arr.findIndex((x) => x.to === p.to) === i).slice(0, 4)
    if (!q) return { pages: accessiblePages.slice(0, 5), employees: [] as Employee[] }
    return {
      pages,
      employees: db.employees
        .filter((e) => fullName(e).toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q))
        .slice(0, 5),
    }
  }, [search, db.employees, accessiblePages])

  const go = (to: string) => {
    navigate(to)
    setSearch('')
    setSearchOpen(false)
  }

  const markAllRead = () => {
    update((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }))
    toast('All notifications marked as read', 'success')
  }

  const sidebarContent = (
    <>
      <div className={cn('flex h-[72px] shrink-0 items-center gap-3 border-b border-white/[0.06] px-5', collapsed && 'justify-center px-0')}>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-violet-600 shadow-lg shadow-brand-500/30">
          <Sparkles className="h-[18px] w-[18px] text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold leading-none tracking-tight text-white">TITAN <span className="text-brand-300">HR</span></p>
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">People operations</p>
          </div>
        )}
      </div>

      <div className={cn('px-3 pt-4', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5', collapsed && 'justify-center px-0 py-2')}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-[10px] font-bold text-white">TL</span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">Titan Labs</p>
              <p className="truncate text-[10px] text-slate-500">Demo workspace</p>
            </div>
          )}
          {!collapsed && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.8)]" />}
        </div>
      </div>

      <nav className="no-scrollbar mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && <p className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-600">{section.title}</p>}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                const count = badges[item.to]
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl py-2.5 text-[13px] font-medium transition-all duration-200',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      active ? 'bg-gradient-to-r from-brand-500/20 to-brand-500/[0.06] text-white' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100',
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400 shadow-[0_0_10px_rgba(129,140,248,.7)]" />}
                    <item.icon className={cn('h-[17px] w-[17px] shrink-0 transition-colors', active ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {!collapsed && !!count && <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', active ? 'bg-brand-400/25 text-brand-200' : 'bg-white/[0.07] text-slate-400')}>{count}</span>}
                    {collapsed && !!count && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-400" />}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 border-t border-white/[0.06] p-3', collapsed && 'p-2')}>
        {!collapsed ? (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-600/25 via-violet-600/15 to-transparent p-3 ring-1 ring-inset ring-white/[0.08]">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-brand-400/20 blur-2xl" />
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10"><HelpCircle className="h-3.5 w-3.5 text-brand-200" /></div>
              <p className="text-xs font-semibold text-slate-100">Demo workspace</p>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">All data is local and illustrative. Changes persist in your browser.</p>
            <button onClick={() => setResetOpen(true)} className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-brand-300 hover:text-brand-200">
              <RotateCcw className="h-3 w-3" /> Reset demo data
            </button>
          </div>
        ) : (
          <button onClick={() => setResetOpen(true)} title="Reset demo data" className="flex w-full items-center justify-center rounded-lg py-2 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"><RotateCcw className="h-4 w-4" /></button>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn('mt-2 flex w-full items-center gap-2 rounded-lg py-2 text-[11px] font-medium text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-300', collapsed ? 'justify-center' : 'px-2')}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /><span>Collapse sidebar</span></>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen">
      <aside className={cn('fixed inset-y-0 left-0 z-50 hidden flex-col bg-ink-950 transition-[width] duration-300 ease-out lg:flex', collapsed ? 'w-[76px]' : 'w-[264px]')} style={{ backgroundImage: 'radial-gradient(600px 300px at 0% 0%, rgba(99,102,241,.16), transparent 60%)' }}>
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 320 }} className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-ink-950" style={{ backgroundImage: 'radial-gradient(600px 300px at 0% 0%, rgba(99,102,241,.16), transparent 60%)' }}>
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className={cn('transition-[padding] duration-300 ease-out', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <header className="glass no-print sticky top-0 z-40 border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <IconButton className="lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></IconButton>

            <div ref={searchRef} className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInput}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search people, pages, records…"
                className="h-10 w-full rounded-xl border border-slate-200/80 bg-white/70 pl-10 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.04] dark:focus:border-brand-400 dark:focus:bg-white/[0.06]"
              />
              <span className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>

              <AnimatePresence>
                {searchOpen && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-800">
                    <div className="max-h-[380px] overflow-y-auto p-2">
                      {results.employees.length === 0 && results.pages.length === 0 && (
                        <p className="px-3 py-9 text-center text-sm text-slate-400">No results for “{search}”</p>
                      )}
                      {results.employees.length > 0 && (
                        <>
                          <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">People</p>
                          {results.employees.map((emp) => (
                            <button key={emp.id} onClick={() => go(`/employees/${emp.id}`)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.05]">
                              <Avatar name={fullName(emp)} src={emp.photo} size="sm" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{fullName(emp)}</span>
                                <span className="block truncate text-[11px] text-slate-400">{emp.designation} · {emp.department}</span>
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">{emp.id}</span>
                            </button>
                          ))}
                        </>
                      )}
                      {results.pages.length > 0 && (
                        <>
                          <p className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Pages</p>
                          {results.pages.map((p) => (
                            <button key={p.label} onClick={() => go(p.to)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.05]">
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"><p.icon className="h-3.5 w-3.5" /></span>
                              <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{p.label}</span>
                              <Command className="h-3 w-3 text-slate-300" />
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-white/[0.06]">
                      <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
                      <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
                      <span className="ml-auto">Demo data — no real records</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Badge tone="brand" className="hidden md:inline-flex gap-1"><Sparkles className="h-3 w-3" /> Demo data</Badge>

              <IconButton aria-label="Toggle theme" onClick={toggleTheme} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
              </IconButton>

              <div ref={notifRef} className="relative">
                <button aria-label="Notifications" onClick={() => setNotifOpen((o) => !o)} className="focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white">
                  <Bell className="h-[18px] w-[18px]" />
                  {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-ink-950">{unread}</span>}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute right-0 top-[calc(100%+10px)] z-50 w-[340px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-800">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                        <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"><CheckCheck className="h-3 w-3" /> Mark all read</button>
                      </div>
                      <div className="max-h-[340px] overflow-y-auto">
                        {db.notifications.map((n) => (
                          <button key={n.id} onClick={() => { setNotifOpen(false); navigate('/') }} className={cn('flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-white/[0.04] dark:hover:bg-white/[0.03]', !n.read && 'bg-brand-50/40 dark:bg-brand-500/[0.05]')}>
                            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.type === 'danger' ? 'bg-rose-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-sky-500')} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12.5px] font-medium text-slate-800 dark:text-slate-100">{n.title}</span>
                              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{n.detail}</span>
                              <span className="mt-1 block text-[10px] text-slate-400">{relativeTime(n.date)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 p-2 dark:border-white/[0.06]">
                        <button onClick={() => { setNotifOpen(false); navigate('/') }} className="w-full rounded-lg py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">View all activity</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block" />

              <div ref={profileRef} className="relative">
                <button onClick={() => setProfileOpen((o) => !o)} className="focus-ring flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-1.5 transition hover:bg-slate-100/70 dark:hover:bg-white/[0.05]">
                  <Avatar name="Amara Okafor" src={db.employees[0]?.photo} size="sm" status />
                  <span className="hidden text-left xl:block">
                    <span className="block text-[12.5px] font-semibold leading-tight text-slate-800 dark:text-slate-100">Amara Okafor</span>
                    <span className="block text-[10.5px] text-slate-400">HR Director</span>
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 xl:block" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-ink-800">
                      <div className="mb-1 flex items-center gap-3 rounded-lg px-2.5 py-2">
                        <Avatar name="Amara Okafor" src={db.employees[0]?.photo} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">Amara Okafor</p>
                          <p className="truncate text-[11px] text-slate-400">amara.okafor@titanhr.demo</p>
                        </div>
                      </div>
                      <div className="my-1 h-px bg-slate-100 dark:bg-white/[0.06]" />
                      <button onClick={() => { setProfileOpen(false); navigate('/employees/EMP-001') }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]"><User className="h-4 w-4 text-slate-400" /> My profile</button>
                      <button onClick={() => { setProfileOpen(false); navigate('/settings') }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]"><Settings2 className="h-4 w-4 text-slate-400" /> HR settings</button>
                      <button onClick={() => { setProfileOpen(false); setResetOpen(true) }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]"><RotateCcw className="h-4 w-4 text-slate-400" /> Reset demo data</button>
                      <div className="my-1 h-px bg-slate-100 dark:bg-white/[0.06]" />
                      <button onClick={() => { setProfileOpen(false); toast('Demo session ended', 'info', 'This is a frontend-only demo — there is no authentication.') }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"><LogOut className="h-4 w-4" /> Sign out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <Outlet />
          </motion.div>
          <footer className="no-print mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200/70 pt-5 text-[11px] text-slate-400 dark:border-white/[0.06] sm:flex-row">
            <p>© {new Date().getFullYear()} Titan HR · Frontend demo workspace</p>
            <p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All demo data stored locally · No backend connected</p>
          </footer>
        </main>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo workspace?"
        description="This restores all 14 modules, employees, contracts, payments, and settings to the original demo dataset. Any changes you made in this browser will be lost."
        confirmLabel="Reset demo data"
        tone="danger"
        onConfirm={() => { resetDemo(); setResetOpen(false) }}
      />
    </div>
  )
}
