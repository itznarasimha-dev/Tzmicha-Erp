import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useHRData } from './HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { UserPlus } from 'lucide-react'

export function HREmployeesPage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Employees' subtitle='Employee directory and profiles' actions={<Button variant='primary' icon={<UserPlus size={15}/>}>Add Employee</Button>} /><SectionCard title='Employee List' subtitle='All employees'><DataTable data={hr.employees} rowKey={(e:any)=>e.id} columns={[
    { id:'eid', header:'Employee ID', render:(e:any)=><span>{e.employeeId}</span> },
    { id:'name', header:'Name', render:(e:any)=><span>{e.name}</span> },
    { id:'dept', header:'Department', render:(e:any)=><span>{e.department}</span> },
    { id:'desig', header:'Designation', render:(e:any)=><span>{e.designation}</span> },
    { id:'mgr', header:'Reporting Manager', render:(e:any)=><span>{e.reportingManager}</span> },
    { id:'type', header:'Employment Type', render:(e:any)=><span>{e.employmentType}</span> },
    { id:'join', header:'Joining Date', render:(e:any)=><span>{e.joiningDate}</span> },
    { id:'status', header:'Status', render:(e:any)=><Badge tone={e.status==='Active'?'success':e.status==='Onboarding'?'warning':'neutral'}>{e.status}</Badge> },
  ]} /></SectionCard></div>)
}

export function HRAttendancePage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Attendance' subtitle='Attendance management' /><SectionCard title='Attendance List'><DataTable data={hr.attendance} rowKey={(a:any)=>a.id} columns={[
    { id:'eid', header:'Employee ID', render:(a:any)=><span>{a.employeeId}</span> },
    { id:'name', header:'Name', render:(a:any)=><span>{a.employeeName}</span> },
    { id:'dept', header:'Department', render:(a:any)=><span>{a.department}</span> },
    { id:'date', header:'Date', render:(a:any)=><span>{a.date}</span> },
    { id:'in', header:'Check-in', render:(a:any)=><span>{a.checkIn||'-'}</span> },
    { id:'out', header:'Check-out', render:(a:any)=><span>{a.checkOut||'-'}</span> },
    { id:'hrs', header:'Hours', render:(a:any)=><span>{a.workingHours}</span> },
    { id:'status', header:'Status', render:(a:any)=><Badge tone={a.status==='Present'?'success':a.status==='On Leave'?'info':a.status==='Absent'?'danger':'neutral'}>{a.status}</Badge> },
  ]} /></SectionCard></div>)
}

export function HRLeavePage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Leave Management' subtitle='Leave requests, balances, approvals' /><SectionCard title='Leave Requests'><DataTable data={hr.leaveRequests} rowKey={(l:any)=>l.id} columns={[
    { id:'emp', header:'Employee', render:(l:any)=><span>{l.employeeName}</span> },
    { id:'dept', header:'Department', render:(l:any)=><span>{l.department}</span> },
    { id:'type', header:'Leave Type', render:(l:any)=><span>{l.leaveType}</span> },
    { id:'start', header:'Start', render:(l:any)=><span>{l.startDate}</span> },
    { id:'end', header:'End', render:(l:any)=><span>{l.endDate}</span> },
    { id:'days', header:'Days', render:(l:any)=><span>{l.days}</span> },
    { id:'reason', header:'Reason', render:(l:any)=><span>{l.reason}</span> },
    { id:'status', header:'Status', render:(l:any)=><Badge tone={l.status==='Approved'?'success':l.status==='Rejected'?'danger':'warning'}>{l.status}</Badge> },
    { id:'actions', header:'Actions', render:(l:any)=>(l.status==='Pending'?<div style={{display:'flex',gap:'6px'}}><Button size='sm' variant='primary' onClick={()=>hr.updateLeaveRequest(l.id,'Approved')}>Approve</Button><Button size='sm' variant='soft' onClick={()=>hr.updateLeaveRequest(l.id,'Rejected')}>Reject</Button></div>:null) },
  ]} /></SectionCard></div>)
}

