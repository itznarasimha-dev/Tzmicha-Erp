import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BadgeCheck, Building2, CalendarDays, Check, ChevronRight, Clock3, Download, FileSignature,
  GraduationCap, Layers3, ListChecks, Moon, Palette, Pencil, Plus, RotateCcw, Search, Settings2,
  Sparkles, Sun, Target, Trash2, UserCog, Wallet, X,
} from 'lucide-react'
import { useStore, useTheme } from '../store'
import type { SettingsData } from '../types'
import { createDemoDatabase } from '../data/demo'
import { downloadCSV, fmtDate, todayISO, uid } from '../lib/utils'
import {
  Badge, Button, Card, ConfirmDialog, Field, Input, Modal, PageHeader, Select, Textarea, Toggle,
} from '../components/ui'
import { cn } from '../lib/utils'

type FieldType = 'text' | 'number' | 'date' | 'time' | 'checkbox' | 'select' | 'textarea'
interface FieldDef {
  key: string
  label: string
  type?: FieldType
  options?: string[]
  optionsFrom?: 'departments'
  required?: boolean
  placeholder?: string
  help?: string
}
interface ColumnDef {
  key: string
  label: string
  kind?: 'text' | 'boolean' | 'color' | 'days' | 'date' | 'number'
}
interface SectionDef {
  id: keyof SettingsData
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  prefix: string
  fields: FieldDef[]
  columns: ColumnDef[]
  defaults?: Record<string, string | number | boolean>
}

const COLOR_OPTIONS = ['green', 'amber', 'blue', 'violet', 'red', 'slate', 'teal', 'brand', 'rose', 'orange']
const LEVELS = ['Executive', 'Lead', 'Senior', 'Mid', 'Junior']

