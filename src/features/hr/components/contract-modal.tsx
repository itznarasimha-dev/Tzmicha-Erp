import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { runHrApiAction, hrActions } from '../api-actions'
import type { Contract, ContractStatus } from '../types'
import { fmtDate, fullName, todayISO, uid } from '../lib/utils'
import { buildPaymentSchedule } from '../lib/hr'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'

const STATUSES: ContractStatus[] = ['Draft', 'Pending Review', 'Pending Signature', 'Active', 'Expiring Soon', 'Expired', 'Renewed', 'Terminated']
const FREQUENCIES: Contract['paymentFrequency'][] = ['Monthly', 'Quarterly', 'Annual', 'Milestone', 'One-time']

interface ContractModalProps {
  open: boolean
  onClose: () => void
  contract?: Contract | null
}

const blank = {
  title: '', partyType: 'Employee' as Contract['partyType'], employeeId: '', partyName: '', department: 'Engineering',
  contractType: 'Employment Agreement', startDate: todayISO(), endDate: todayISO().slice(0, 4) + '-12-31',
  value: '', paymentFrequency: 'Monthly' as Contract['paymentFrequency'], status: 'Draft' as ContractStatus, notes: '',
}

export function ContractModal({ open, onClose, contract }: ContractModalProps) {
  const { db, update, logActivity, toast, dataSource, refreshFromApi } = useStore()
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (contract) {
      setForm({
        title: contract.title, partyType: contract.partyType, employeeId: contract.employeeId || '',
        partyName: contract.partyName, department: contract.department, contractType: contract.contractType,
        startDate: contract.startDate, endDate: contract.endDate, value: String(contract.value),
        paymentFrequency: contract.paymentFrequency, status: contract.status, notes: contract.notes,
      })
    } else {
      setForm({ ...blank })
    }
  }, [open, contract])

  const employees = useMemo(() => db.employees.filter((e) => e.status !== 'Terminated'), [db.employees])

  const set = (key: keyof typeof blank, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const setParty = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId)
    setForm((f) => ({ ...f, employeeId, partyName: emp ? fullName(emp) : f.partyName, department: emp?.department || f.department }))
    setErrors((e) => ({ ...e, employeeId: '' }))
  }

  const save = async () => {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = 'Contract title is required'
    if (!form.partyName.trim()) next.partyName = form.partyType === 'Employee' ? 'Select an employee' : 'Party name is required'
    if (!form.startDate) next.startDate = 'Start date is required'
    if (!form.endDate) next.endDate = 'End date is required'
    if (form.startDate && form.endDate && form.endDate <= form.startDate) next.endDate = 'End date must be after the start date'
    if (!form.value || Number(form.value) < 0) next.value = 'Enter a valid contract value'
    setErrors(next)
    if (Object.keys(next).length || saving) return

    const department = (db.settings.departments as Array<{ id?: string; name: string }>).find((d) => d.name === form.department)
    const payload = {
      title: form.title.trim(),
      partyType: form.partyType,
      employeeId: form.partyType === 'Employee' ? (form.employeeId || undefined) : undefined,
      partyName: form.partyName.trim(),
      departmentId: department?.id || undefined,
      contractType: form.contractType.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      value: Number(form.value),
      paymentFrequency: form.paymentFrequency,
      notes: form.notes.trim() || undefined,
    }

    if (dataSource === 'api') {
      setSaving(true)
      const res = contract
        ? await runHrApiAction({ dataSource, refreshFromApi, toast }, {
            action: () => hrActions.updateContract(contract.id, payload),
            successMessage: 'Contract updated',
            successDescription: `${form.title.trim()} has been saved.`,
            errorTitle: 'Could not update contract',
          })
        : await runHrApiAction({ dataSource, refreshFromApi, toast }, {
            action: () => hrActions.createContract(payload),
            successMessage: 'Contract created',
            successDescription: `${form.title.trim()} has been added to the contract register.`,
            errorTitle: 'Could not create contract',
          })
      setSaving(false)
      if (res.ok) onClose()
      return
    }

    setSaving(true)
    window.setTimeout(() => {
      const value = Number(form.value)
      if (contract) {
        update((d) => ({
          ...d,
          contracts: d.contracts.map((c) => (c.id === contract.id ? {
            ...c, ...form, value,
            history: [...c.history, { id: uid('ch'), date: new Date().toISOString().slice(0, 10), action: 'Contract details updated', actor: 'Aisha Bello' }],
          } : c)),
        }))
        logActivity('contract', 'Contract updated', `${form.title} · ${contract.id}`)
        toast('Contract updated (demo)', 'success', `${form.title} has been saved. Demo data is not saved to the database.`)
      } else {
        const year = new Date().getFullYear()
        const max = Math.max(...db.contracts.map((c) => Number(c.id.split('-').pop()) || 0), 100)
        const id = `CTR-${year}-${max + 1}`
        const newContract: Contract = {
          id,
          title: form.title,
          partyType: form.partyType,
          employeeId: form.partyType === 'Employee' ? form.employeeId : undefined,
          partyName: form.partyName,
          department: form.department,
          contractType: form.contractType,
          startDate: form.startDate,
          endDate: form.endDate,
          value,
          paymentFrequency: form.paymentFrequency,
          status: form.status,
          signatures: [
            { id: uid('sig'), name: 'Amara Okafor', role: 'HR Director', status: 'Pending' },
            { id: uid('sig'), name: form.partyName, role: form.partyType, status: 'Pending' },
          ],
          documents: [],
          notes: form.notes,
          paymentSchedule: buildPaymentSchedule(value, form.paymentFrequency, form.startDate),
          createdAt: todayISO(),
          history: [{ id: uid('ch'), date: todayISO(), action: 'Contract created', actor: 'Aisha Bello' }],
        }
        update((d) => ({ ...d, contracts: [newContract, ...d.contracts] }))
        logActivity('contract', 'Contract created', `${newContract.title} · ${newContract.id}`)
        toast('Contract created (demo)', 'success', `${id} has been added to the contract register. Demo data is not saved to the database.`)
      }
      setSaving(false)
      onClose()
    }, 350)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contract ? 'Edit contract' : 'Create a contract'}
      description={contract ? `${contract.id} · last updated ${fmtDate(contract.createdAt)}` : 'Add a new employment, contractor or vendor agreement to the register.'}
      size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>{contract ? 'Save changes' : 'Create contract'}</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contract title" required error={errors.title} className="sm:col-span-2"><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior Frontend Engineer Agreement" invalid={!!errors.title} /></Field>
        <Field label="Party type">
          <Select value={form.partyType} onChange={(e) => {
            const partyType = e.target.value as Contract['partyType']
            setForm((f) => ({ ...f, partyType, employeeId: '', partyName: '' }))
          }}>
            <option>Employee</option><option>Contractor</option><option>Vendor</option>
          </Select>
        </Field>
        {form.partyType === 'Employee' ? (
          <Field label="Employee" required error={errors.employeeId}>
            <Select value={form.employeeId} onChange={(e) => setParty(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{fullName(e)} · {e.designation}</option>)}
            </Select>
          </Field>
        ) : (
          <Field label="Party name" required error={errors.partyName}>
            <Input value={form.partyName} onChange={(e) => set('partyName', e.target.value)} placeholder={form.partyType === 'Vendor' ? 'e.g. Northwind Cloud' : 'Contractor name'} invalid={!!errors.partyName} />
          </Field>
        )}
        <Field label="Department">
          <Select value={form.department} onChange={(e) => set('department', e.target.value)}>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select>
        </Field>
        <Field label="Contract type">
          <Select value={form.contractType} onChange={(e) => set('contractType', e.target.value)}>{db.settings.contractTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</Select>
        </Field>
        <Field label="Start date" required error={errors.startDate}><Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} invalid={!!errors.startDate} /></Field>
        <Field label="End date" required error={errors.endDate}><Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} invalid={!!errors.endDate} /></Field>
        <Field label="Contract value (USD)" required error={errors.value}><Input type="number" min={0} value={form.value} onChange={(e) => set('value', e.target.value)} placeholder="120000" invalid={!!errors.value} /></Field>
        <Field label="Payment frequency">
          <Select value={form.paymentFrequency} onChange={(e) => set('paymentFrequency', e.target.value)}>{FREQUENCIES.map((f) => <option key={f}>{f}</option>)}</Select>
        </Field>
        <Field label="Contract status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
        </Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Renewal terms, special clauses, approval notes…" /></Field>
        <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 dark:bg-white/[0.03] dark:text-slate-400 sm:col-span-2">
          A payment schedule and signature requests are generated automatically. Upload the signed document from the contract detail page.
        </div>
      </div>
    </Modal>
  )
}
