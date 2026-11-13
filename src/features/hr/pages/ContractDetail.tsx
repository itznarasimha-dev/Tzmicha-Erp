import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronRight, CircleDollarSign,
  Clock3, Download, FileCheck2, FileSignature, FileText, History, Pencil, Plus, RefreshCw,
  Send, ShieldCheck, Trash2, Users, XCircle,
} from 'lucide-react'
import { useStore } from '../store'
import { describeMissingPermission, useHrAccess } from '../lib/access'
import { runHrApiAction, hrActions } from '../api-actions'
import type { Contract, ContractSignature, DocFile } from '../types'
import { addDays, downloadCSV, fmtDate, fmtDateTime, fmtMoney, sum, todayISO, uid } from '../lib/utils'
import { contractDaysRemaining, effectiveContractStatus } from '../lib/hr'
import { ContractModal } from '../components/contract-modal'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, DocumentPreview, DocumentRow, EmptyState, Field,
  FileDrop, InfoRow, PageHeader, ProgressBar, SectionCard, Skeleton, StatusBadge, Tabs, Textarea,
} from '../components/ui'
import { HrPermissionNotice } from '../components/hr-guard'

type Tab = 'overview' | 'documents' | 'schedule' | 'activity'

const FLOW: Contract['status'][] = ['Draft', 'Pending Review', 'Pending Signature', 'Active']

const flowDescription: Record<string, string> = {
  Draft: 'Draft agreements are internal only. Review the terms, then submit for internal review.',
  'Pending Review': 'Legal and People Ops are reviewing the agreement. Once approved, send it for signature.',
  'Pending Signature': 'At least one signatory has not signed yet. Send reminders or mark signatures complete as they return.',
  Active: 'The contract is in force. Monitor expiry, payment schedule and renewal timelines.',
  'Expiring Soon': 'This contract ends within 30 days. Renew it or confirm termination with the counterparty.',
  Expired: 'The end date has passed. Renew, terminate, or close out the agreement.',
  Renewed: 'The agreement has been renewed. A new term should be tracked in the register.',
  Terminated: 'The agreement was terminated early. Historical records are retained for audit.',
}