const SECTIONS: SectionDef[] = [
  {
    id: 'departments', label: 'Departments', description: 'Organisational units used across employees, payroll and contracts.', icon: Building2, prefix: 'DEP',
    columns: [{ key: 'name', label: 'Department' }, { key: 'code', label: 'Code' }, { key: 'head', label: 'Department head' }],
    fields: [{ key: 'name', label: 'Department name', required: true, placeholder: 'e.g. Engineering' }, { key: 'code', label: 'Short code', required: true, placeholder: 'ENG' }, { key: 'head', label: 'Department head', placeholder: 'e.g. Daniel Whitfield' }],
  },
  {
    id: 'designations', label: 'Designations', description: 'Job titles and levels available when assigning employees.', icon: UserCog, prefix: 'DES',
    columns: [{ key: 'name', label: 'Designation' }, { key: 'department', label: 'Department' }, { key: 'level', label: 'Level' }],
    fields: [{ key: 'name', label: 'Designation title', required: true, placeholder: 'e.g. Senior Product Manager' }, { key: 'department', label: 'Department', type: 'select', optionsFrom: 'departments' }, { key: 'level', label: 'Level', type: 'select', options: LEVELS }],
  },
  {
    id: 'employmentTypes', label: 'Employment types', description: 'Contractual categories for workforce reporting.', icon: Layers3, prefix: 'ET',
    columns: [{ key: 'name', label: 'Type' }, { key: 'description', label: 'Description' }],
    fields: [{ key: 'name', label: 'Employment type', required: true, placeholder: 'e.g. Full-time' }, { key: 'description', label: 'Description', type: 'textarea', placeholder: 'How this engagement works…' }],
  },
  {
    id: 'employeeStatuses', label: 'Employee statuses', description: 'Lifecycle states and their visual treatment.', icon: BadgeCheck, prefix: 'ES',
    columns: [{ key: 'name', label: 'Status' }, { key: 'color', label: 'Colour', kind: 'color' }, { key: 'description', label: 'Description' }],
    fields: [{ key: 'name', label: 'Status name', required: true, placeholder: 'e.g. Active' }, { key: 'color', label: 'Badge colour', type: 'select', options: COLOR_OPTIONS }, { key: 'description', label: 'Description', type: 'textarea' }],
    defaults: { color: 'slate' },
  },
  {
    id: 'workingHours', label: 'Working hours', description: 'Default weekly schedule and active working days.', icon: Clock3, prefix: 'WH',
    columns: [{ key: 'day', label: 'Day' }, { key: 'start', label: 'Start' }, { key: 'end', label: 'End' }, { key: 'hours', label: 'Hours', kind: 'number' }, { key: 'active', label: 'Active', kind: 'boolean' }],
    fields: [{ key: 'day', label: 'Day', required: true, placeholder: 'Monday' }, { key: 'start', label: 'Start time', type: 'time' }, { key: 'end', label: 'End time', type: 'time' }, { key: 'hours', label: 'Hours per day', type: 'number', required: true }, { key: 'active', label: 'Active working day', type: 'checkbox' }],
    defaults: { start: '09:00', end: '17:30', hours: 8, active: true },
  },
  {
    id: 'attendancePolicies', label: 'Attendance policies', description: 'Rules that shape late marks, overtime and corrections.', icon: CalendarDays, prefix: 'AP',
    columns: [{ key: 'name', label: 'Policy' }, { key: 'value', label: 'Value' }, { key: 'description', label: 'Description' }],
    fields: [{ key: 'name', label: 'Policy name', required: true }, { key: 'value', label: 'Value', required: true, placeholder: 'e.g. 09:00' }, { key: 'description', label: 'Description', type: 'textarea' }],
  },
  {
    id: 'holidays', label: 'Holidays', description: 'Public, company and optional holidays for the year.', icon: Sparkles, prefix: 'HOL',
    columns: [{ key: 'name', label: 'Holiday' }, { key: 'date', label: 'Date', kind: 'date' }, { key: 'type', label: 'Type' }],
    fields: [{ key: 'name', label: 'Holiday name', required: true }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'type', label: 'Holiday type', type: 'select', options: ['Public', 'Company', 'Optional'] }],
    defaults: { date: todayISO(), type: 'Public' },
  },
  {
    id: 'leaveTypes', label: 'Leave types', description: 'Allocations, pay treatment and approval requirements.', icon: CalendarDays, prefix: 'LT',
    columns: [{ key: 'name', label: 'Leave type' }, { key: 'allocation', label: 'Allocation', kind: 'days' }, { key: 'paid', label: 'Paid', kind: 'boolean' }, { key: 'requiresApproval', label: 'Approval', kind: 'boolean' }, { key: 'color', label: 'Colour', kind: 'color' }],
    fields: [
      { key: 'name', label: 'Leave type', required: true }, { key: 'allocation', label: 'Annual allocation (days)', type: 'number', required: true },
      { key: 'paid', label: 'Paid leave', type: 'checkbox' }, { key: 'carryForward', label: 'Allows carry forward', type: 'checkbox' },
      { key: 'requiresApproval', label: 'Requires approval', type: 'checkbox' }, { key: 'color', label: 'Colour', type: 'select', options: COLOR_OPTIONS },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    defaults: { allocation: 10, paid: true, carryForward: false, requiresApproval: true, color: 'brand' },
  },
  {
    id: 'recruitmentStages', label: 'Recruitment stages', description: 'Hiring pipeline sequence and service-level targets.', icon: Target, prefix: 'RS',
    columns: [{ key: 'order', label: '#', kind: 'number' }, { key: 'name', label: 'Stage' }, { key: 'sla', label: 'SLA' }],
    fields: [{ key: 'name', label: 'Stage name', required: true }, { key: 'order', label: 'Display order', type: 'number', required: true }, { key: 'sla', label: 'Target SLA', placeholder: 'e.g. 3 days' }],
    defaults: { order: 1, sla: '3 days' },
  },
  {
    id: 'onboardingChecklists', label: 'Onboarding checklists', description: 'Reusable pre-joining and first-week tasks.', icon: ListChecks, prefix: 'OC',
    columns: [{ key: 'label', label: 'Task' }, { key: 'owner', label: 'Owner' }, { key: 'category', label: 'Category' }],
    fields: [{ key: 'label', label: 'Task label', required: true }, { key: 'owner', label: 'Owner' }, { key: 'category', label: 'Category', type: 'select', options: ['Documents', 'IT & Access', 'People', 'Compliance'] }],
    defaults: { category: 'Documents' },
  },
  {
    id: 'contractTypes', label: 'Contract types', description: 'Templates available when creating agreements.', icon: FileSignature, prefix: 'CT',
    columns: [{ key: 'name', label: 'Contract type' }, { key: 'defaultTerm', label: 'Default term' }, { key: 'description', label: 'Description' }],
    fields: [{ key: 'name', label: 'Contract type', required: true }, { key: 'defaultTerm', label: 'Default term', placeholder: 'e.g. 12 months' }, { key: 'description', label: 'Description', type: 'textarea' }],
  },
  {
    id: 'paymentCategories', label: 'Payment categories', description: 'Classification for daily payments and reimbursements.', icon: Wallet, prefix: 'PC',
    columns: [{ key: 'name', label: 'Category' }, { key: 'taxable', label: 'Taxable', kind: 'boolean' }, { key: 'description', label: 'Description' }],
    fields: [{ key: 'name', label: 'Category name', required: true }, { key: 'taxable', label: 'Taxable payment', type: 'checkbox' }, { key: 'description', label: 'Description', type: 'textarea' }],
    defaults: { taxable: false },
  },
  {
    id: 'reviewTemplates', label: 'Review templates', description: 'Performance review structures and cycles.', icon: GraduationCap, prefix: 'RT',
    columns: [{ key: 'name', label: 'Template' }, { key: 'cycle', label: 'Cycle' }, { key: 'sections', label: 'Sections' }],
    fields: [{ key: 'name', label: 'Template name', required: true }, { key: 'cycle', label: 'Cycle', type: 'select', options: ['Half-yearly', 'Annual', 'One-time', 'End of term'] }, { key: 'sections', label: 'Included sections', type: 'textarea', placeholder: 'Goals, competencies, development plan…' }],
    defaults: { cycle: 'Half-yearly' },
  },
]

