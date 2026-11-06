import { useDemoRole } from '../context/DemoRoleContext'
import { MarketingManagerDashboard as ManagerDashboardPage } from './workspace/MarketingManagerDashboard'
import { SeniorMarketingDashboard as SeniorDashboardPage } from './workspace/SeniorMarketingDashboard'
import { JuniorMarketingDashboard as JuniorDashboardPage } from './workspace/JuniorMarketingDashboard'
import { HROnboardingPage as HRDashboardPage } from './marketing-workspace/HRPages'
import { HROnboardingPage as FinanceDashboardPage } from './marketing-workspace/HRPages'
import { EmployeeProfilePage as EmployeeDashboardPage } from './marketing-workspace/HRPages'
import { MarketingDepartmentPage, SeniorSectorPage, SeniorTeamPage } from './marketing-workspace/DepartmentPages'
import { WorkAssignmentPage, TasksPage } from './marketing-workspace/WorkPages'
import { LeadGenerationPage, LeadPipelinePage, FollowUpsPage } from './marketing-workspace/LeadPages'
import { CampaignsPage, ExpensesPage, IdeasPage, ApprovalsPage, ActivitiesPage } from './marketing-workspace/OpsPages'
import { BudgetsPage, PlanningPage, TeamPerformancePage, ReportsPage } from './marketing-workspace/InsightPages'
import {
  HREmployeesPage,
  HRAttendancePage,
  HRLeavePage,
  HRRecruitmentPage,
  HROnboardingPage,
  HRPayrollPage,
  HRPerformancePage,
  HRRequestsPage,
  HROffboardingPage,
  HRReportsPage,
  HRSettingsPage,
  EmployeeProfilePage,
  MyAttendancePage,
  MyLeavePage,
  MyRequestsPage,
} from './marketing-workspace/HRPages'

/**
 * Maps role-specific workspace sections to the new Marketing Department
 * Management System. Legacy module routes stay available but are no longer
 * part of the primary navigation.
 */
export function MarketingWorkspacePage({ section }: { section: string }) {
  const { roleId } = useDemoRole()

  if (roleId === 'hr') {
    switch (section) {
      case 'employees':
        return <HREmployeesPage />
      case 'attendance':
        return <HRAttendancePage />
      case 'leave':
        return <HRLeavePage />
      case 'recruitment':
        return <HRRecruitmentPage />
      case 'onboarding':
        return <HROnboardingPage />
      case 'payroll':
        return <HRPayrollPage />
      case 'performance':
        return <HRPerformancePage />
      case 'requests':
        return <HRRequestsPage />
      case 'offboarding':
        return <HROffboardingPage />
      case 'reports':
        return <HRReportsPage />
      case 'settings':
        return <HRSettingsPage />
      case 'dashboard':
      default:
        return <HRDashboardPage />
    }
  }

  if (roleId === 'finance') {
    switch (section) {
      case 'payroll':
        return <HRPayrollPage />
      case 'approvals':
        return <ApprovalsPage />
      case 'reports':
        return <HRReportsPage />
      case 'dashboard':
      default:
        return <FinanceDashboardPage />
    }
  }

  if (roleId === 'employee') {
    switch (section) {
      case 'profile':
        return <EmployeeProfilePage />
      case 'attendance':
        return <MyAttendancePage />
      case 'leave':
        return <MyLeavePage />
      case 'requests':
        return <MyRequestsPage />
      case 'dashboard':
      default:
        return <EmployeeDashboardPage />
    }
  }

  if (roleId === 'manager') {
    switch (section) {
      case 'department':
        return <MarketingDepartmentPage />
      case 'planning':
        return <PlanningPage />
      case 'assignment':
        return <WorkAssignmentPage />
      case 'budgets':
        return <BudgetsPage />
      case 'pipeline':
        return <LeadPipelinePage />
      case 'handovers':
        return <LeadPipelinePage mode="handovers" />
      case 'campaigns':
        return <CampaignsPage />
      case 'performance':
        return <TeamPerformancePage />
      case 'expenses':
        return <ExpensesPage />
      case 'ideas':
        return <IdeasPage />
      case 'approvals':
        return <ApprovalsPage />
      case 'reports':
        return <ReportsPage />
      case 'dashboard':
      default:
        return <ManagerDashboardPage />
    }
  }

  if (roleId === 'senior') {
    switch (section) {
      case 'planning':
        return <PlanningPage />
      case 'sector':
        return <SeniorSectorPage />
      case 'team':
        return <SeniorTeamPage />
      case 'assignment':
        return <WorkAssignmentPage mode="senior" />
      case 'tasks':
        return <TasksPage />
      case 'lead-generation':
        return <LeadGenerationPage />
      case 'pipeline':
        return <LeadPipelinePage />
      case 'follow-ups':
        return <FollowUpsPage />
      case 'campaigns':
        return <CampaignsPage />
      case 'performance':
        return <TeamPerformancePage />
      case 'expenses':
        return <ExpensesPage />
      case 'ideas':
        return <IdeasPage />
      case 'dashboard':
      default:
        return <SeniorDashboardPage />
    }
  }

  switch (section) {
    case 'planning':
      return <PlanningPage />
    case 'tasks':
      return <TasksPage />
    case 'lead-generation':
      return <LeadGenerationPage />
    case 'follow-ups':
      return <FollowUpsPage />
    case 'pipeline':
      return <LeadPipelinePage />
    case 'activities':
      return <ActivitiesPage />
    case 'campaigns':
      return <CampaignsPage />
    case 'expenses':
      return <ExpensesPage />
    case 'ideas':
      return <IdeasPage />
    case 'performance':
      return <TeamPerformancePage />
    case 'dashboard':
    default:
      return <JuniorDashboardPage />
  }
}
