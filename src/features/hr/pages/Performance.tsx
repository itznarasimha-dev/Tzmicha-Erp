import {
  useState, useMemo,
} from 'react'
import {
  AlertTriangle, ArrowRight, BarChart3, Check, CheckCircle2, ChevronRight, Download, Flag, Gauge,
  Minus, Pencil, Plus, RefreshCw, Star, Target, Trash2, UserRound,
} from 'lucide-react'

import { useStore } from '../store'
import { describeMissingPermission, useHrAccess } from '../lib/access'
import { useReviews } from '../useHrData'
import { runHrApiAction, hrActions } from '../api-actions'
import type { Goal, PerformanceReview, ReviewStatus } from '../types'
import { downloadCSV, fmtDate, fmtMoney, todayISO, uid } from '../lib/utils'
import { BarDistribution, Donut, Legend } from '../components/charts'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, Field, Input,
  Modal, PageHeader, Pagination, ProgressBar, SearchInput, SectionCard, Select, StatCard, StatusBadge, Tabs,
  Textarea,
} from '../components/ui'
import { HrPermissionNotice } from '../components/hr-guard'

const FLOW: ReviewStatus[] = ['Not Started', 'Self Assessment', 'Manager Review', 'HR Review', 'Completed']
type SortKey = 'due' | 'name' | 'rating' | 'progress'
type ModalMode = 'create' | 'edit' | null

const blankReview = {
  employeeId: '', cycle: 'H2 2026 Performance Cycle', dueDate: todayISO(),
  selfRating: '3', managerRating: '3', hrRating: '0', strengths: '', improvements: '', comments: '',
}

const defaultGoals = (): Goal[] => [
  { id: uid('goal'), title: 'Deliver quarterly roadmap commitments', target: '100% of committed scope', progress: 35, weight: 30, status: 'On Track' },
  { id: uid('goal'), title: 'Improve cross-team collaboration', target: '4.2+ stakeholder score', progress: 20, weight: 25, status: 'On Track' },
  { id: uid('goal'), title: 'Develop one core skill', target: 'Complete certification', progress: 0, weight: 20, status: 'On Track' },
  { id: uid('goal'), title: 'Operational excellence', target: '< 2 escalations per month', progress: 45, weight: 25, status: 'On Track' },
]