const colorTone = (color: string) => {
  const allowed = ['brand', 'slate', 'green', 'amber', 'red', 'blue', 'violet', 'teal', 'rose', 'orange']
  return allowed.includes(color) ? color as any : 'slate'
}

export default function Settings() {
  const { db, update, resetDemo, toast } = useStore()
  const { theme, setTheme } = useTheme()
  const [activeId, setActiveId] = useState<keyof SettingsData>('departments')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, any> | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteItem, setDeleteItem] = useState<Record<string, any> | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [notifyOn, setNotifyOn] = useState(() => localStorage.getItem('titan-hr-notify') !== 'off')
  const [compact, setCompact] = useState(() => localStorage.getItem('titan-hr-compact') === 'on')

  const section = SECTIONS.find((s) => s.id === activeId)!
  const rows = (db.settings[section.id] as unknown as Record<string, any>[]) || []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => section.columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)) || Object.values(r).some((v) => String(v).toLowerCase().includes(q)))
  }, [rows, search, section])

  useEffect(() => {
    setSearch('')
  }, [activeId])

  useEffect(() => {
    localStorage.setItem('titan-hr-notify', notifyOn ? 'on' : 'off')
    localStorage.setItem('titan-hr-compact', compact ? 'on' : 'off')
  }, [notifyOn, compact])

  const openCreate = () => {
    const initial: Record<string, any> = {}
    section.fields.forEach((f) => {
      if (f.type === 'checkbox') initial[f.key] = false
      else if (f.type === 'number') initial[f.key] = 0
      else if (f.type === 'date') initial[f.key] = todayISO()
      else if (f.type === 'select') initial[f.key] = f.options?.[0] || db.settings.departments[0]?.name || ''
      else initial[f.key] = ''
    })
    setForm({ ...initial, ...section.defaults })
    setEditing(null)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item: Record<string, any>) => {
    setEditing(item)
    setForm({ ...item })
    setErrors({})
    setModalOpen(true)
  }

  const save = () => {
    const next: Record<string, string> = {}
    section.fields.forEach((f) => {
      if (f.required && (form[f.key] === undefined || form[f.key] === '' || form[f.key] === null)) next[f.key] = `${f.label} is required`
    })
    setErrors(next)
    if (Object.keys(next).length) return

    const clean: Record<string, any> = { ...form }
    section.fields.forEach((f) => {
      if (f.type === 'number') clean[f.key] = Number(clean[f.key]) || 0
      if (f.type === 'checkbox') clean[f.key] = !!clean[f.key]
    })
    const list = [...rows]
    if (editing) {
      const idx = list.findIndex((r) => r.id === editing.id)
      if (idx >= 0) list[idx] = { ...editing, ...clean }
      toast(`${section.label.slice(0, -1)} updated`, 'success', `${clean[section.fields[0].key]} has been saved.`)
    } else {
      const id = `${section.prefix}-${uid('n').replace('n-', '')}`
      list.unshift({ ...clean, id })
      toast(`${section.label.slice(0, -1)} added`, 'success', `${clean[section.fields[0].key]} has been added to ${section.label.toLowerCase()}.`)
    }
    update((d) => ({ ...d, settings: { ...d.settings, [section.id]: list } }))
    setModalOpen(false)
    setEditing(null)
  }

  const remove = () => {
    if (!deleteItem) return
    const list = rows.filter((r) => r.id !== deleteItem.id)
    const name = deleteItem[section.fields[0].key] || deleteItem.id
    update((d) => ({ ...d, settings: { ...d.settings, [section.id]: list } }))
    toast('Configuration removed', 'success', `${name} was deleted from ${section.label.toLowerCase()}.`)
    setDeleteItem(null)
  }

  const exportSection = () => {
    downloadCSV(`titan-hr-settings-${section.id}.csv`, [
      section.columns.map((c) => c.label),
      ...filtered.map((r) => section.columns.map((c) => {
        const v = r[c.key]
        return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v ?? ''
      })),
    ])
    toast('Configuration exported', 'success', `${fmtDate(todayISO())} · ${filtered.length} rows from ${section.label.toLowerCase()}.`)
  }

  const resetSettings = () => {
    update((d) => ({ ...d, settings: createDemoDatabase().settings }))
    toast('Default settings restored', 'success', 'All configuration tables have been returned to the demo defaults.')
    setResetOpen(false)
  }

  const optionList = (f: FieldDef) => f.optionsFrom === 'departments' ? db.settings.departments.map((d) => d.name) : (f.options || [])

  const formatValue = (row: Record<string, any>, col: ColumnDef) => {
    const v = row[col.key]
    if (col.kind === 'boolean') return <Badge tone={v ? 'green' : 'slate'} dot>{v ? 'Yes' : 'No'}</Badge>
    if (col.kind === 'color') return <Badge tone={colorTone(String(v))} dot>{String(v || '—')}</Badge>
    if (col.kind === 'days') return <span className="tabular">{v ?? 0} days</span>
    if (col.kind === 'date') return fmtDate(String(v))
    if (col.kind === 'number') return <span className="tabular">{v}</span>
    return String(v ?? '—')
  }

  const counts = {
    departments: db.settings.departments.length,
    designations: db.settings.designations.length,
    leaveTypes: db.settings.leaveTypes.length,
    holidays: db.settings.holidays.length,
  }

  return (
    <div>
      <PageHeader
        title="HR Settings"
        subtitle="Configure the structures behind every module — departments, policies, leave types, contracts and review templates."
        crumbs={['Insights', 'HR Settings']}
        actions={<><Button variant="secondary" onClick={() => setResetOpen(true)}><RotateCcw className="h-4 w-4" /> Restore defaults</Button><Button onClick={openCreate}><Plus className="h-4 w-4" /> Add {section.label.slice(0, -1).toLowerCase()}</Button></>}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Departments', value: counts.departments, icon: Building2, tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' },
          { label: 'Designations', value: counts.designations, icon: UserCog, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' },
          { label: 'Leave types', value: counts.leaveTypes, icon: CalendarDays, tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' },
          { label: 'Holidays configured', value: counts.holidays, icon: Sparkles, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card flex items-center gap-3 p-4">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', s.tone)}><s.icon className="h-4.5 w-4.5" /></span>
            <div><p className="tabular text-xl font-bold leading-none">{s.value}</p><p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</p></div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Card className="p-2">
            <div className="px-3 pb-2 pt-1"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Configuration</p></div>
            <nav className="space-y-0.5">
              {SECTIONS.map((s) => {
                const count = (db.settings[s.id] as unknown as any[]).length
                return (
                  <button key={s.id} onClick={() => setActiveId(s.id)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11.5px] font-medium transition', activeId === s.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200')}>
                    <s.icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', activeId === s.id ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400')}>{count}</span>
                  </button>
                )
              })}
            </nav>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Palette className="h-4 w-4 text-brand-500" /> Workspace</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setTheme('light')} className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] font-medium transition', theme === 'light' ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-400')}><Sun className="h-4 w-4" /> Light</button>
              <button onClick={() => setTheme('dark')} className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] font-medium transition', theme === 'dark' ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-400')}><Moon className="h-4 w-4" /> Dark</button>
            </div>
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
              <Toggle checked={notifyOn} onChange={setNotifyOn} label="Email notifications" description="Demo preference" />
              <Toggle checked={compact} onChange={setCompact} label="Compact tables" description="UI preference only" />
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Need a clean slate?</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Restore every module to its original demo dataset. This is separate from restoring settings only.</p>
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => { resetDemo() }}><RotateCcw className="h-3.5 w-3.5" /> Reset whole demo</Button>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5 dark:border-white/[0.05]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><section.icon className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-base font-bold">{section.label}</h2>
                  <p className="mt-0.5 max-w-xl text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={exportSection}><Download className="h-3.5 w-3.5" /> Export</Button>
                <Button size="sm" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </div>
            </div>
            <div className="relative mt-4 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${section.label.toLowerCase()}…`} className="field h-9 pl-9 text-xs" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-3 w-3" /></button>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
                <tr>
                  {section.columns.map((c) => <th key={c.key} className="table-head">{c.label}</th>)}
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="table-row">
                    {section.columns.map((c, i) => (
                      <td key={c.key} className={cn('table-cell', i === 0 && 'font-semibold text-slate-800 dark:text-slate-100')}>{formatValue(row, c)}</td>
                    ))}
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/[0.06] dark:hover:text-brand-400" aria-label={`Edit ${row[section.fields[0].key]}`}><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteItem(row)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400" aria-label={`Delete ${row[section.fields[0].key]}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]"><Settings2 className="h-5 w-5" /></div>
                <p className="text-sm font-semibold">{search ? 'No matching configuration' : `No ${section.label.toLowerCase()} configured`}</p>
                <p className="mt-1 max-w-sm text-xs text-slate-400">{search ? 'Try a broader search term.' : 'Add your first entry to make it available across the workspace.'}</p>
                <Button size="sm" className="mt-4" onClick={search ? () => setSearch('') : openCreate}>{search ? 'Clear search' : <><Plus className="h-3.5 w-3.5" /> Add entry</>}</Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400 dark:border-white/[0.05]">
            <span>{filtered.length} of {rows.length} entries</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Changes persist in your browser</span>
          </div>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={`${editing ? 'Edit' : 'Add'} ${section.label.slice(0, -1).toLowerCase()}`}
        description={editing ? `Update this configuration entry. Changes apply locally.` : `New entries become available across the demo workspace.`}
        size="md"
        footer={<><Button variant="secondary" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancel</Button><Button onClick={save}>{editing ? 'Save changes' : 'Add entry'}</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {section.fields.map((f) => {
            const wide = f.type === 'textarea' || f.type === 'checkbox'
            return (
              <Field key={f.key} label={f.label} required={f.required} error={errors[f.key]} className={wide ? 'sm:col-span-2' : ''}>
                {f.type === 'checkbox' ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <Toggle checked={!!form[f.key]} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} label={f.label} />
                  </div>
                ) : f.type === 'select' ? (
                  <Select value={String(form[f.key] ?? '')} onChange={(e) => { setForm((x) => ({ ...x, [f.key]: e.target.value })); setErrors((x) => ({ ...x, [f.key]: '' })) }}>
                    {optionList(f).map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                ) : f.type === 'textarea' ? (
                  <Textarea value={String(form[f.key] ?? '')} onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                ) : (
                  <Input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'} value={String(form[f.key] ?? '')} onChange={(e) => { setForm((x) => ({ ...x, [f.key]: e.target.value })); setErrors((x) => ({ ...x, [f.key]: '' })) }} placeholder={f.placeholder} invalid={!!errors[f.key]} />
                )}
              </Field>
            )
          })}
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 dark:bg-white/[0.03] dark:text-slate-400 sm:col-span-2">
            Configuration is stored in the local demo database. Existing employees, contracts and payroll records keep their historical values.
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={remove} title="Remove configuration entry?" description={deleteItem ? `${deleteItem[section.fields[0].key]} will be removed from ${section.label.toLowerCase()}. Existing records that reference it are not changed.` : ''} confirmLabel="Remove entry" tone="danger" />
      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={resetSettings} title="Restore default settings?" description="All 13 configuration tables will be restored to their original demo values. Employee, contract and payment records are not affected." confirmLabel="Restore defaults" />
    </div>
  )
}
