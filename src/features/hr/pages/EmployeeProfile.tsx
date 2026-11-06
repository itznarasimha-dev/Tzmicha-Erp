import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, BriefcaseBusiness, CalendarDays, Download, Mail, MapPin, Pencil, Phone, ShieldCheck,
  Sparkles, UserRound, Users,
} from 'lucide-react'
import { useStore } from '../store'
import type { DocFile } from '../types'
import { ageLabel, daysAgo, downloadCSV, fmtDate, fmtMoney, fullName, initials, todayISO } from '../lib/utils'
import { EmployeeModal } from '../components/employee-modal'
import {
  Avatar, Badge, Button, Card, DocumentPreview, DocumentRow, EmptyState, FileDrop, InfoRow,
  PageHeader, ProgressBar, StatusBadge, Tabs,
} from '../components/ui'

type TabKey = 'overview' | 'attendance' | 'leave' | 'contracts' | 'performance' | 'requests'

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { db, update, toast, logActivity } = useStore()
  const employee = db.employees.find((e) => e.id === id)
  const [tab, setTab] = useState<TabKey>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [preview, setPreview] = useState<DocFile | null>(null)

  const attendance = useMemo(() => db.attendance.filter((a) => a.employeeId === id).sort((a, b) => b.date.localeCompare(a.date)), [db.attendance, id])
  const leaves = useMemo(() => db.leaves.filter((l) => l.employeeId === id).sort((a, b) => b.from.localeCompare(a.from)), [db.leaves, id])
  const contracts = useMemo(() => db.contracts.filter((c) => c.employeeId === id), [db.contracts, id])
  const reviews = useMemo(() => db.reviews.filter((r) => r.employeeId === id), [db.reviews, id])
  const requests = useMemo(() => db.requests.filter((r) => r.employeeId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db.requests, id])

  if (!employee) {
    return (
      <div>
        <PageHeader title="Employee not found" subtitle="The employee record may have been deleted or the link is incorrect." crumbs={['People', 'Employees']} />
        <Card><EmptyState icon={Users} title="We couldn't find that employee" description="Return to the directory to pick another employee." action={<Button onClick={() => navigate('/employees')}>Back to employees</Button>} /></Card>
      </div>
    )
  }

  const tenureDays = Math.max(0, Math.round((new Date(todayISO()).getTime() - new Date(employee.joiningDate).getTime()) / 86400000))
  const tenure = tenureDays >= 365 ? `${(tenureDays / 365).toFixed(1)} years` : `${Math.round(tenureDays / 30)} months`
  const attendanceBase = attendance.slice(0, 30)
  const attendanceRate = attendanceBase.length ? Math.round((attendanceBase.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length / attendanceBase.length) * 100) : 0
  const totalDocs = employee.documents.length

  const completeness = useMemo(() => {
    const fields = [employee.phone, employee.email, employee.address, employee.emergencyContact, employee.dob, employee.bio, employee.bankAccount, employee.photo, employee.skills.length ? 'yes' : '', employee.documents.length ? 'yes' : '']
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [employee])

  const balances = db.settings.leaveTypes.map((t) => {
    const used = leaves.filter((l) => l.leaveType === t.name && l.status === 'Approved').reduce((a, l) => a + l.days, 0)
    const pending = leaves.filter((l) => l.leaveType === t.name && l.status === 'Pending').reduce((a, l) => a + l.days, 0)
    return { ...t, used, pending, remaining: Math.max(0, t.allocation - used) }
  })

  const addDocs = (docs: DocFile[]) => {
    update((d) => ({
      ...d,
      employees: d.employees.map((e) => (e.id === employee.id ? { ...e, documents: [...docs, ...e.documents] } : e)),
    }))
    toast(`${docs.length} document${docs.length > 1 ? 's' : ''} uploaded`, 'success', 'Stored locally in this browser session for preview.')
  }

  const verifyDoc = (docId: string) => {
    update((d) => ({
      ...d,
      employees: d.employees.map((e) => (e.id === employee.id ? { ...e, documents: e.documents.map((doc) => (doc.id === docId ? { ...doc, status: 'Verified' } : doc)) } : e)),
    }))
    logActivity('employee', 'Employee document verified', `${fullName(employee)} · ${employee.documents.find((d) => d.id === docId)?.name}`)
    toast('Document verified', 'success')
  }

  const removeDoc = (docId: string) => {
    update((d) => ({
      ...d,
      employees: d.employees.map((e) => (e.id === employee.id ? { ...e, documents: e.documents.filter((doc) => doc.id !== docId) } : e)),
    }))
    toast('Document removed', 'info')
  }

  const exportProfile = () => {
    downloadCSV(`titan-hr-${employee.id}.csv`, [
      ['Field', 'Value'],
      ['Employee ID', employee.id], ['Name', fullName(employee)], ['Email', employee.email], ['Phone', employee.phone],
      ['Department', employee.department], ['Designation', employee.designation], ['Manager', employee.manager],
      ['Employment type', employee.employmentType], ['Joining date', employee.joiningDate], ['Status', employee.status],
      ['Location', employee.location], ['Annual salary', employee.salary], ['Date of birth', employee.dob],
      ['Address', employee.address], ['Emergency contact', employee.emergencyContact], ['Skills', employee.skills.join('; ')],
    ])
    toast('Employee profile exported', 'success')
  }

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <button onClick={() => navigate('/employees')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"><ArrowLeft className="h-3.5 w-3.5" /> Back to employees</button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportProfile}><Download className="h-3.5 w-3.5" /> Export profile</Button>
          <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5" /> Edit profile</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="relative h-28 bg-gradient-to-r from-brand-700 via-indigo-600 to-violet-700 sm:h-32">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 40%, rgba(255,255,255,.35) 0, transparent 28%), radial-gradient(circle at 80% 20%, rgba(255,255,255,.2) 0, transparent 22%)' }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute right-5 top-5 flex items-center gap-2">
            <Badge tone="slate" className="border border-white/20 bg-white/10 text-white backdrop-blur"><Sparkles className="h-3 w-3" /> Demo profile</Badge>
          </div>
        </div>
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar name={fullName(employee)} src={employee.photo} size="2xl" ring className="!h-24 !w-24 sm:!h-28 sm:!w-28" />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-[28px]">{fullName(employee)}</h1>
                  <StatusBadge status={employee.status} />
                </div>
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{employee.designation} · {employee.department}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><span className="font-semibold text-slate-700 dark:text-slate-300">{employee.id}</span></span>
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {employee.email}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {employee.phone}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {employee.location || '—'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Badge tone="slate">{employee.employmentType}</Badge>
              <Badge tone="brand">{employee.salary ? `${fmtMoney(employee.salary, true)} / yr` : '—'}</Badge>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 dark:border-white/[0.06] sm:grid-cols-4">
            {[
              { label: 'Tenure', value: tenure, hint: `Joined ${fmtDate(employee.joiningDate)}` },
              { label: 'Attendance rate', value: `${attendanceRate}%`, hint: 'last 30 records' },
              { label: 'Leave taken', value: `${leaves.filter((l) => l.status === 'Approved').reduce((a, l) => a + l.days, 0)} days`, hint: `${leaves.filter((l) => l.status === 'Pending').length} pending` },
              { label: 'Documents', value: totalDocs, hint: `${employee.documents.filter((d) => d.status === 'Verified').length} verified` },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{s.label}</p>
                <p className="tabular mt-1 text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-[10.5px] text-slate-400">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="px-4 pt-2 sm:px-5">
              <Tabs<TabKey>
                value={tab}
                onChange={setTab}
                items={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'attendance', label: 'Attendance', count: attendance.length },
                  { id: 'leave', label: 'Leave', count: leaves.length },
                  { id: 'contracts', label: 'Contracts', count: contracts.length },
                  { id: 'performance', label: 'Performance', count: reviews.length },
                  { id: 'requests', label: 'Requests', count: requests.length },
                ]}
              />
            </div>
            <div className="p-5">
              {tab === 'overview' && (
                <div className="space-y-6">
                  {employee.bio && <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">{employee.bio}</p>}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness className="h-4 w-4 text-brand-500" /> Employment</h3>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                      <InfoRow label="Employee ID" value={employee.id} />
                      <InfoRow label="Department" value={employee.department} />
                      <InfoRow label="Designation" value={employee.designation} />
                      <InfoRow label="Reporting manager" value={employee.manager} />
                      <InfoRow label="Employment type" value={employee.employmentType} />
                      <InfoRow label="Work location" value={employee.location} />
                      <InfoRow label="Joining date" value={fmtDate(employee.joiningDate)} />
                      <InfoRow label="Annual salary" value={fmtMoney(employee.salary)} />
                      <InfoRow label="Bank account" value={employee.bankAccount} />
                    </dl>
                  </div>
                  <div className="border-t border-slate-100 pt-5 dark:border-white/[0.06]">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><UserRound className="h-4 w-4 text-brand-500" /> Personal</h3>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                      <InfoRow label="Email" value={<a href={`mailto:${employee.email}`} className="text-brand-600 hover:underline dark:text-brand-400">{employee.email}</a>} />
                      <InfoRow label="Phone" value={employee.phone} />
                      <InfoRow label="Date of birth" value={`${fmtDate(employee.dob)} · ${ageLabel(employee.dob)} yrs`} />
                      <InfoRow label="Gender" value={employee.gender} />
                      <InfoRow label="Emergency contact" value={employee.emergencyContact} />
                      <InfoRow label="Address" value={employee.address} />
                    </dl>
                  </div>
                </div>
              )}

              {tab === 'attendance' && (
                <div>
                  <div className="mb-4 grid grid-cols-4 gap-2">
                    {[
                      ['Present', attendanceBase.filter((a) => a.status === 'Present').length, 'text-emerald-600 dark:text-emerald-400'],
                      ['Late', attendanceBase.filter((a) => a.status === 'Late').length, 'text-violet-600 dark:text-violet-400'],
                      ['Absent', attendanceBase.filter((a) => a.status === 'Absent').length, 'text-rose-600 dark:text-rose-400'],
                      ['Leave', attendanceBase.filter((a) => a.status === 'On Leave').length, 'text-amber-600 dark:text-amber-400'],
                    ].map(([label, value, color]) => (
                      <div key={label as string} className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                        <p className={`tabular text-xl font-bold ${color}`}>{value as number}</p>
                        <p className="text-[10px] text-slate-400">{label as string}</p>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/[0.06]">
                    <table className="w-full min-w-[520px]">
                      <thead className="bg-slate-50 dark:bg-white/[0.03]"><tr><th className="table-head">Date</th><th className="table-head">Check in</th><th className="table-head">Check out</th><th className="table-head">Hours</th><th className="table-head">Source</th><th className="table-head">Status</th></tr></thead>
                      <tbody>
                        {attendance.slice(0, 12).map((a) => (
                          <tr key={a.id} className="table-row">
                            <td className="table-cell font-medium">{fmtDate(a.date)}</td>
                            <td className="table-cell tabular">{a.checkIn || '—'}</td>
                            <td className="table-cell tabular">{a.checkOut || '—'}</td>
                            <td className="table-cell tabular">{a.hours ? `${a.hours}h` : '—'}</td>
                            <td className="table-cell"><Badge tone="slate">{a.source}</Badge></td>
                            <td className="table-cell"><StatusBadge status={a.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {attendance.length === 0 && <EmptyState icon={CalendarDays} title="No attendance records" />}
                </div>
              )}

              {tab === 'leave' && (
                <div>
                  <div className="mb-5 grid gap-3 sm:grid-cols-2">
                    {balances.slice(0, 4).map((b) => (
                      <div key={b.id} className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{b.name}</span>
                          <span className="tabular text-slate-400">{b.remaining}/{b.allocation} days</span>
                        </div>
                        <ProgressBar className="mt-2.5" value={(b.remaining / Math.max(b.allocation, 1)) * 100} tone={b.remaining / Math.max(b.allocation, 1) < 0.25 ? 'red' : 'brand'} size="sm" />
                        <p className="mt-2 text-[10px] text-slate-400">{b.used} used · {b.pending} pending</p>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/[0.06]">
                    <table className="w-full min-w-[560px]">
                      <thead className="bg-slate-50 dark:bg-white/[0.03]"><tr><th className="table-head">Type</th><th className="table-head">Dates</th><th className="table-head">Days</th><th className="table-head">Applied</th><th className="table-head">Status</th></tr></thead>
                      <tbody>
                        {leaves.map((l) => (
                          <tr key={l.id} className="table-row">
                            <td className="table-cell font-medium">{l.leaveType}</td>
                            <td className="table-cell">{fmtDate(l.from)} → {fmtDate(l.to)}</td>
                            <td className="table-cell tabular">{l.days}</td>
                            <td className="table-cell">{fmtDate(l.appliedOn)}</td>
                            <td className="table-cell"><StatusBadge status={l.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {leaves.length === 0 && <EmptyState icon={CalendarDays} title="No leave requests" description="This employee has no leave history yet." />}
                </div>
              )}

              {tab === 'contracts' && (
                <div className="space-y-3">
                  {contracts.map((c) => (
                    <button key={c.id} onClick={() => navigate(`/contracts/${c.id}`)} className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-4 text-left transition hover:border-brand-200 hover:bg-slate-50/60 dark:border-white/[0.06] dark:hover:border-brand-500/30 dark:hover:bg-white/[0.02]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><BriefcaseBusiness className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{c.title}</p>
                        <p className="text-[11px] text-slate-400">{c.id} · {c.contractType} · {fmtDate(c.startDate)} – {fmtDate(c.endDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fmtMoney(c.value)}</p>
                        <p className="text-[10px] text-slate-400">{c.paymentFrequency}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </button>
                  ))}
                  {contracts.length === 0 && <EmptyState icon={BriefcaseBusiness} title="No contracts on file" description="Create a contract from the Contracts workspace." action={<Button onClick={() => navigate('/contracts')}>Open contracts</Button>} />}
                </div>
              )}

              {tab === 'performance' && (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-100 p-4 dark:border-white/[0.06]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.cycle}</p>
                          <p className="text-[11px] text-slate-400">Due {fmtDate(r.dueDate)} · {r.manager}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[['Self', r.selfRating], ['Manager', r.managerRating], ['HR', r.hrRating]].map(([label, rating]) => (
                          <div key={label as string} className="rounded-lg bg-slate-50 p-2.5 text-center dark:bg-white/[0.03]">
                            <p className="tabular text-lg font-bold text-slate-900 dark:text-white">{rating ? `${rating}.0` : '—'}</p>
                            <p className="text-[10px] text-slate-400">{label as string} rating</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 space-y-2">
                        {r.goals.map((g) => (
                          <div key={g.id}>
                            <div className="mb-1 flex items-center justify-between text-[11px]"><span className="text-slate-600 dark:text-slate-300">{g.title}</span><span className="font-semibold text-slate-500">{g.progress}%</span></div>
                            <ProgressBar value={g.progress} size="sm" tone={g.progress >= 100 ? 'green' : g.progress > 60 ? 'brand' : 'amber'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {reviews.length === 0 && <EmptyState icon={ShieldCheck} title="No performance reviews" description="No review cycle has been assigned to this employee yet." />}
                </div>
              )}

              {tab === 'requests' && (
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-100 p-4 dark:border-white/[0.06]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.subject}</p>
                        <div className="flex items-center gap-2"><StatusBadge status={r.priority} /><StatusBadge status={r.status} /></div>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{r.description}</p>
                      <p className="mt-2 text-[10px] text-slate-400">{r.type} · {r.id} · raised {fmtDate(r.createdAt)}</p>
                    </div>
                  ))}
                  {requests.length === 0 && <EmptyState icon={UserRound} title="No employee requests" description="Certificate, document and HR queries raised by this employee will appear here." />}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-brand-500" /> At a glance</h3>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between"><span className="text-slate-400">Reporting manager</span><span className="font-medium text-slate-700 dark:text-slate-200">{employee.manager}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Employment type</span><span className="font-medium text-slate-700 dark:text-slate-200">{employee.employmentType}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Joined</span><span className="font-medium text-slate-700 dark:text-slate-200">{fmtDate(employee.joiningDate)}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Tenure</span><span className="font-medium text-slate-700 dark:text-slate-200">{tenure}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Location</span><span className="font-medium text-slate-700 dark:text-slate-200">{employee.location}</span></div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-slate-600 dark:text-slate-300">Profile completeness</span><span className="font-bold text-brand-600 dark:text-brand-400">{completeness}%</span></div>
              <ProgressBar value={completeness} className="mt-2" size="sm" />
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">Add missing documents and emergency details to complete this profile.</p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Skills</h3>
              <Badge tone="slate">{employee.skills.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {employee.skills.map((s) => <span key={s} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">{s}</span>)}
              {employee.skills.length === 0 && <p className="text-xs text-slate-400">No skills added yet.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Documents</h3>
              <Badge tone={employee.documents.some((d) => d.status === 'Pending') ? 'amber' : 'green'}>{employee.documents.length} files</Badge>
            </div>
            <FileDrop compact label="Upload document" hint="PDF, DOCX or image · 10 MB" onFiles={addDocs} />
            <div className="mt-3 space-y-2">
              {employee.documents.slice(0, 4).map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onPreview={() => setPreview(doc)} onVerify={() => verifyDoc(doc.id)} onRemove={() => removeDoc(doc.id)} />
              ))}
              {employee.documents.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-white/10">No documents uploaded yet.</p>}
            </div>
            {employee.documents.length > 4 && (
              <button onClick={() => document.querySelector<HTMLButtonElement>('[data-docs]')?.click()} className="mt-2 w-full text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">View all {employee.documents.length} documents</button>
            )}
          </Card>

          <Card className="bg-slate-900 p-5 text-white dark:bg-white/[0.04]">
            <div className="flex items-center gap-3">
              <Avatar name={employee.manager} size="md" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reports to</p>
                <p className="truncate text-sm font-semibold">{employee.manager}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">For people matters, contact <span className="text-slate-200">aisha.bello@titanhr.demo</span> or raise an employee request.</p>
          </Card>
        </div>
      </div>

      <EmployeeModal open={editOpen} onClose={() => setEditOpen(false)} employee={employee} />
      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