export default function Performance() {
  const access = useHrAccess()
  const { db, update, logActivity, toast, dataSource, refreshFromApi } = useStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [department, setDepartment] = useState('All')
  const [sort, setSort] = useState<SortKey>('due')
  const [view, setView] = useState<'reviews' | 'goals'>('reviews')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmAdvance, setConfirmAdvance] = useState<PerformanceReview | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PerformanceReview | null>(null)
  const [modal, setModal] = useState<ModalMode>(null)
  const [editing, setEditing] = useState<PerformanceReview | null>(null)
  const [form, setForm] = useState(blankReview)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reviewsQuery = useReviews({
    employeeId: undefined,
    period: undefined,
    status: status === 'All' ? undefined : status as any,
    page,
    pageSize,
  })

  const useApi = dataSource === 'api'
  const reviewsData = useApi ? reviewsQuery.data : null
  const allReviews = (reviewsData ?? db.reviews) as PerformanceReview[]

  const empMap = useMemo(() => new Map(db.employees.map((e) => [e.id, e])), [db.employees])
  const selected = allReviews.find((r) => r.id === selectedId) || null

  const counts = useMemo(() => {
    const completed = allReviews.filter((r) => r.status === 'Completed').length
    const totalGoals = allReviews.reduce((acc, r) => acc + r.goals.length, 0)
    const atRisk = allReviews.reduce((acc, r) => acc + r.goals.filter((g) => g.status === 'At Risk').length, 0)
    const ratings = allReviews.map((r) => r.managerRating).filter((r) => r > 0)
    const overdue = allReviews.filter((r) => r.status !== 'Completed' && r.dueDate < todayISO()).length
    const upcoming = allReviews.filter((r) => r.status !== 'Completed' && r.dueDate >= todayISO() && r.dueDate <= todayISO().slice(0, 8) + '99').length
    return {
      completion: allReviews.length ? Math.round((completed / allReviews.length) * 100) : 0,
      completed, totalGoals, atRisk, overdue, upcoming,
      avgRating: ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0,
      active: allReviews.length - completed,
    }
  }, [allReviews])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = allReviews.filter((r) => {
      const e = empMap.get(r.employeeId)
      const matchSearch = !q || !e || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
      return matchSearch && (status === 'All' || r.status === status) && (department === 'All' || e?.department === department)
    })
    return list.sort((a, b) => {
      if (sort === 'name') return (empMap.get(a.employeeId)?.firstName || '').localeCompare(empMap.get(b.employeeId)?.firstName || '')
      if (sort === 'rating') return b.managerRating - a.managerRating
      if (sort === 'progress') {
        const avg = (r: PerformanceReview) => r.goals.length ? r.goals.reduce((x, g) => x + g.progress, 0) / r.goals.length : 0
        return avg(b) - avg(a)
      }
      return a.dueDate.localeCompare(b.dueDate)
    })
  }, [allReviews, empMap, search, status, department, sort])

  // API mode uses the server pagination metadata; demo mode paginates locally.
  const reviewMeta = (reviewsData as any)?.meta
  const totalItems = useApi ? Number(reviewMeta?.total ?? filtered.length) : filtered.length
  const totalPages = useApi ? Math.max(1, Number(reviewMeta?.totalPages ?? 1)) : Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = useApi ? Number(reviewMeta?.page ?? page) : Math.min(page, totalPages)
  const from = useApi ? (filtered.length ? (currentPage - 1) * (reviewMeta?.pageSize ?? pageSize) : 0) : (Math.min(page, totalPages) - 1) * pageSize
  const rows = useApi ? filtered : filtered.slice(from, from + pageSize)

  const statusCounts = FLOW.map((s) => ({ name: s, value: allReviews.filter((r) => r.status === s).length, color: s === 'Completed' ? '#22c55e' : s === 'HR Review' ? '#8b5cf6' : s === 'Manager Review' ? '#6366f1' : s === 'Self Assessment' ? '#f59e0b' : '#94a3b8' }))
  const deptData = useMemo(() => {
    const map = new Map<string, number>()
    allReviews.forEach((r) => {
      const d = empMap.get(r.employeeId)?.department || 'Other'
      map.set(d, (map.get(d) || 0) + 1)
    })
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7)
  }, [allReviews, empMap])

  const avgProgress = (r: PerformanceReview) => r.goals.length ? Math.round(r.goals.reduce((a, g) => a + g.progress, 0) / r.goals.length) : 0

  const nextStatus = (s: ReviewStatus): ReviewStatus | null => {
    const i = FLOW.indexOf(s)
    return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null
  }

  /**
   * The backend lets an employee move only their own review to the
   * "Self Assessment" stage; every other transition needs
   * `hr.performance.write`.
   */
  const canAdvanceReview = (r: PerformanceReview): boolean => {
    if (access.can('performance.write')) return true
    const next = nextStatus(r.status)
    if (!next) return false
    if (next !== 'Self Assessment') return false
    return access.isSelf(r.employeeId)
  }

  const advance = () => {
    if (!confirmAdvance) return
    const next = nextStatus(confirmAdvance.status)
    if (!next) return
    const e = empMap.get(confirmAdvance.employeeId)
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateReview(confirmAdvance.id, {
          status: next,
          ...(next === 'Completed' ? { completedAt: todayISO(), hrRating: confirmAdvance.hrRating || 4 } : {}),
        } as Record<string, unknown>),
        successMessage: next === 'Completed' ? 'Review completed' : `Moved to ${next}`,
        successDescription: `${e ? `${e.firstName} ${e.lastName}` : 'Employee'}'s review is now ${next}.`,
        errorTitle: 'Could not advance review',
      }).then((res) => {
        if (res.ok) setConfirmAdvance(null)
      })
      return
    }
    update((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === confirmAdvance.id ? { ...r, status: next, ...(next === 'Completed' ? { completedAt: todayISO(), hrRating: r.hrRating || 4 } : {}) } : r)) }))
    logActivity('performance', `Review moved to ${next}`, `${e ? `${e.firstName} ${e.lastName}` : confirmAdvance.employeeId} · ${confirmAdvance.cycle}`)
    toast(next === 'Completed' ? 'Review completed' : `Moved to ${next}`, 'success', `${e ? `${e.firstName} ${e.lastName}` : 'Employee'}'s review is now ${next}.`)
    setConfirmAdvance(null)
  }

  const remind = (r: PerformanceReview) => {
    const e = empMap.get(r.employeeId)
    if (dataSource === 'api') {
      toast('Reminders are not sent by the backend yet', 'warning', `${e ? `${e.firstName} ${e.lastName}` : 'Employee'} was not emailed. No change was saved.`)
      return
    }
    logActivity('performance', 'Review reminder sent', `${e ? `${e.firstName} ${e.lastName}` : r.employeeId} · ${r.cycle}`)
    toast('Reminder sent', 'info', `${e ? `${e.firstName} ${e.lastName}` : 'Employee'} has been reminded to complete their review.`)
  }

  const adjustGoal = (reviewId: string, goalId: string, delta: number) => {
    const review = allReviews.find((r) => r.id === reviewId)
    if (!review) return
    const goals: Goal[] = review.goals.map((g) => {
      if (g.id !== goalId) return g
      const progress = Math.max(0, Math.min(100, g.progress + delta))
      return { ...g, progress, status: (progress >= 100 ? 'Completed' : g.status === 'Completed' ? 'On Track' : g.status) as Goal['status'] }
    })
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateReview(reviewId, { goals }),
        successMessage: 'Goal progress updated',
        errorTitle: 'Could not update goal',
      })
      return
    }
    update((d) => ({
      ...d,
      reviews: d.reviews.map((r) => r.id === reviewId ? { ...r, goals: goals as Goal[] } : r),
    }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...blankReview, cycle: db.reviews[0]?.cycle || 'H2 2026 Performance Cycle', dueDate: todayISO() })
    setErrors({})
    setModal('create')
  }

  const openEdit = (r: PerformanceReview) => {
    setEditing(r)
    setForm({
      employeeId: r.employeeId, cycle: r.cycle, dueDate: r.dueDate,
      selfRating: String(r.selfRating), managerRating: String(r.managerRating), hrRating: String(r.hrRating),
      strengths: r.strengths, improvements: r.improvements, comments: r.comments,
    })
    setErrors({})
    setModal('edit')
  }

  const saveReview = () => {
    const next: Record<string, string> = {}
    if (!form.employeeId) next.employeeId = 'Select an employee'
    if (!form.dueDate) next.dueDate = 'Due date is required'
    if (!form.cycle.trim()) next.cycle = 'Cycle name is required'
    setErrors(next)
    if (Object.keys(next).length) return

    const selfRating = Number(form.selfRating)
    const managerRating = Number(form.managerRating)
    const hrRating = Number(form.hrRating)

    if (dataSource === 'api') {
      if (editing) {
        void runHrApiAction({ dataSource, refreshFromApi, toast }, {
          action: () => hrActions.updateReview(editing.id, {
            selfRating,
            managerRating,
            hrRating,
            strengths: form.strengths,
            improvements: form.improvements,
            comments: form.comments,
          }),
          successMessage: 'Review updated',
          successDescription: 'Ratings and feedback have been saved.',
          errorTitle: 'Could not update review',
        }).then((res) => {
          if (res.ok) {
            setModal(null)
            setEditing(null)
          }
        })
        return
      }
      const already = allReviews.some((r) => r.employeeId === form.employeeId && r.cycle === form.cycle)
      if (already) {
        toast('Review already exists', 'warning', 'This employee is already in the selected review cycle.')
        return
      }
      const period = form.cycle.split(' ').slice(0, 2).join(' ') || form.cycle.slice(0, 20)
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.createReview({
          employeeId: form.employeeId,
          period,
          cycle: form.cycle.trim(),
          dueDate: form.dueDate,
          goals: defaultGoals(),
        }),
        successMessage: 'Review created',
        successDescription: 'The employee has been added to the review cycle.',
        errorTitle: 'Could not create review',
      }).then((res) => {
        if (res.ok) {
          setModal(null)
          setEditing(null)
        }
      })
      return
    }

    if (editing) {
      update((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === editing.id ? { ...r, ...form, selfRating, managerRating, hrRating, goals: r.goals } : r)) }))
      logActivity('performance', 'Review updated', `${empMap.get(editing.employeeId)?.firstName || ''} ${empMap.get(editing.employeeId)?.lastName || ''} · ${editing.cycle}`)
      toast('Review updated', 'success', 'Ratings and feedback have been saved.')
    } else {
      const already = db.reviews.some((r) => r.employeeId === form.employeeId && r.cycle === form.cycle)
      if (already) {
        toast('Review already exists', 'warning', 'This employee is already in the selected review cycle.')
        return
      }
      const review: PerformanceReview = {
        id: `REV-${Math.max(5400, ...db.reviews.map((r) => Number(r.id.replace(/\D/g, '')) || 5400)) + 1}`,
        employeeId: form.employeeId, period: form.cycle.split(' ').slice(0, 2).join(' '), cycle: form.cycle,
        dueDate: form.dueDate, status: 'Not Started', selfRating, managerRating, hrRating,
        goals: defaultGoals(), strengths: form.strengths, improvements: form.improvements, comments: form.comments,
        manager: empMap.get(form.employeeId)?.manager || 'Reporting manager',
      }
      update((d) => ({ ...d, reviews: [review, ...d.reviews] }))
      logActivity('performance', 'Review created', `${empMap.get(form.employeeId)?.firstName || ''} ${empMap.get(form.employeeId)?.lastName || ''} · ${review.cycle}`)
      toast('Review created', 'success', 'The employee has been added to the review cycle.')
    }
    setModal(null)
    setEditing(null)
  }

  const removeReview = () => {
    if (!deleteTarget) return
    if (dataSource === 'api') {
      toast('Deleting reviews is not supported', 'warning', 'The API keeps an audited review history. No record was deleted.')
      setDeleteTarget(null)
      return
    }
    update((d) => ({ ...d, reviews: d.reviews.filter((r) => r.id !== deleteTarget.id) }))
    logActivity('performance', 'Review deleted', `${deleteTarget.id} · ${deleteTarget.cycle}`)
    toast('Review removed', 'success', 'The review record was deleted from this demo workspace.')
    setDeleteTarget(null)
    setSelectedId(null)
  }

  const exportReviews = () => {
    downloadCSV('titan-hr-performance-reviews.csv', [
      ['Review ID', 'Employee ID', 'Employee', 'Department', 'Cycle', 'Due date', 'Status', 'Self rating', 'Manager rating', 'HR rating', 'Goal progress %'],
      ...filtered.map((r) => { const e = empMap.get(r.employeeId); return [r.id, r.employeeId, e ? `${e.firstName} ${e.lastName}` : '', e?.department || '', r.cycle, r.dueDate, r.status, r.selfRating, r.managerRating, r.hrRating, avgProgress(r)] }),
    ])
    toast('Performance report exported', 'success', `${filtered.length} reviews written to CSV.`)
  }

  const allGoals = useMemo(() => allReviews.flatMap((r) => r.goals.map((g) => ({ ...g, owner: empMap.get(r.employeeId), reviewId: r.id, reviewStatus: r.status }))), [allReviews, empMap])
  const goalRows = allGoals.filter((g) => {
    const q = search.trim().toLowerCase()
    return (!q || (g.title.toLowerCase().includes(q) || (g.owner && `${g.owner.firstName} ${g.owner.lastName}`.toLowerCase().includes(q)))) && (status === 'All' || g.status === status)
  })

  return (
    <div>
      {useApi && reviewsQuery.loading && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading performance data…</p>
          </div>
        </div>
      )}
      {useApi && reviewsQuery.error && (
        <div className="text-center py-12">
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-6 py-8 max-w-md mx-auto dark:bg-rose-500/10 dark:border-rose-500/20">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-300">Unable to load performance data</h3>
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{reviewsQuery.error}</p>
            <button
              onClick={() => reviewsQuery.refetch()}
              className="mt-4 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {!useApi || (!reviewsQuery.loading && !reviewsQuery.error) && (
        <>
        <PageHeader
        title="Performance"
        subtitle="Run a transparent review cycle, track weighted goals and surface the conversations that need attention."
        crumbs={['Talent', 'Performance']}
        actions={
          <>
            {useApi && (
              <Button variant="secondary" onClick={() => void reviewsQuery.refetch()} disabled={reviewsQuery.loading}>
                <RefreshCw className={`h-4 w-4 ${reviewsQuery.loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            )}
            <Button variant="secondary" onClick={exportReviews}><Download className="h-4 w-4" /> Export</Button>
            {access.can('performance.write') && (
              <Button onClick={openCreate}><Plus className="h-4 w-4" /> New review</Button>
            )}
          </>
        }
      />

      {!access.can('performance.write') && (
        <HrPermissionNotice className="mb-4" message={`${describeMissingPermission('performance.write')} You can review your own performance record but cannot create or advance reviews for others.`} />
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} label="Cycle completion" value={`${counts.completion}%`} icon={Gauge} tone="brand" hint={`${counts.completed} of ${allReviews.length} completed`} />
        <StatCard index={1} label="Avg. manager rating" value={counts.avgRating.toFixed(1)} icon={Star} tone="amber" hint="Out of 5.0 across reviews" />
        <StatCard index={2} label="Active reviews" value={counts.active} icon={UserRound} tone="violet" hint={`${counts.overdue} overdue`} />
        <StatCard index={3} label="Goals at risk" value={counts.atRisk} icon={AlertTriangle} tone="red" hint={`${counts.totalGoals} goals tracked`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="mb-1 flex items-center justify-between"><h3 className="text-sm font-semibold">Review pipeline</h3><Badge tone="brand" dot>{allReviews.length} reviews</Badge></div>
          <p className="text-xs text-slate-400">Distribution across the current cycle</p>
          <Donut data={statusCounts.filter((s) => s.value > 0)} height={190} centerLabel="Complete" centerValue={`${counts.completion}%`} />
          <Legend items={statusCounts.map((s) => ({ name: s.name, value: s.value, color: s.color }))} className="mt-3" />
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="mb-1 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Reviews by department</h3><p className="mt-0.5 text-xs text-slate-400">Where active review work is concentrated</p></div><BarChart3 className="h-4 w-4 text-slate-300" /></div>
          <div className="mt-4"><BarDistribution data={deptData} layout="vertical" height={228} color="#8b5cf6" /></div>
        </Card>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs items={[{ id: 'reviews', label: 'Review cycle', count: allReviews.length }, { id: 'goals', label: 'Goal tracker', count: allGoals.length }]} value={view} onChange={(v) => { setView(v); setPage(1) }} className="border-0" />
        <div className="flex flex-wrap gap-2">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={view === 'reviews' ? 'Search employees or reviews…' : 'Search goals or owners…'} className="w-full sm:w-64" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-auto"><option value="All">{view === 'reviews' ? 'All statuses' : 'All goal states'}</option>{view === 'reviews' ? FLOW.map((s) => <option key={s}>{s}</option>) : <><option>On Track</option><option>At Risk</option><option>Completed</option></>}</Select>
          {view === 'reviews' && <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1) }} className="w-auto"><option value="All">All departments</option>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select>}
          {view === 'reviews' && <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto"><option value="due">Due date</option><option value="name">Employee A–Z</option><option value="rating">Highest rating</option><option value="progress">Goal progress</option></Select>}
        </div>
      </div>

      {view === 'reviews' ? (
        <Card className="mt-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
                <tr><th className="table-head">Employee</th><th className="table-head">Cycle</th><th className="table-head">Due</th><th className="table-head">Self</th><th className="table-head">Manager</th><th className="table-head">HR</th><th className="table-head min-w-[160px]">Goal progress</th><th className="table-head">Status</th><th className="table-head text-right">Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const e = empMap.get(r.employeeId)
                  const overdue = r.status !== 'Completed' && r.dueDate < todayISO()
                  return (
                    <tr key={r.id} className="table-row cursor-pointer" onClick={() => setSelectedId(r.id)}>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={e ? `${e.firstName} ${e.lastName}` : r.employeeId} src={e?.photo} size="sm" />
                          <div><p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{e ? `${e.firstName} ${e.lastName}` : r.employeeId}</p><p className="text-[10px] text-slate-400">{e?.designation} · {e?.department}</p></div>
                        </div>
                      </td>
                      <td className="table-cell"><p className="text-[12px]">{r.cycle}</p><p className="text-[10px] text-slate-400">{r.id}</p></td>
                      <td className="table-cell"><p className={`text-[12px] ${overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>{fmtDate(r.dueDate)}</p><p className="text-[10px] text-slate-400">{overdue ? 'Overdue' : r.status === 'Completed' ? 'Closed' : 'Scheduled'}</p></td>
                      <td className="table-cell"><span className="inline-flex items-center gap-1 text-[12px]"><Star className="h-3 w-3 text-amber-400" /> {r.selfRating || '—'}</span></td>
                      <td className="table-cell"><span className="inline-flex items-center gap-1 text-[12px]"><Star className="h-3 w-3 text-amber-400" /> {r.managerRating || '—'}</span></td>
                      <td className="table-cell"><span className="inline-flex items-center gap-1 text-[12px]"><Star className="h-3 w-3 text-amber-400" /> {r.hrRating || '—'}</span></td>
                      <td className="table-cell"><div className="flex items-center gap-2"><ProgressBar value={avgProgress(r)} tone={avgProgress(r) >= 75 ? 'green' : avgProgress(r) >= 45 ? 'amber' : 'red'} className="w-24" /><span className="tabular text-[11px] font-semibold">{avgProgress(r)}%</span></div></td>
                      <td className="table-cell"><StatusBadge status={r.status} /></td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /> Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedId(r.id)}>View <ChevronRight className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!rows.length && <EmptyState icon={Target} title="No reviews match your filters" description="Adjust the status or department filters to see more of the review cycle." action={<Button variant="secondary" onClick={() => { setSearch(''); setStatus('All'); setDepartment('All') }}>Clear filters</Button>} />}
          </div>
          {totalItems > 0 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={totalItems}
              from={rows.length ? from + 1 : 0}
              to={rows.length ? from + rows.length : 0}
              onPage={setPage}
              pageSize={reviewMeta?.pageSize ?? pageSize}
              onPageSize={(n) => { setPageSize(n); setPage(1) }}
              label="reviews"
            />
          )}
        </Card>
      ) : (
        <Card className="mt-3">
          <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {goalRows.slice(0, 20).map((g) => (
              <div key={`${g.reviewId}-${g.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${g.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : g.status === 'At Risk' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'}`}><Flag className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{g.title}</p>
                    <p className="text-[11px] text-slate-400">{g.owner ? `${g.owner.firstName} ${g.owner.lastName}` : ''} · target: {g.target} · weight {g.weight}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:w-[290px]">
                  <ProgressBar value={g.progress} tone={g.status === 'Completed' ? 'green' : g.status === 'At Risk' ? 'red' : 'brand'} className="flex-1" />
                  <span className="tabular w-10 text-right text-[11px] font-semibold">{g.progress}%</span>
                  <StatusBadge status={g.status} />
                </div>
              </div>
            ))}
            {!goalRows.length && <EmptyState icon={Target} title="No goals match" description="Try another goal state or search term." />}
          </div>
        </Card>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Performance review"
        description={selected ? `${selected.id} · ${selected.cycle}` : ''}
        width="lg"
        footer={selected ? (
          <>
            {access.can('performance.write') && (
              <Button variant="ghost" className="mr-auto text-rose-600 dark:text-rose-400" onClick={() => setDeleteTarget(selected)}><Trash2 className="h-4 w-4" /> Delete</Button>
            )}
            {access.can('performance.write') && (
              <Button variant="secondary" onClick={() => openEdit(selected)}><Pencil className="h-4 w-4" /> Edit</Button>
            )}
            {canAdvanceReview(selected) && (
              <Button onClick={() => setConfirmAdvance(selected)}>{nextStatus(selected.status)} <ArrowRight className="h-4 w-4" /></Button>
            )}
            {!access.can('performance.write') && !canAdvanceReview(selected) && (
              <span className="text-[11px] text-slate-400" title={describeMissingPermission('performance.write')}>
                {describeMissingPermission('performance.write')}
              </span>
            )}
          </>
        ) : null}
      >
        {selected && (() => {
          const e = empMap.get(selected.employeeId)
          const stage = FLOW.indexOf(selected.status)
          const next = nextStatus(selected.status)
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                <Avatar name={e ? `${e.firstName} ${e.lastName}` : selected.employeeId} src={e?.photo} size="lg" />
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 dark:text-slate-100">{e ? `${e.firstName} ${e.lastName}` : selected.employeeId}</p><p className="text-[11px] text-slate-400">{e?.designation} · {e?.department}</p><p className="text-[10px] text-slate-400">Due {fmtDate(selected.dueDate)} · manager {selected.manager}</p></div>
                <StatusBadge status={selected.status} />
              </div>

              <div>
                <h4 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Review progress</h4>
                <div className="space-y-2.5">
                  {FLOW.map((s, i) => (
                    <div key={s} className="flex items-center gap-2.5">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${i < stage ? 'bg-emerald-500 text-white' : i === stage ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>{i < stage ? <Check className="h-3 w-3" /> : i + 1}</span>
                      <span className={`flex-1 text-[11px] ${i <= stage ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{s}</span>
                      {i === stage && <Badge tone="brand">Current</Badge>}
                      {i < stage && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[{ label: 'Self', value: selected.selfRating, tone: 'brand' }, { label: 'Manager', value: selected.managerRating, tone: 'violet' }, { label: 'HR', value: selected.hrRating, tone: 'amber' }].map((rating) => (
                  <div key={rating.label} className="rounded-xl border border-slate-100 p-3 text-center dark:border-white/[0.06]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{rating.label} rating</p>
                    <p className="mt-1 flex items-center justify-center gap-1 text-xl font-bold">{rating.value || '—'} <Star className="h-3.5 w-3.5 text-amber-400" /></p>
                    <div className="mt-1 flex justify-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <span key={i} className={`h-1 w-3 rounded-full ${i < rating.value ? 'bg-amber-400' : 'bg-slate-100 dark:bg-white/10'}`} />)}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2.5 flex items-center justify-between"><h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Goals & objectives</h4><span className="text-[10px] text-slate-400">Avg. {avgProgress(selected)}% complete</span></div>
                <div className="space-y-3">
                  {selected.goals.map((g) => (
                    <div key={g.id} className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1"><p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{g.title}</p><p className="text-[10px] text-slate-400">{g.target} · weight {g.weight}%</p></div>
                        <StatusBadge status={g.status} />
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <ProgressBar value={g.progress} tone={g.status === 'Completed' ? 'green' : g.status === 'At Risk' ? 'red' : 'brand'} className="flex-1" />
                        <span className="tabular w-9 text-right text-[10px] font-semibold">{g.progress}%</span>
                        <button onClick={() => adjustGoal(selected.id, g.id, -5)} disabled={g.progress <= 0} className="rounded-md border border-slate-200 p-0.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5"><Minus className="h-3 w-3" /></button>
                        <button onClick={() => adjustGoal(selected.id, g.id, 5)} disabled={g.progress >= 100} className="rounded-md border border-slate-200 p-0.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                  {!selected.goals.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-white/[0.03]">No goals have been set for this review.</p>}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Strengths</p><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{selected.strengths || 'Not captured yet.'}</p></div>
                <div className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Development areas</p><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{selected.improvements || 'Not captured yet.'}</p></div>
                <div className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]"><p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Overall comments</p><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{selected.comments || 'Not captured yet.'}</p></div>
              </div>

              {next && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 dark:border-brand-500/20 dark:bg-brand-500/[0.06]">
                  <div><p className="text-[11px] font-semibold text-brand-700 dark:text-brand-300">Next step · {next}</p><p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Advance the review when this stage is complete.</p></div>
                  <Button size="sm" onClick={() => setConfirmAdvance(selected)}>Advance</Button>
                </div>
              )}
            </div>
          )
        })()}
      </Drawer>

      <Modal
        open={!!modal}
        onClose={() => { setModal(null); setEditing(null) }}
        title={editing ? 'Edit review' : 'Create a performance review'}
        description={editing ? `${editing.id} · ${editing.cycle}` : 'Add an employee to the current review cycle with a starter goal set.'}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => { setModal(null); setEditing(null) }}>Cancel</Button><Button onClick={saveReview}>{editing ? 'Save changes' : 'Create review'}</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" required error={errors.employeeId}>
            <Select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} disabled={!!editing}>
              <option value="">Select employee</option>
              {db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.department}</option>)}
            </Select>
          </Field>
          <Field label="Review cycle" required error={errors.cycle}><Input value={form.cycle} onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))} placeholder="H2 2026 Performance Cycle" invalid={!!errors.cycle} /></Field>
          <Field label="Due date" required error={errors.dueDate}><Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} invalid={!!errors.dueDate} /></Field>
          <div className="hidden sm:block" />
          <Field label="Self rating"><Select value={form.selfRating} onChange={(e) => setForm((f) => ({ ...f, selfRating: e.target.value }))}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'Not rated' : `${n} / 5`}</option>)}</Select></Field>
          <Field label="Manager rating"><Select value={form.managerRating} onChange={(e) => setForm((f) => ({ ...f, managerRating: e.target.value }))}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'Not rated' : `${n} / 5`}</option>)}</Select></Field>
          <Field label="HR rating"><Select value={form.hrRating} onChange={(e) => setForm((f) => ({ ...f, hrRating: e.target.value }))}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'Not rated' : `${n} / 5`}</option>)}</Select></Field>
          <div className="hidden sm:block" />
          <Field label="Strengths" className="sm:col-span-2"><Textarea value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} placeholder="What went especially well?" /></Field>
          <Field label="Development areas" className="sm:col-span-2"><Textarea value={form.improvements} onChange={(e) => setForm((f) => ({ ...f, improvements: e.target.value }))} placeholder="Where should the employee focus next?" /></Field>
          <Field label="Overall comments" className="sm:col-span-2"><Textarea value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} placeholder="Summary and recommendation…" /></Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmAdvance}
        onClose={() => setConfirmAdvance(null)}
        onConfirm={advance}
        title={confirmAdvance && nextStatus(confirmAdvance.status) === 'Completed' ? 'Complete this review?' : 'Advance review stage?'}
        description={confirmAdvance ? `This moves the ${confirmAdvance.cycle} review for ${empMap.get(confirmAdvance.employeeId)?.firstName || 'the employee'} ${empMap.get(confirmAdvance.employeeId)?.lastName || ''} from ${confirmAdvance.status} to ${nextStatus(confirmAdvance.status)}.` : ''}
        confirmLabel={confirmAdvance && nextStatus(confirmAdvance.status) === 'Completed' ? 'Complete review' : 'Advance stage'}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeReview}
        title="Delete this review?"
        description={deleteTarget ? `${deleteTarget.id} and its goals will be removed from the local demo.` : ''}
        confirmLabel="Delete review"
        tone="danger"
      />
    </>
  )}
  </div>
  )
}