export function HRRecruitmentPage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Recruitment' subtitle='Job openings and candidates' /><SectionCard title='Job Openings'><DataTable data={hr.jobOpenings} rowKey={(j:any)=>j.id} columns={[
    { id:'title', header:'Job Title', render:(j:any)=><span>{j.jobTitle}</span> },
    { id:'dept', header:'Department', render:(j:any)=><span>{j.department}</span> },
    { id:'vac', header:'Vacancies', render:(j:any)=><span>{j.vacancies}</span> },
    { id:'type', header:'Type', render:(j:any)=><span>{j.employmentType}</span> },
    { id:'hm', header:'Hiring Manager', render:(j:any)=><span>{j.hiringManager}</span> },
    { id:'status', header:'Status', render:(j:any)=><Badge tone={j.status==='Open'?'success':'neutral'}>{j.status}</Badge> },
  ]} /></SectionCard><SectionCard title='Candidates' className='mms-section-card' style={{marginTop:'16px'}}><DataTable data={hr.candidates} rowKey={(c:any)=>c.id} columns={[
    { id:'name', header:'Name', render:(c:any)=><span>{c.name}</span> },
    { id:'pos', header:'Position', render:(c:any)=><span>{c.position}</span> },
    { id:'email', header:'Email', render:(c:any)=><span>{c.email}</span> },
    { id:'stage', header:'Stage', render:(c:any)=><Badge tone={c.stage==='Hired'?'success':c.stage==='Interview'?'info':'neutral'}>{c.stage}</Badge> },
    { id:'applied', header:'Applied', render:(c:any)=><span>{c.appliedDate}</span> },
  ]} /></SectionCard></div>)
}

export function HROnboardingPage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Onboarding' subtitle='New joiners and onboarding checklist' /><SectionCard title='Onboarding in Progress'><DataTable data={hr.onboarding} rowKey={(o:any)=>o.id} columns={[
    { id:'name', header:'Name', render:(o:any)=><span>{o.name}</span> },
    { id:'pos', header:'Position', render:(o:any)=><span>{o.position}</span> },
    { id:'start', header:'Start Date', render:(o:any)=><span>{o.startDate}</span> },
    { id:'status', header:'Status', render:(o:any)=><Badge tone={o.status==='Completed'?'success':'warning'}>{o.status}</Badge> },
    { id:'prog', header:'Checklist', render:(o:any)=><span>{o.checklist.filter((c:any)=>c.done).length+'/'+o.checklist.length+' completed'}</span> },
  ]} /></SectionCard></div>)
}

export function HRPayrollPage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR/Finance' title='Payroll' subtitle='Payroll preparation and coordination' /><SectionCard title='Payroll Periods'><DataTable data={hr.payrolls} rowKey={(p:any)=>p.id} columns={[
    { id:'period', header:'Period', render:(p:any)=><span>{p.period}</span> },
    { id:'cnt', header:'Employees', render:(p:any)=><span>{p.employeeCount}</span> },
    { id:'status', header:'Status', render:(p:any)=><Badge tone={p.status==='Processed'?'success':p.status==='Approved'?'info':p.status==='Prepared'?'warning':'neutral'}>{p.status}</Badge> },
  ]} /></SectionCard></div>)
}

export function HRPerformancePage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Performance' subtitle='Goals, reviews, appraisals' /><SectionCard title='Performance Reviews'><DataTable data={hr.performanceReviews} rowKey={(pr:any)=>pr.id} columns={[
    { id:'emp', header:'Employee', render:(pr:any)=><span>{pr.employeeName}</span> },
    { id:'period', header:'Review Period', render:(pr:any)=><span>{pr.reviewPeriod}</span> },
    { id:'status', header:'Status', render:(pr:any)=><Badge tone={pr.status==='Completed'?'success':pr.status==='In Progress'?'warning':'neutral'}>{pr.status}</Badge> },
  ]} /></SectionCard></div>)
}

export function HRRequestsPage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Employee Requests' subtitle='HR service requests' /><SectionCard title='Requests'><DataTable data={hr.employeeRequests} rowKey={(r:any)=>r.id} columns={[
    { id:'emp', header:'Employee', render:(r:any)=><span>{r.employeeName}</span> },
    { id:'cat', header:'Category', render:(r:any)=><span>{r.category}</span> },
    { id:'date', header:'Date', render:(r:any)=><span>{r.requestDate}</span> },
    { id:'prio', header:'Priority', render:(r:any)=><span>{r.priority}</span> },
    { id:'status', header:'Status', render:(r:any)=><Badge tone={r.status==='Completed'?'success':r.status==='In Progress'?'info':r.status==='Pending'?'warning':'neutral'}>{r.status}</Badge> },
  ]} /></SectionCard></div>)
}

export function HROffboardingPage(){
  const hr = useHRData()
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Offboarding' subtitle='Resignations, exits, clearance' /><SectionCard title='Offboarding'><DataTable data={hr.offboarding} rowKey={(o:any)=>o.id} columns={[
    { id:'emp', header:'Employee', render:(o:any)=><span>{o.employeeName}</span> },
    { id:'res', header:'Resignation Date', render:(o:any)=><span>{o.resignationDate}</span> },
    { id:'notice', header:'Notice Period End', render:(o:any)=><span>{o.noticePeriodEnd}</span> },
    { id:'status', header:'Status', render:(o:any)=><Badge tone={o.status==='Completed'?'success':o.status==='In Progress'?'warning':'neutral'}>{o.status}</Badge> },
  ]} /></SectionCard></div>)
}

