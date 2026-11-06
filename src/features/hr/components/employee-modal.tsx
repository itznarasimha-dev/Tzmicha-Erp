import { useEffect, useMemo, useState } from 'react'
import { Building2, UserRound } from 'lucide-react'
import type { Employee, EmploymentType, EmployeeStatus } from '../types'
import { useStore } from '../store'
import { fullName, todayISO } from '../lib/utils'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'

interface EmployeeModalProps {
  open: boolean
  onClose: () => void
  employee?: Employee | null
}

const blank = {
  firstName: '', lastName: '', email: '', phone: '', gender: 'Female', dob: '', address: '', emergencyContact: '',
  department: '', designation: '', managerId: '', employmentType: 'Full-time' as EmploymentType, joiningDate: todayISO(),
  status: 'Active' as EmployeeStatus, location: '', salary: '', bankAccount: '', photo: '', bio: '', skills: '',
}

export function EmployeeModal({ open, onClose, employee }: EmployeeModalProps) {
  const { db, update, logActivity, toast } = useStore()
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (employee) {
      setForm({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        gender: employee.gender,
        dob: employee.dob,
        address: employee.address,
        emergencyContact: employee.emergencyContact,
        department: employee.department,
        designation: employee.designation,
        managerId: employee.managerId || '',
        employmentType: employee.employmentType,
        joiningDate: employee.joiningDate,
        status: employee.status,
        location: employee.location,
        salary: String(employee.salary),
        bankAccount: employee.bankAccount,
        photo: employee.photo,
        bio: employee.bio || '',
        skills: employee.skills.join(', '),
      })
    } else {
      setForm({ ...blank, department: db.settings.departments[0]?.name || '', designation: '' })
    }
  }, [open, employee, db.settings.departments])

  const designations = useMemo(() => {
    const list = db.settings.designations.filter((d) => !form.department || d.department === form.department)
    return list.length ? list : db.settings.designations
  }, [db.settings.designations, form.department])

  const set = (key: keyof typeof blank, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.firstName.trim()) next.firstName = 'First name is required'
    if (!form.lastName.trim()) next.lastName = 'Last name is required'
    if (!form.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address'
    else if (db.employees.some((e) => e.email.toLowerCase() === form.email.toLowerCase() && e.id !== employee?.id)) next.email = 'This email is already in use'
    if (!form.phone.trim()) next.phone = 'Phone is required'
    if (!form.department) next.department = 'Select a department'
    if (!form.designation) next.designation = 'Select or enter a designation'
    if (!form.joiningDate) next.joiningDate = 'Joining date is required'
    if (!form.salary || Number(form.salary) <= 0) next.salary = 'Enter a valid annual salary'
    if (form.dob && form.dob >= form.joiningDate) next.dob = 'Date of birth must be before joining date'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = () => {
    if (!validate()) return
    setSaving(true)
    window.setTimeout(() => {
      const manager = db.employees.find((e) => e.id === form.managerId)
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender as Employee['gender'],
        dob: form.dob || '1995-01-01',
        address: form.address.trim(),
        emergencyContact: form.emergencyContact.trim(),
        department: form.department,
        designation: form.designation,
        managerId: form.managerId || null,
        manager: manager ? fullName(manager) : 'Executive Office',
        employmentType: form.employmentType,
        joiningDate: form.joiningDate,
        status: form.status,
        location: form.location.trim(),
        salary: Number(form.salary),
        bankAccount: form.bankAccount.trim(),
        photo: form.photo.trim(),
        bio: form.bio.trim(),
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      }
      if (employee) {
        update((d) => ({
          ...d,
          employees: d.employees.map((e) => (e.id === employee.id ? { ...e, ...payload } : e)),
        }))
        logActivity('employee', 'Employee profile updated', `${payload.firstName} ${payload.lastName} · ${payload.designation}`)
        toast('Employee profile updated', 'success', `${payload.firstName} ${payload.lastName} has been saved.`)
      } else {
        const maxId = Math.max(...db.employees.map((e) => Number(e.id.replace(/\D/g, '')) || 0), 0)
        const id = `EMP-${String(maxId + 1).padStart(3, '0')}`
        const newEmployee: Employee = {
          ...payload,
          id,
          photo: form.photo.trim(),
          documents: [],
        }
        update((d) => ({ ...d, employees: [newEmployee, ...d.employees] }))
        logActivity('employee', 'New employee added', `${newEmployee.firstName} ${newEmployee.lastName} · ${newEmployee.designation}`)
        toast('Employee added', 'success', `${newEmployee.firstName} ${newEmployee.lastName} was added as ${id}.`)
      }
      setSaving(false)
      onClose()
    }, 400)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? 'Edit employee' : 'Add a new employee'}
      description={employee ? `Update the profile and employment details for ${fullName(employee)}.` : 'Create a new employee record. This is demo data stored only in your browser.'}
      size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>{employee ? 'Save changes' : 'Add employee'}</Button></>}
    >
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><UserRound className="h-3.5 w-3.5" /></span>
            <h3 className="text-sm font-semibold">Personal information</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required error={errors.firstName}><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="e.g. Nadia" invalid={!!errors.firstName} /></Field>
            <Field label="Last name" required error={errors.lastName}><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="e.g. Rahman" invalid={!!errors.lastName} /></Field>
            <Field label="Work email" required error={errors.email}><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@titanhr.demo" invalid={!!errors.email} /></Field>
            <Field label="Phone" required error={errors.phone}><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 000 0000" invalid={!!errors.phone} /></Field>
            <Field label="Gender"><Select value={form.gender} onChange={(e) => set('gender', e.target.value)}><option>Female</option><option>Male</option><option>Other</option></Select></Field>
            <Field label="Date of birth" error={errors.dob}><Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} invalid={!!errors.dob} /></Field>
            <Field label="Home address" className="sm:col-span-2"><Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, city, country" /></Field>
            <Field label="Emergency contact" className="sm:col-span-2"><Input value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Name · phone number" /></Field>
            <Field label="Profile photo URL" hint="Optional — initials are used when no photo is available." className="sm:col-span-2"><Input value={form.photo} onChange={(e) => set('photo', e.target.value)} placeholder="https://…" /></Field>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 dark:border-white/[0.06]">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Building2 className="h-3.5 w-3.5" /></span>
            <h3 className="text-sm font-semibold">Employment details</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" required error={errors.department}>
              <Select value={form.department} onChange={(e) => { set('department', e.target.value); setForm((f) => ({ ...f, department: e.target.value, designation: '' })) }}>
                <option value="">Select department</option>
                {db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Designation" required error={errors.designation}>
              <Select value={form.designation} onChange={(e) => set('designation', e.target.value)}>
                <option value="">Select designation</option>
                {designations.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Reporting manager">
              <Select value={form.managerId} onChange={(e) => set('managerId', e.target.value)}>
                <option value="">Executive Office</option>
                {db.employees.filter((e) => e.status !== 'Terminated' && e.id !== employee?.id).map((e) => <option key={e.id} value={e.id}>{fullName(e)} · {e.designation}</option>)}
              </Select>
            </Field>
            <Field label="Employment type">
              <Select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
                {db.settings.employmentTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Joining date" required error={errors.joiningDate}><Input type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} invalid={!!errors.joiningDate} /></Field>
            <Field label="Employment status">
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {db.settings.employeeStatuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, country" /></Field>
            <Field label="Annual salary (USD)" required error={errors.salary}><Input type="number" min={0} value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="120000" invalid={!!errors.salary} /></Field>
            <Field label="Bank account"><Input value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} placeholder="•••• 0000" /></Field>
            <Field label="Skills" hint="Comma separated"><Input value={form.skills} onChange={(e) => set('skills', e.target.value)} placeholder="Leadership, Analytics, Recruiting" /></Field>
            <Field label="Short bio" className="sm:col-span-2"><Textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="A short summary of the employee's role and experience." /></Field>
          </div>
        </div>
      </div>
    </Modal>
  )
}