export default function ContractDetail() {
  const access = useHrAccess()
  const { id } = useParams()
  const navigate = useNavigate()
  const { db, update, logActivity, toast, dataSource, refreshFromApi, syncStatus } = useStore()
  const contract = db.contracts.find((c) => c.id === id)
  const [tab, setTab] = useState<Tab>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [preview, setPreview] = useState<DocFile | null>(null)
  const [renewOpen, setRenewOpen] = useState(false)
  const [terminateOpen, setTerminateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [stepConfirm, setStepConfirm] = useState<null | 'review' | 'signature' | 'activate'>(null)
  const [note, setNote] = useState('')

  const employee = useMemo(
    () => (contract?.employeeId ? db.employees.find((e) => e.id === contract.employeeId) : undefined),
    [contract, db.employees],
  )

  /** Payments recorded against this contract (ERP API data when connected). */
  const relatedPayments = useMemo(
    () => db.payments.filter((p) => p.contractId === contract?.id),
    [db.payments, contract?.id],
  )

  // In API mode the contract register hydrates asynchronously; avoid the
  // "not found" flash while the detail is still being fetched.
  if (!contract && dataSource === 'api' && syncStatus === 'loading') {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[320px]" />
        <p className="text-center text-xs text-slate-400">Loading contract details…</p>
      </div>
    )
  }

  if (!contract) {
    return (
      <Card className="mx-auto max-w-lg">
        <EmptyState
          icon={FileSignature}
          title="Contract not found"
          description="This contract may have been deleted or the link is out of date. Return to the register to continue."
          action={<Button onClick={() => navigate('/contracts')}><ArrowLeft className="h-4 w-4" /> Back to contracts</Button>}
        />
      </Card>
    )
  }

  const status = effectiveContractStatus(contract)
  const days = contractDaysRemaining(contract)
  const pendingSignatures = contract.signatures.filter((s) => s.status === 'Pending').length
  const paidSchedule = sum(contract.paymentSchedule.filter((p) => p.status === 'Paid').map((p) => p.amount))
  const outstanding = sum(contract.paymentSchedule.filter((p) => p.status !== 'Paid').map((p) => p.amount))
  const flowIndex = Math.max(0, FLOW.indexOf(status))
  const locked = ['Terminated', 'Renewed'].includes(status)

  const addHistory = (action: string, actor = 'Aisha Bello') => ({
    id: uid('ch'), date: todayISO(), action, actor,
  })

  const updateContract = (patch: Partial<Contract>, action: string, message: string, description: string) => {
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? { ...c, ...patch, history: [...c.history, addHistory(action)] } : c)),
    }))
    logActivity('contract', message, `${contract.title} · ${contract.id}`)
    toast(message, 'success', description)
  }

  const runStep = async () => {
    const apiAction: Record<string, 'submit' | 'request_signature' | 'activate'> = {
      review: 'submit',
      signature: 'request_signature',
      activate: 'activate',
    }
    const action = apiAction[stepConfirm!]

    if (dataSource === 'api') {
      await runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.changeContractStatus(contract.id, action!, `Contract ${stepConfirm}`),
        successMessage: `Contract ${stepConfirm}`,
        successDescription: `${contract.title} · ${contract.id}`,
        errorTitle: `Could not ${stepConfirm} contract`,
      })
      setStepConfirm(null)
      return
    }

    if (stepConfirm === 'review') {
      updateContract({ status: 'Pending Review' }, 'Submitted for internal review', 'Contract submitted for review', 'Legal and People Ops can now review the agreement.')
    }
    if (stepConfirm === 'signature') {
      updateContract({ status: 'Pending Signature' }, 'Sent for signature', 'Signature requests sent', 'Both signatories have been notified in this demo workspace.')
    }
    if (stepConfirm === 'activate') {
      updateContract({ status: 'Active' }, 'Status set to Active', 'Contract activated', 'The agreement is now in force and expiry monitoring has started.')
    }
    setStepConfirm(null)
  }

  const sign = (sig: ContractSignature) => {
    const signatures = contract.signatures.map((s) => (s.id === sig.id ? { ...s, status: 'Signed' as const, signedAt: todayISO() } : s))
    const allSigned = signatures.every((s) => s.status === 'Signed')
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? {
        ...c, signatures,
        status: allSigned && c.status === 'Pending Signature' ? 'Active' : c.status,
        history: [...c.history, addHistory(`${sig.name} signed the contract`)],
      } : c)),
    }))
    logActivity('contract', 'Contract signed', `${contract.title} · ${sig.name}`)
    toast('Signature recorded', 'success', allSigned ? 'All signatures complete — the contract is now active.' : `${sig.name}'s signature has been captured.`)
  }

  const remind = (sig: ContractSignature) => {
    logActivity('contract', 'Signature reminder sent', `${contract.title} · ${sig.name}`)
    toast('Reminder sent', 'info', `A demo reminder was queued for ${sig.name}.`)
  }

  const renew = async () => {
    const newEnd = addDays(contract.endDate, 365)
    if (dataSource === 'api') {
      // The changeContractStatus endpoint only transitions action/reason and does
      // not accept a new end date, so renewal is kept as demo-local until a
      // dedicated renew-with-end-date endpoint exists.
      update((d) => ({
        ...d,
        contracts: d.contracts.map((c) => (c.id === contract.id ? {
          ...c, endDate: newEnd, status: 'Active',
          history: [...c.history, addHistory(`Contract renewed to ${fmtDate(newEnd)}`)],
        } : c)),
      }))
      logActivity('contract', 'Contract renewed', `${contract.title} · new end date ${fmtDate(newEnd)}`)
      toast('Contract renewed (demo)', 'success', `Term extended by 12 months to ${fmtDate(newEnd)}. Demo data is not saved to the database.`)
      setRenewOpen(false)
      return
    }
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? {
        ...c, endDate: newEnd, status: 'Active',
        history: [...c.history, addHistory(`Contract renewed to ${fmtDate(newEnd)}`)],
      } : c)),
    }))
    logActivity('contract', 'Contract renewed', `${contract.title} · new end date ${fmtDate(newEnd)}`)
    toast('Contract renewed (demo)', 'success', `Term extended by 12 months to ${fmtDate(newEnd)}. Demo data is not saved to the database.`)
    setRenewOpen(false)
  }

  const terminate = async () => {
    if (dataSource === 'api') {
      await runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.changeContractStatus(contract.id, 'terminate', 'Contract terminated by user action'),
        successMessage: 'Contract terminated',
        successDescription: `${contract.title} · ${contract.id}`,
        errorTitle: 'Could not terminate contract',
      })
      setTerminateOpen(false)
      return
    }
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? {
        ...c, status: 'Terminated',
        history: [...c.history, addHistory('Contract terminated')],
      } : c)),
    }))
    logActivity('contract', 'Contract terminated', contract.title)
    toast('Contract terminated (demo)', 'warning', 'The agreement is marked terminated. Records are retained. Demo data is not saved to the database.')
    setTerminateOpen(false)
  }

  const remove = () => {
    // No delete contract endpoint exists in the current HR API; keep demo-local.
    update((d) => ({ ...d, contracts: d.contracts.filter((c) => c.id !== contract.id) }))
    logActivity('contract', 'Contract deleted', `${contract.title} · ${contract.id}`)
    toast('Contract deleted (demo)', 'success', `${contract.id} was removed from the register. Demo data is not saved to the database.`)
    navigate('/contracts')
  }

  const uploadDocs = (docs: DocFile[]) => {
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? {
        ...c, documents: [...docs, ...c.documents],
        history: [...c.history, addHistory(`${docs.length} document${docs.length === 1 ? '' : 's'} uploaded`)],
      } : c)),
    }))
    toast('Documents uploaded', 'success', `${docs.length} file${docs.length === 1 ? '' : 's'} added locally for preview.`)
  }

  const verifyDoc = (doc: DocFile) => {
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? {
        ...c, documents: c.documents.map((x) => (x.id === doc.id ? { ...x, status: 'Verified' } : x)),
        history: [...c.history, addHistory(`${doc.name} verified`)],
      } : c)),
    }))
    toast('Document verified', 'success', `${doc.name} is marked as verified.`)
  }

  const removeDoc = (doc: DocFile) => {
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? {
        ...c, documents: c.documents.filter((x) => x.id !== doc.id),
        history: [...c.history, addHistory(`${doc.name} removed`)],
      } : c)),
    }))
    toast('Document removed', 'info', `${doc.name} was removed from this contract.`)
  }

  const markPaid = (itemId: string) => {
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? {
        ...c, paymentSchedule: c.paymentSchedule.map((p) => (p.id === itemId ? { ...p, status: 'Paid' } : p)),
        history: [...c.history, addHistory('Payment schedule item marked paid')],
      } : c)),
    }))
    toast('Payment marked paid', 'success', 'The schedule item is settled in this demo contract.')
  }

  const addNote = () => {
    if (!note.trim()) {
      toast('Add a note first', 'warning', 'Activity notes cannot be empty.')
      return
    }
    update((d) => ({
      ...d,
      contracts: d.contracts.map((c) => (c.id === contract.id ? { ...c, history: [...c.history, addHistory(note.trim())] } : c)),
    }))
    logActivity('contract', 'Contract note added', `${contract.title} · ${note.trim().slice(0, 60)}`)
    toast('Note added', 'success', 'The note is recorded in the contract activity timeline.')
    setNote('')
  }

  const exportContract = () => {
    downloadCSV(`contract-${contract.id}.csv`, [
      ['TITAN HR — CONTRACT SUMMARY'], ['Contract ID', contract.id], ['Title', contract.title],
      ['Party', contract.partyName], ['Party type', contract.partyType], ['Department', contract.department],
      ['Contract type', contract.contractType], ['Start date', contract.startDate], ['End date', contract.endDate],
      ['Days remaining', days], ['Value (USD)', contract.value], ['Payment frequency', contract.paymentFrequency],
      ['Status', status], [],
      ['SIGNATURES'], ['Name', 'Role', 'Status', 'Signed at'],
      ...contract.signatures.map((s) => [s.name, s.role, s.status, s.signedAt || '']),
      [],
      ['PAYMENT SCHEDULE'], ['Due date', 'Amount (USD)', 'Status'],
      ...contract.paymentSchedule.map((p) => [p.dueDate, p.amount, p.status]),
      [],
      ['ACTIVITY'], ['Date', 'Action', 'Actor'],
      ...contract.history.map((h) => [h.date, h.action, h.actor]),
    ])
    toast('Contract exported', 'success', `${contract.id} summary, signatures and schedule written to CSV.`)
  }

  const nextAction = status === 'Draft'
    ? { label: 'Submit for review', icon: Send, onClick: () => setStepConfirm('review') }
    : status === 'Pending Review'
      ? { label: 'Send for signature', icon: Send, onClick: () => setStepConfirm('signature') }
      : status === 'Pending Signature'
        ? { label: 'Review signatures', icon: FileSignature, onClick: () => setTab('overview') }
        : null

  return (
    <div>
      <PageHeader
        title={contract.title}
        subtitle={`${contract.id} · ${contract.partyType} agreement for ${contract.partyName}`}
        crumbs={['Finance & Legal', 'Contracts', contract.id]}
        badge={<StatusBadge status={status} />}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/contracts')}><ArrowLeft className="h-4 w-4" /> Register</Button>
            <Button variant="secondary" onClick={exportContract}><Download className="h-4 w-4" /> Export</Button>
            <Button onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          </>
        }
      />

      {days < 0 && !['Terminated', 'Renewed'].includes(status) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm dark:border-rose-500/20 dark:bg-rose-500/[0.07]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <p className="flex-1 text-rose-800 dark:text-rose-300"><span className="font-semibold">This contract expired {Math.abs(days)} days ago.</span> Renew the terms or record termination to keep the register accurate.</p>
          <Button size="sm" onClick={() => setRenewOpen(true)}><RefreshCw className="h-3.5 w-3.5" /> Renew now</Button>
        </div>
      )}
      {days >= 0 && days <= 30 && !['Terminated', 'Renewed', 'Pending Signature', 'Draft', 'Pending Review'].includes(status) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
          <Clock3 className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-amber-800 dark:text-amber-300"><span className="font-semibold">{days} days remaining.</span> Start the renewal conversation before {fmtDate(contract.endDate)}.</p>
          <Button size="sm" variant="secondary" onClick={() => setRenewOpen(true)}><RefreshCw className="h-3.5 w-3.5" /> Renew</Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <Card className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-500/[0.07] blur-3xl" />
            <div className="relative p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-500/25"><FileSignature className="h-7 w-7" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold sm:text-xl">{contract.title}</h2>
                    <StatusBadge status={status} />
                    <Badge tone="slate">{contract.partyType}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{contract.contractType} · {contract.department} · <span className="font-mono text-[11px]">{contract.id}</span></p>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <InfoRow label="Contract value" value={<span className="tabular">{fmtMoney(contract.value)}</span>} />
                    <InfoRow label="Start date" value={fmtDate(contract.startDate)} />
                    <InfoRow label="End date" value={fmtDate(contract.endDate)} />
                    <InfoRow label="Days remaining" value={<span className={days < 0 ? 'text-rose-600 dark:text-rose-400' : days <= 30 ? 'text-amber-600 dark:text-amber-400' : ''}>{days < 0 ? `${Math.abs(days)} overdue` : `${days} days`}</span>} />
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Agreement lifecycle</p>
                  {!locked && nextAction && <Button size="sm" onClick={nextAction.onClick}>{nextAction.label} <ChevronRight className="h-3.5 w-3.5" /></Button>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {FLOW.map((step, i) => {
                    const complete = i < flowIndex || (status === 'Active' && i <= 3)
                    const current = step === status
                    return (
                      <div key={step} className="flex flex-1 items-center gap-2">
                        <div className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 ${current ? 'border-brand-200 bg-white shadow-sm dark:border-brand-500/30 dark:bg-brand-500/[0.07]' : 'border-transparent'}`}>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${complete ? 'bg-emerald-500 text-white' : current ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>{complete ? <Check className="h-3 w-3" /> : i + 1}</span>
                          <span className={`truncate text-[10.5px] ${current || complete ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{step}</span>
                        </div>
                        {i < FLOW.length - 1 && <ChevronRight className="hidden h-3 w-3 shrink-0 text-slate-300 sm:block" />}
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{flowDescription[status]}</p>
              </div>
            </div>
          </Card>

          <Tabs
            items={[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'documents', label: 'Documents', count: contract.documents.length, icon: FileCheck2 },
              { id: 'schedule', label: 'Payment schedule', count: contract.paymentSchedule.length, icon: CircleDollarSign },
              { id: 'activity', label: 'Activity', count: contract.history.length, icon: History },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Agreement details" subtitle="Commercial terms and ownership">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <InfoRow label="Contract ID" value={contract.id} />
                  <InfoRow label="Contract type" value={contract.contractType} />
                  <InfoRow label="Department" value={contract.department} />
                  <InfoRow label="Payment frequency" value={contract.paymentFrequency} />
                  <InfoRow label="Start date" value={fmtDate(contract.startDate)} />
                  <InfoRow label="End date" value={fmtDate(contract.endDate)} />
                  <InfoRow label="Created" value={fmtDate(contract.createdAt)} />
                  <InfoRow label="Total value" value={<span className="tabular">{fmtMoney(contract.value)}</span>} />
                </dl>
                {contract.notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">{contract.notes}</p>}
              </SectionCard>

              <SectionCard title="Counterparty" subtitle="Who this agreement is with">
                {employee ? (
                  <div>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${employee.firstName} ${employee.lastName}`} src={employee.photo} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{employee.firstName} {employee.lastName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{employee.designation} · {employee.department}</p>
                        <p className="text-[11px] text-slate-400">{employee.email}</p>
                      </div>
                      <Link to={`/employees/${employee.id}`} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">Profile</Link>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <InfoRow label="Employee ID" value={employee.id} />
                      <InfoRow label="Joined" value={fmtDate(employee.joiningDate)} />
                      <InfoRow label="Employment" value={employee.employmentType} />
                      <InfoRow label="Location" value={employee.location} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 dark:border-white/[0.06]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><Users className="h-5 w-5" /></div>
                    <div><p className="font-semibold text-slate-800 dark:text-slate-100">{contract.partyName}</p><p className="text-xs text-slate-400">{contract.partyType} · {contract.department}</p></div>
                  </div>
                )}
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                  <InfoRow label="Signed values" value={fmtMoney(paidSchedule)} />
                  <InfoRow label="Outstanding" value={fmtMoney(outstanding)} />
                </div>
                <ProgressBar className="mt-3" value={contract.value ? (paidSchedule / contract.value) * 100 : 0} tone="green" showLabel />
              </SectionCard>

              <SectionCard title="Signatures" subtitle={`${pendingSignatures} of ${contract.signatures.length} awaiting signature`} className="lg:col-span-2" action={status === 'Pending Signature' ? <Badge tone="violet">Action needed</Badge> : <Badge tone="green">Complete</Badge>}>
                <div className="space-y-3">
                  {contract.signatures.map((sig) => (
                    <div key={sig.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${sig.status === 'Signed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                        {sig.status === 'Signed' ? <CheckCircle2 className="h-4 w-4" /> : <FileSignature className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{sig.name}</p>
                        <p className="text-[11px] text-slate-400">{sig.role} {sig.signedAt ? `· signed ${fmtDate(sig.signedAt)}` : '· awaiting signature'}</p>
                      </div>
                      <StatusBadge status={sig.status} />
                      {sig.status === 'Pending' && !locked && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => remind(sig)}>Remind</Button>
                          <Button size="sm" onClick={() => sign(sig)}><Check className="h-3.5 w-3.5" /> Mark signed</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!contract.signatures.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-white/[0.03]">No signatories recorded for this agreement.</p>}
                </div>
                {status === 'Pending Signature' && contract.signatures.every((s) => s.status === 'Signed') && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">All signatures collected</p>
                    <Button size="sm" onClick={() => setStepConfirm('activate')}>Activate contract</Button>
                  </div>
                )}
              </SectionCard>
            </motion.div>
          )}

          {tab === 'documents' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <SectionCard title="Documents" subtitle={`${contract.documents.length} files · stored locally in this browser`}>
                <FileDrop onFiles={uploadDocs} label="Upload contract documents" hint="Signed copies, addenda, compliance files · PDF, DOCX, PNG or JPG" />
                <div className="mt-4 space-y-2">
                  {contract.documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} onPreview={() => setPreview(doc)} onVerify={() => verifyDoc(doc)} onRemove={() => removeDoc(doc)} />
                  ))}
                  {!contract.documents.length && <EmptyState icon={FileText} title="No documents yet" description="Upload the signed agreement or supporting addenda. Files you upload can be previewed locally." />}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {tab === 'schedule' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total value</p><p className="tabular mt-1 text-lg font-bold">{fmtMoney(contract.value)}</p></Card>
                <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settled</p><p className="tabular mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(paidSchedule)}</p></Card>
                <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outstanding</p><p className="tabular mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">{fmtMoney(outstanding)}</p></Card>
              </div>
              <SectionCard title="Payment schedule" subtitle={`${contract.paymentFrequency} cadence · demo schedule only`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead><tr className="border-b border-slate-100 dark:border-white/[0.06]"><th className="table-head pl-0">Due date</th><th className="table-head">Amount</th><th className="table-head">Status</th><th className="table-head text-right pr-0">Action</th></tr></thead>
                    <tbody>
                      {contract.paymentSchedule.map((p) => {
                        const overdue = p.status !== 'Paid' && p.dueDate < todayISO()
                        const display = p.status === 'Paid' ? 'Paid' : overdue ? 'Overdue' : 'Scheduled'
                        return (
                          <tr key={p.id} className="table-row">
                            <td className="table-cell pl-0"><p className="text-[12.5px] font-medium">{fmtDate(p.dueDate)}</p>{overdue && <p className="text-[10px] text-rose-500">Past due</p>}</td>
                            <td className="table-cell tabular font-semibold">{fmtMoney(p.amount)}</td>
                            <td className="table-cell"><StatusBadge status={display} /></td>
                            <td className="table-cell pr-0 text-right">{p.status === 'Paid' ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Settled</span> : <Button size="sm" variant="secondary" disabled={locked} onClick={() => markPaid(p.id)}>Mark paid</Button>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {!contract.paymentSchedule.length && <EmptyState icon={CircleDollarSign} title="No payment schedule" description="This agreement has no scheduled payments." />}
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Demo schedule — marking an item paid does not move any real money.</p>
              </SectionCard>

              <SectionCard title="Related payments" subtitle="ERP payments recorded against this agreement">
                {relatedPayments.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-slate-400">No payments are linked to this contract yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                      <thead><tr className="border-b border-slate-100 dark:border-white/[0.06]"><th className="table-head pl-0">Payment</th><th className="table-head">Date</th><th className="table-head text-right">Amount</th><th className="table-head">Approval</th><th className="table-head">Payment status</th><th className="table-head text-right pr-0">Action</th></tr></thead>
                      <tbody>
                        {relatedPayments.map((p) => (
                          <tr key={p.id} className="table-row">
                            <td className="table-cell pl-0"><p className="text-[12.5px] font-medium">{p.id}</p><p className="text-[10px] text-slate-400">{p.category}</p></td>
                            <td className="table-cell">{fmtDate(p.date)}</td>
                            <td className="table-cell text-right tabular font-semibold">{fmtMoney(p.amount)}</td>
                            <td className="table-cell"><StatusBadge status={p.approvalStatus} /></td>
                            <td className="table-cell"><StatusBadge status={p.paymentStatus} /></td>
                            <td className="table-cell pr-0 text-right">
                              <Button size="sm" variant="ghost" onClick={() => navigate('/payments')}>Open <ChevronRight className="h-3 w-3" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </motion.div>
          )}

          {tab === 'activity' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <SectionCard title="Activity timeline" subtitle="Every change to this agreement, newest first">
                <div className="relative space-y-5 pl-6">
                  <span className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200 dark:bg-white/10" />
                  {[...contract.history].reverse().map((h, i) => (
                    <div key={h.id} className="relative">
                      <span className={`absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-ink-900 ${i === 0 ? 'bg-brand-500' : 'bg-slate-300 dark:bg-white/20'}`}><span className="h-1.5 w-1.5 rounded-full bg-white" /></span>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{h.action}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{fmtDate(h.date)} · {h.actor}</p>
                    </div>
                  ))}
                  {!contract.history.length && <p className="text-xs text-slate-400">No activity recorded yet.</p>}
                </div>
              </SectionCard>
              <Card className="p-5">
                <h3 className="text-sm font-semibold">Add an activity note</h3>
                <p className="mt-0.5 text-xs text-slate-400">Notes are stored in the local demo database and visible in the timeline.</p>
                <Field className="mt-3"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Renegotiated payment terms with procurement…" /></Field>
                <div className="mt-3 flex justify-end"><Button onClick={addNote}><Plus className="h-4 w-4" /> Add note</Button></div>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Quick facts</h3>
            <dl className="mt-4 space-y-3.5">
              <InfoRow label="Status" value={<StatusBadge status={status} />} />
              <InfoRow label="Expiry" value={days < 0 ? <span className="text-rose-600 dark:text-rose-400">Expired {Math.abs(days)}d ago</span> : `${days} days left`} />
              <InfoRow label="Signatures" value={`${contract.signatures.length - pendingSignatures}/${contract.signatures.length} signed`} />
              <InfoRow label="Documents" value={`${contract.documents.length} files`} />
              <InfoRow label="Payment schedule" value={`${contract.paymentSchedule.filter((p) => p.status === 'Paid').length}/${contract.paymentSchedule.length} settled`} />
              <InfoRow label="Created" value={fmtDate(contract.createdAt)} />
            </dl>
            <ProgressBar className="mt-4" value={contract.paymentSchedule.length ? (paidSchedule / Math.max(contract.value, 1)) * 100 : 0} tone="green" showLabel />
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold">Actions</h3>
            <p className="mt-0.5 text-xs text-slate-400">Workflow actions update only this demo register.</p>
            <div className="mt-4 space-y-2">
              {access.can('contract.write') ? (
                <>
                  {!locked && nextAction && <Button className="w-full justify-start" onClick={nextAction.onClick}><nextAction.icon className="h-4 w-4" /> {nextAction.label}</Button>}
                  {!locked && ['Active', 'Expiring Soon', 'Expired'].includes(status) && <Button variant="secondary" className="w-full justify-start" onClick={() => setRenewOpen(true)}><RefreshCw className="h-4 w-4" /> Renew for 12 months</Button>}
                  {!locked && status !== 'Draft' && <Button variant="secondary" className="w-full justify-start text-rose-600 hover:text-rose-700 dark:text-rose-400" onClick={() => setTerminateOpen(true)}><XCircle className="h-4 w-4" /> Terminate contract</Button>}
                  <Button variant="secondary" className="w-full justify-start" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit details</Button>
                </>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400" title={describeMissingPermission('contract.write')}>
                  {describeMissingPermission('contract.write')}
                </p>
              )}
              <Button variant="secondary" className="w-full justify-start" onClick={exportContract}><Download className="h-4 w-4" /> Export summary</Button>
              <Button variant="ghost" className="w-full justify-start text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Delete contract</Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-brand-500" /> Upcoming dates</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End of term</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{fmtDate(contract.endDate)}</p>
                <p className="text-[11px] text-slate-400">{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}</p>
              </div>
              {contract.paymentSchedule.filter((p) => p.status !== 'Paid').slice(0, 1).map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next scheduled payment</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{fmtMoney(p.amount)}</p>
                  <p className="text-[11px] text-slate-400">Due {fmtDate(p.dueDate)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ContractModal open={editOpen} onClose={() => setEditOpen(false)} contract={contract} />
      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />

      <ConfirmDialog
        open={!!stepConfirm}
        onClose={() => setStepConfirm(null)}
        onConfirm={runStep}
        title={stepConfirm === 'review' ? 'Submit for internal review?' : stepConfirm === 'signature' ? 'Send for signature?' : 'Activate contract?'}
        description={stepConfirm === 'review' ? 'Moves this agreement from Draft to Pending Review. Legal and People Ops can then verify the terms.' : stepConfirm === 'signature' ? 'This sends the agreement to both signatories and moves it to Pending Signature.' : 'Marks this agreement as Active and starts expiry monitoring.'}
        confirmLabel={stepConfirm === 'review' ? 'Submit for review' : stepConfirm === 'signature' ? 'Send for signature' : 'Activate contract'}
      />

      <ConfirmDialog
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        onConfirm={renew}
        title="Renew contract for 12 months?"
        description={`The end date will move from ${fmtDate(contract.endDate)} to ${fmtDate(addDays(contract.endDate, 365))}. The contract becomes Active again and a renewal entry is added to the activity timeline.`}
        confirmLabel="Renew contract"
      />

      <ConfirmDialog
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        onConfirm={terminate}
        title="Terminate this contract?"
        description="The agreement will be marked Terminated. Payment schedules and documents are retained for audit, but no further workflow actions will be available."
        confirmLabel="Terminate contract"
        tone="danger"
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        title="Delete this contract?"
        description={`${contract.id} · ${contract.title} will be permanently removed from your local demo register. You can restore it by resetting demo data.`}
        confirmLabel="Delete contract"
        tone="danger"
      />
    </div>
  )
}
