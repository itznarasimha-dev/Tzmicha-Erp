import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight, Building2, Download, Eye, Mail, MapPin, Pencil, Plus, Trash2, UserCheck,
  UserMinus, Users, UserX, SlidersHorizontal, AlertTriangle,
} from 'lucide-react'
import { useStore } from '../store'
import { useEmployees } from '../useHrData'
import type { Employee } from '../types'
import { downloadCSV, fmtDate, fmtMoney, fullName, todayISO } from '../lib/utils'
import { runHrApiAction, hrActions } from '../api-actions'
import { EmployeeModal } from '../components/employee-modal'
import {
  Avatar, Button, Card, ConfirmDialog, EmptyState, IconButton, Input, PageHeader, Pagination,
  SearchInput, Select, StatCard, StatusBadge, Skeleton,
} from '../components/ui'

export default function Employees() {
  const { db, update, logActivity, toast, dataSource, refreshFromApi } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('All')
  const [status, setStatus] = useState('All')
  const [type, setType] = useState('All')
  const [sort, setSort] = useState('name-asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const useApi = dataSource === 'api'

  const employeesQuery = useEmployees({
    q: search,
    status: status === 'All' ? undefined : status as any,
    employmentType: type === 'All' ? undefined : type as any,
    sort: sort as any,
    page,
    pageSize,
  })

  useEffect(() => {
    const newParam = params.get('new')
    const editParam = params.get('edit')
    if (newParam === '1') {
      setEditing(null)
      setModalOpen(true)
      setParams({}, { replace: true })
    } else if (editParam) {
      if (dataSource !== 'api') {
        const emp = db.employees.find((e) => e.id === editParam)
        if (emp) { setEditing(emp); setModalOpen(true) }
      }
      setParams({}, { replace: true })
    }
  }, [params, db.employees, dataSource, setParams])

  useEffect(() => { setPage(1) }, [search, department, status, type, sort, pageSize])

  const employeesData = useApi ? employeesQuery.data : null
  const employeesList = useApi ? (employeesData?.data ?? []) : db.employees

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = employeesList.filter((e) => {
      const matchSearch = !q || fullName(e).toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
      const matchDept = department === 'All' || e.department === department
      const matchStatus = status === 'All' || e.status === status
      const matchType = type === 'All' || e.employmentType === type
      return matchSearch && matchDept && matchStatus && matchType
    })
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'name-desc': return fullName(b).localeCompare(fullName(a))
        case 'joined-desc': return b.joiningDate.localeCompare(a.joiningDate)
        case 'joined-asc': return a.joiningDate.localeCompare(b.joiningDate)
        case 'salary-desc': return (b.salary ?? 0) - (a.salary ?? 0)
        case 'dept': return a.department.localeCompare(b.department) || fullName(a).localeCompare(fullName(b))
        default: return fullName(a).localeCompare(fullName(b))
      }
    })
  }, [employeesList, search, department, status, type, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const from = (currentPage - 1) * pageSize
  const rows = filtered.slice(from, from + pageSize)

  const active = employeesList.filter((e) => e.status === 'Active').length
  const probation = employeesList.filter((e) => e.status === 'Probation').length
  const notice = employeesList.filter((e) => e.status === 'Notice Period').length
  const former = employeesList.filter((e) => e.status === 'Terminated').length

  const exportRows = () => {
    const data: (string | number)[][] = [
      ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Designation', 'Manager', 'Employment type', 'Joining date', 'Status', 'Location', 'Annual salary'],
      ...filtered.map((e) => [e.id, fullName(e), e.email, e.phone, e.department, e.designation, e.manager, e.employmentType, e.joiningDate, e.status, e.location, e.salary ?? 0]),
    ]
    downloadCSV(`titan-hr-employees-${todayISO()}.csv`, data)
    toast('Employee directory exported', 'success', `${filtered.length} records written to CSV.`)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    if (dataSource === 'api') {
      const res = await runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.deleteEmployee(deleting.id),
        successMessage: 'Employee deleted',
        successDescription: `${fullName(deleting)} has been removed from the ERP.`,
        errorTitle: 'Could not delete employee',
      })
      if (res.ok) setDeleting(null)
      return
    }
    update((d) => ({
      ...d,
      employees: d.employees.filter((e) => e.id !== deleting.id),
      attendance: d.attendance.filter((a) => a.employeeId !== deleting.id),
      leaves: d.leaves.filter((l) => l.employeeId !== deleting.id),
      payroll: d.payroll.filter((p) => p.employeeId !== deleting.id),
      reviews: d.reviews.filter((r) => r.employeeId !== deleting.id),
      requests: d.requests.filter((r) => r.employeeId !== deleting.id),
      contracts: d.contracts.map((c) => (c.employeeId === deleting.id ? { ...c, employeeId: undefined } : c)),
      payments: d.payments.map((p) => (p.employeeId === deleting.id ? { ...p, employeeId: undefined } : p)),
    }))
    logActivity('employee', 'Employee record deleted', `${fullName(deleting)} - ${deleting.id}`)
    toast('Employee deleted (demo)', 'success', `${fullName(deleting)} removed from demo data only.`)
    setDeleting(null)
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="A single directory for everyone at Titan — profiles, employment details, documents and history."
        crumbs={['People', 'Employees']}
        actions={<><Button variant="secondary" onClick={exportRows}><Download className="h-4 w-4" /> Export</Button><Button onClick={() => { setEditing(null); setModalOpen(true) }}><Plus className="h-4 w-4" /> Add employee</Button></>}
      />

      {useApi && employeesQuery.loading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />)}
        </div>
      )}
      {useApi && employeesQuery.error && (
        <div className="text-center py-12">
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-6 py-8 max-w-md mx-auto dark:bg-rose-500/10 dark:border-rose-500/20">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-300">Unable to load employees</h3>
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{employeesQuery.error}</p>
            <button
              onClick={() => employeesQuery.refetch()}
              className="mt-4 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {!useApi || (!employeesQuery.loading && !employeesQuery.error) && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard index={0} label="Headcount" value={employeesList.length} icon={Users} tone="brand" hint="all records" />
          <StatCard index={1} label="Active" value={active} icon={UserCheck} tone="green" hint="currently working" />
          <StatCard index={2} label="Probation / notice" value={probation + notice} icon={UserMinus} tone="amber" hint={`${probation} probation · ${notice} notice`} />
          <StatCard index={3} label="Former employees" value={former} icon={UserX} tone="slate" hint="records preserved" />
        </div>
      )}

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/[0.05] xl:flex-row xl:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, ID, email, role or department…" className="w-full xl:max-w-sm" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:ml-auto xl:flex">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="min-w-[140px]">
              <option value="All">All departments</option>
              {db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All statuses</option>
              {db.settings.employeeStatuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="All">All types</option>
              {db.settings.employmentTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="joined-desc">Newest joiners</option>
              <option value="joined-asc">Longest tenure</option>
              <option value="salary-desc">Highest salary</option>
              <option value="dept">Department</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[11px] text-slate-500 dark:text-slate-400">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span><b className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</b> employees match your filters</span>
          {(search || department !== 'All' || status !== 'All' || type !== 'All') && (
            <button onClick={() => { setSearch(''); setDepartment('All'); setStatus('All'); setType('All') }} className="ml-1 font-semibold text-brand-600 hover:underline dark:text-brand-400">Clear filters</button>
          )}
          <span className="ml-auto hidden items-center gap-1 sm:flex"><Building2 className="h-3 w-3" /> {new Set(filtered.map((e) => e.department)).size} departments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
              <tr>
                <th className="table-head">Employee</th>
                <th className="table-head">Department</th>
                <th className="table-head">Designation</th>
                <th className="table-head">Status</th>
                <th className="table-head">Joined</th>
                <th className="table-head text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="table-row cursor-pointer" onClick={() => navigate(`/employees/${e.id}`)}>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName(e)} src={e.photo} size="md" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{fullName(e)}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400"><span>{e.id}</span><span className="h-1 w-1 rounded-full bg-slate-300" /><span className="truncate">{e.email}</span></p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{e.department}</td>
                  <td className="table-cell">
                    <p className="max-w-[170px] truncate text-slate-700 dark:text-slate-300">{e.designation}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{fmtMoney(e.salary ?? 0, true)} / yr · {e.employmentType}</p>
                  </td>
                  <td className="table-cell"><StatusBadge status={e.status} /></td>
                  <td className="table-cell tabular">{fmtDate(e.joiningDate)}</td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-0.5" onClick={(ev) => ev.stopPropagation()}>
                      <IconButton aria-label={`View ${fullName(e)}`} onClick={() => navigate(`/employees/${e.id}`)} title="View profile"><Eye className="h-4 w-4" /></IconButton>
                      <IconButton aria-label={`Edit ${fullName(e)}`} onClick={() => { setEditing(e as Employee); setModalOpen(true) }} title="Edit employee"><Pencil className="h-3.5 w-3.5" /></IconButton>
                      <IconButton aria-label={`Delete ${fullName(e)}`} onClick={() => setDeleting(e as Employee)} className="hover:text-rose-600 dark:hover:text-rose-400" title="Delete employee"><Trash2 className="h-3.5 w-3.5" /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <EmptyState icon={Users} title="No employees found" description="Try adjusting your search or filters, or add a new employee record." action={<Button onClick={() => { setEditing(null); setModalOpen(true) }}><Plus className="h-4 w-4" /> Add employee</Button>} />
          )}
        </div>
        {filtered.length > 0 && (
          <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} from={from} to={Math.min(from + pageSize, filtered.length)} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} label="employees" />
        )}
      </Card>

      {!useApi || (!employeesQuery.loading && !employeesQuery.error) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {db.settings.departments.slice(0, 3).map((d) => {
            const count = employeesList.filter((e) => e.department === d.name && e.status !== 'Terminated').length
            const head = employeesList.find((e) => e.department === d.name && /director|head|vp|lead|manager/i.test(e.designation) && !e.managerId)
            return (
              <button key={d.id} onClick={() => { setDepartment(d.name); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="card card-hover flex items-center gap-3 p-4 text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Building2 className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{d.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{head ? `${fullName(head)} · ${head.designation}` : `${d.head} · department head`}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-lg font-bold text-slate-900 dark:text-white">{count}</p>
                  <p className="text-[10px] text-slate-400">people</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
              </button>
            )
          })}
        </div>
      )}

      <EmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} employee={editing} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleting ? fullName(deleting) : 'employee'}?`}
        description="This permanently removes the employee and their attendance, leave, payroll, performance and request records from demo data. Historical contract and payment records will be retained without the employee link."
        confirmLabel="Delete employee"
        tone="danger"
      />
    </div>
  )
}