export function HRReportsPage(){
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='Reports & Analytics' subtitle='HR reports and analytics' /><SectionCard title='Reports'><p>Employee directory, attendance, leave, recruitment, performance, and turnover reports available.</p></SectionCard></div>)
}

export function HRSettingsPage(){
  return (<div className='mms-page'><PageHeader eyebrow='HR' title='HR Settings' subtitle='Configuration and policies' /><SectionCard title='Configuration'><p>Departments, designations, employment types, leave types, policies, and permissions.</p></SectionCard></div>)
}

export function EmployeeProfilePage(){
  const { profile } = useDemoRole()
  const hr = useHRData()
  const emp = hr.employees.find((e:any)=>e.employeeId===profile.employeeId)||hr.employees[0]
  return (<div className='mms-page'><PageHeader eyebrow='Employee' title='My Profile' subtitle='Personal and employment details' /><SectionCard title='Personal Information'><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}><div><strong>Name:</strong> {emp.name}</div><div><strong>Email:</strong> {emp.email}</div><div><strong>Phone:</strong> {emp.phone}</div><div><strong>Department:</strong> {emp.department}</div></div></SectionCard><SectionCard title='Employment Information' className='mms-section-card' style={{marginTop:'16px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}><div><strong>Employee ID:</strong> {emp.employeeId}</div><div><strong>Designation:</strong> {emp.designation}</div><div><strong>Reporting Manager:</strong> {emp.reportingManager}</div><div><strong>Joining Date:</strong> {emp.joiningDate}</div><div><strong>Employment Type:</strong> {emp.employmentType}</div><div><strong>Status:</strong> {emp.status}</div></div></SectionCard></div>)
}

export function MyAttendancePage(){
  const hr = useHRData()
  const { profile } = useDemoRole()
  const myAtt = hr.attendance.filter((a:any)=>a.employeeId===profile.employeeId)
  return (<div className='mms-page'><PageHeader eyebrow='Employee' title='My Attendance' subtitle='Check-in/out and history' /><SectionCard title='Attendance History'><DataTable data={myAtt} rowKey={(a:any)=>a.id} emptyTitle='No records' columns={[
    { id:'date', header:'Date', render:(a:any)=><span>{a.date}</span> },
    { id:'in', header:'Check-in', render:(a:any)=><span>{a.checkIn||'-'}</span> },
    { id:'out', header:'Check-out', render:(a:any)=><span>{a.checkOut||'-'}</span> },
    { id:'hrs', header:'Hours', render:(a:any)=><span>{a.workingHours}</span> },
    { id:'status', header:'Status', render:(a:any)=><Badge tone={a.status==='Present'?'success':'neutral'}>{a.status}</Badge> },
  ]} /></SectionCard></div>)
}

export function MyLeavePage(){
  const hr = useHRData()
  const { profile } = useDemoRole()
  const myLeaves = hr.leaveRequests.filter((l:any)=>l.employeeId===profile.employeeId)
  return (<div className='mms-page'><PageHeader eyebrow='Employee' title='My Leave' subtitle='Leave requests and balances' /><SectionCard title='Leave Requests'><DataTable data={myLeaves} rowKey={(l:any)=>l.id} emptyTitle='No leave requests' columns={[
    { id:'type', header:'Type', render:(l:any)=><span>{l.leaveType}</span> },
    { id:'start', header:'Start', render:(l:any)=><span>{l.startDate}</span> },
    { id:'end', header:'End', render:(l:any)=><span>{l.endDate}</span> },
    { id:'days', header:'Days', render:(l:any)=><span>{l.days}</span> },
    { id:'status', header:'Status', render:(l:any)=><Badge tone={l.status==='Approved'?'success':l.status==='Rejected'?'danger':'warning'}>{l.status}</Badge> },
  ]} /></SectionCard></div>)
}

export function MyRequestsPage(){
  const hr = useHRData()
  const { profile } = useDemoRole()
  const myReq = hr.employeeRequests.filter((r:any)=>r.employeeId===profile.employeeId)
  return (<div className='mms-page'><PageHeader eyebrow='Employee' title='My Requests' subtitle='HR service requests' /><SectionCard title='Requests'><DataTable data={myReq} rowKey={(r:any)=>r.id} emptyTitle='No requests' columns={[
    { id:'cat', header:'Category', render:(r:any)=><span>{r.category}</span> },
    { id:'date', header:'Date', render:(r:any)=><span>{r.requestDate}</span> },
    { id:'status', header:'Status', render:(r:any)=><Badge tone={r.status==='Completed'?'success':r.status==='In Progress'?'info':'warning'}>{r.status}</Badge> },
  ]} /></SectionCard></div>)
}