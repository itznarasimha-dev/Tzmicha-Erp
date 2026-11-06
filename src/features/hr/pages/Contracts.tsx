import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, ArrowUpDown, CalendarClock, CheckCircle2, ChevronRight, Download, FileSignature,
  FileText, Pencil, Plus, Search, ShieldCheck, Trash2, TrendingUp, Users,
} from 'lucide-react'
import { useStore } from '../store'
import type { Contract, ContractStatus } from '../types'
import { downloadCSV, fmtDate, fmtMoney, sum, todayISO } from '../lib/utils'
import { contractDaysRemaining, effectiveContractStatus } from '../lib/hr'
import { ContractModal } from '../components/contract-modal'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, PageHeader, Pagination, SearchInput,
  Select, StatCard, StatusBadge,
} from '../components/ui'

const STATUSES: ContractStatus[] = ['Draft', 'Pending Review', 'Pending Signature', 'Active', 'Expiring Soon', 'Expired', 'Renewed', 'Terminated']
type SortKey = 'recent' | 'expiry' | 'value' | 'name'

export default function Contracts() {
  const { db, update, logActivity, toast } = useStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [partyType, setPartyType] = useState('All')
  const [department, setDepartment] = useState('All')
  const [sort, setSort] = useState<SortKey>('recent')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [deleting, setDeleting] = useState<Contract | null>(null)

  const enriched = useMemo(
    () => db.contracts.map((c) => ({ ...c, effectiveStatus: effectiveContractStatus(c), daysRemaining: contractDaysRemaining(c) })),
    [db.contracts],
  )

  const counts = useMemo(() => ({
    total: enriched.length,
    active: enriched.filter((c) => c.effectiveStatus === 'Active').length,
    expiring: enriched.filter((c) => c.effectiveStatus === 'Expiring Soon').length,
    expired: enriched.filter((c) => c.effectiveStatus === 'Expired').length,
    signatures: enriched.filter((c) => c.effectiveStatus === 'Pending Signature' || c.signatures.some((s) => s.status === 'Pending')).length,
    review: enriched.filter((c) => c.effectiveStatus === 'Pending Review' || c.effectiveStatus === 'Draft').length,
    value: sum(enriched.filter((c) => !['Terminated', 'Expired'].includes(c.effectiveStatus)).map((c) => c.value)),
  }), [enriched])

  const alerts = useMemo(
    () => enriched
      .filter((c) => ['Expiring Soon', 'Expired'].includes(c.effectiveStatus))
      .sort((a, b) => a.daysRemaining - b.daysRemaining),
    [enriched],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = enriched.filter((c) => {
      const matchSearch = !q || c.title.toLowerCase().includes(q) || c.partyName.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.contractType.toLowerCase().includes(q)
      return matchSearch && (status === 'All' || c.effectiveStatus === status) && (partyType === 'All' || c.partyType === partyType) && (department === 'All' || c.department === department)
    })
    return list.sort((a, b) => {
      if (sort === 'expiry') return a.daysRemaining - b.daysRemaining
      if (sort === 'value') return b.value - a.value
      if (sort === 'name') return a.title.localeCompare(b.title)
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [enriched, search, status, partyType, department, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const from = (currentPage - 1) * pageSize
  const rows = filtered.slice(from, from + pageSize)

  const resetFilters = () => {
    setSearch(''); setStatus('All'); setPartyType('All'); setDepartment('All'); setPage(1)
  }

  const exportContracts = () => {
    downloadCSV('titan-hr-contracts.csv', [
      ['Contract ID', 'Title', 'Party', 'Party type', 'Department', 'Contract type', 'Start date', 'End date', 'Days remaining', 'Value (USD)', 'Frequency', 'Status', 'Pending signatures'],
      ...filtered.map((c) => [c.id, c.title, c.partyName, c.partyType, c.department, c.contractType, c.startDate, c.endDate, c.daysRemaining, c.value, c.paymentFrequency, c.effectiveStatus, c.signatures.filter((s) => s.status === 'Pending').length]),
    ])
    toast('Contract register exported', 'success', `${filtered.length} contracts written to CSV.`)
  }

  const removeContract = () => {
    if (!deleting) return
    update((d) => ({ ...d, contracts: d.contracts.filter((c) => c.id !== deleting.id) }))
    logActivity('contract', 'Contract deleted', `${deleting.title} · ${deleting.id}`)
    toast('Contract removed', 'success', `${deleting.id} has been deleted from the local register.`)
    setDeleting(null)
  }

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Govern employment, contractor and vendor agreements with expiry monitoring, signature tracking and renewal workflows."
        crumbs={['Finance & Legal', 'Contracts']}
        actions={
          <>
            <Button variant="secondary" onClick={exportContracts} disabled={!filtered.length}><Download className="h-4 w-4" /> Export</Button>
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}><Plus className="h-4 w-4" /> New contract</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <StatCard index={0} label="Total contracts" value={counts.total} icon={FileSignature} tone="brand" hint={`${fmtMoney(counts.value, true)} active value`} onClick={resetFilters} />
        <StatCard index={1} label="Active" value={counts.active} icon={CheckCircle2} tone="green" hint="In force today" onClick={() => { setStatus('Active'); setPage(1) }} />
        <StatCard index={2} label="Expiring soon" value={counts.expiring} icon={CalendarClock} tone="amber" hint="Within 30 days" onClick={() => { setStatus('Expiring Soon'); setPage(1) }} />
        <StatCard index={3} label="Expired" value={counts.expired} icon={AlertTriangle} tone="red" hint="Needs action" onClick={() => { setStatus('Expired'); setPage(1) }} />
        <StatCard index={4} label="Pending signatures" value={counts.signatures} icon={Pencil} tone="violet" hint="Awaiting signatories" onClick={() => { setStatus('Pending Signature'); setPage(1) }} />
        <StatCard index={5} label="In review" value={counts.review} icon={ShieldCheck} tone="blue" hint="Draft or internal review" onClick={() => { setStatus('Pending Review'); setPage(1) }} />
      </div>

      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 dark:border-amber-500/20 dark:from-amber-500/[0.08] dark:to-orange-500/[0.03]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"><AlertTriangle className="h-4.5 w-4.5" /></div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{alerts.length} contract{alerts.length === 1 ? '' : 's'} need attention</p>
                <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-300/70">Expired agreements or renewals due within 30 days. Review terms before the deadline.</p>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
              {alerts.slice(0, 3).map((c) => (
                <button key={c.id} onClick={() => navigate(`/contracts/${c.id}`)} className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-white/80 px-2.5 py-1.5 text-left text-[11px] transition hover:border-amber-300 hover:bg-white dark:border-amber-500/20 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]">
                  <span className="max-w-[170px] truncate font-semibold text-amber-900 dark:text-amber-200">{c.title}</span>
                  <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">{c.daysRemaining < 0 ? `${Math.abs(c.daysRemaining)}d overdue` : `${c.daysRemaining}d left`}</span>
                  <ChevronRight className="h-3 w-3 text-amber-500" />
                </button>
              ))}
              {alerts.length > 3 && <Badge tone="amber">+{alerts.length - 3} more</Badge>}
            </div>
          </div>
        </motion.div>
      )}

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/[0.05] xl:flex-row xl:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search contracts, parties or IDs…" className="w-full xl:max-w-sm" />
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-auto min-w-[150px]"><option value="All">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
            <Select value={partyType} onChange={(e) => { setPartyType(e.target.value); setPage(1) }} className="w-auto"><option value="All">All parties</option><option>Employee</option><option>Contractor</option><option>Vendor</option></Select>
            <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1) }} className="w-auto"><option value="All">All departments</option>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto">
              <option value="recent">Newest first</option><option value="expiry">Expiry date</option><option value="value">Highest value</option><option value="name">Title A–Z</option>
            </Select>
            {(search || status !== 'All' || partyType !== 'All' || department !== 'All') && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1140px]">
            <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
              <tr>
                <th className="table-head">Contract</th>
                <th className="table-head">Party</th>
                <th className="table-head">Type</th>
                <th className="table-head text-right">Value</th>
                <th className="table-head">Term</th>
                <th className="table-head">Expiry</th>
                <th className="table-head">Signatures</th>
                <th className="table-head">Status</th>
                <th className="table-head text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const pendingSig = c.signatures.filter((s) => s.status === 'Pending').length
                return (
                  <tr key={c.id} className="table-row cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><FileText className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <p className="max-w-[240px] truncate font-semibold text-slate-800 dark:text-slate-100">{c.title}</p>
                          <p className="text-[11px] text-slate-400">{c.id} · {c.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <p className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">{c.partyName}</p>
                      <p className="text-[11px] text-slate-400">{c.partyType}</p>
                    </td>
                    <td className="table-cell"><p className="max-w-[170px] truncate text-[12px]">{c.contractType}</p><p className="text-[11px] text-slate-400">{c.paymentFrequency}</p></td>
                    <td className="table-cell text-right tabular font-semibold text-slate-900 dark:text-white">{c.value ? fmtMoney(c.value) : '—'}</td>
                    <td className="table-cell"><p className="text-[12px]">{fmtDate(c.startDate)}</p><p className="text-[11px] text-slate-400">to {fmtDate(c.endDate)}</p></td>
                    <td className="table-cell">
                      {c.daysRemaining < 0 ? <Badge tone="red">{Math.abs(c.daysRemaining)}d overdue</Badge> : c.daysRemaining <= 30 ? <Badge tone="amber">{c.daysRemaining}d left</Badge> : <span className="text-[12px] text-slate-500">{c.daysRemaining}d</span>}
                    </td>
                    <td className="table-cell">
                      {pendingSig ? <Badge tone="violet">{pendingSig} pending</Badge> : <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</span>}
                    </td>
                    <td className="table-cell"><StatusBadge status={c.effectiveStatus} /></td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <IconButton aria-label={`Edit ${c.title}`} onClick={() => { setEditing(c); setModalOpen(true) }}><Pencil className="h-3.5 w-3.5" /></IconButton>
                        <IconButton aria-label={`Delete ${c.title}`} onClick={() => setDeleting(c)} className="hover:text-rose-600 dark:hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></IconButton>
                        <IconButton aria-label={`Open ${c.title}`} onClick={() => navigate(`/contracts/${c.id}`)}><ChevronRight className="h-4 w-4" /></IconButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && (
            <EmptyState
              icon={FileSignature}
              title={db.contracts.length ? 'No contracts match your filters' : 'No contracts yet'}
              description={db.contracts.length ? 'Try a different search term, status or party type. Your demo register is intact.' : 'Create your first agreement to start tracking signatures, renewals and payments.'}
              action={db.contracts.length ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : <Button onClick={() => { setEditing(null); setModalOpen(true) }}><Plus className="h-4 w-4" /> New contract</Button>}
            />
          )}
        </div>

        {filtered.length > 0 && (
          <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} from={from} to={Math.min(from + pageSize, filtered.length)} onPage={setPage} pageSize={pageSize} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="contracts" />
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Portfolio health</h3>
              <p className="mt-0.5 text-xs text-slate-400">Contract distribution across the register</p>
            </div>
            <Badge tone="brand" dot>Live demo data</Badge>
          </div>
          <div className="space-y-3">
            {STATUSES.map((s) => {
              const count = enriched.filter((c) => c.effectiveStatus === s).length
              const pct = counts.total ? Math.round((count / counts.total) * 100) : 0
              return (
                <button key={s} onClick={() => { setStatus(s); setPage(1) }} className="flex w-full items-center gap-3 text-left">
                  <span className="w-32 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">{s}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} className={`h-full rounded-full ${s === 'Expired' || s === 'Terminated' ? 'bg-rose-500' : s === 'Expiring Soon' ? 'bg-amber-500' : s === 'Active' ? 'bg-emerald-500' : s === 'Renewed' ? 'bg-violet-500' : 'bg-brand-500'}`} />
                  </div>
                  <span className="tabular w-12 shrink-0 text-right text-[11px] font-semibold text-slate-700 dark:text-slate-200">{count} <span className="font-normal text-slate-400">/{pct}%</span></span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold">Closing this quarter</h3>
          <p className="mt-0.5 text-xs text-slate-400">Contracts ending in the next 90 days</p>
          <div className="mt-4 space-y-2.5">
            {enriched.filter((c) => c.daysRemaining >= 0 && c.daysRemaining <= 90 && !['Terminated', 'Renewed'].includes(c.effectiveStatus)).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 4).map((c) => (
              <button key={c.id} onClick={() => navigate(`/contracts/${c.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-2.5 text-left transition hover:border-brand-200 hover:bg-brand-50/40 dark:border-white/[0.06] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/[0.05]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"><CalendarClock className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">{c.title}</span><span className="block text-[10px] text-slate-400">{c.partyName}</span></span>
                <Badge tone={c.daysRemaining <= 30 ? 'amber' : 'slate'}>{c.daysRemaining}d</Badge>
              </button>
            ))}
            {!enriched.some((c) => c.daysRemaining >= 0 && c.daysRemaining <= 90 && !['Terminated', 'Renewed'].includes(c.effectiveStatus)) && (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-white/[0.03]">No contracts close in the next 90 days.</p>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50/70 p-3 text-[11px] text-brand-700 dark:bg-brand-500/[0.07] dark:text-brand-300">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>{fmtMoney(counts.value, true)} of active contract value under management.</span>
          </div>
        </Card>
      </div>

      <ContractModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} contract={editing} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={removeContract}
        title="Delete contract?"
        description={deleting ? `${deleting.id} · ${deleting.title} will be removed from the local register. This demo action cannot be undone unless you reset demo data.` : ''}
        confirmLabel="Delete contract"
        tone="danger"
      />
    </div>
  )
}
