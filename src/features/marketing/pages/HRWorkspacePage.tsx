import { Navigate, useParams } from 'react-router-dom'
import type { ComponentType } from 'react'
import { HR_HOME, getHRNavigationItem } from '../config/hrNavigation'
import { HRDashboard } from './hr/HRDashboard'
import { HREmployees } from './hr/HREmployees'
import { HRAttendance } from './hr/HRAttendance'
import { HRLeave } from './hr/HRLeave'
import { HRRecruitment } from './hr/HRRecruitment'
import { HROnboarding } from './hr/HROnboarding'
import { HRPayroll } from './hr/HRPayroll'
import { HRPerformance } from './hr/HRPerformance'
import { HRRequests } from './hr/HRRequests'
import { HROffboarding } from './hr/HROffboarding'
import { HRReports } from './hr/HRReports'
import { HRSettings } from './hr/HRSettings'
import type { HRModuleId } from '../types/hr'

const HR_PAGES: Record<HRModuleId, ComponentType> = {
  dashboard: HRDashboard,
  employees: HREmployees,
  attendance: HRAttendance,
  leave: HRLeave,
  recruitment: HRRecruitment,
  onboarding: HROnboarding,
  payroll: HRPayroll,
  performance: HRPerformance,
  requests: HRRequests,
  offboarding: HROffboarding,
  reports: HRReports,
  settings: HRSettings,
}

export function HRWorkspacePage() {
  const { section } = useParams<{ section: string }>()
  const navItem = section ? getHRNavigationItem(section) : undefined

  if (!section || !navItem) {
    return <Navigate to={HR_HOME} replace />
  }

  const Page = HR_PAGES[navItem.id]
  return <Page />
}
