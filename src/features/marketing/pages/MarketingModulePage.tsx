import { Navigate, useLocation, useParams } from 'react-router-dom'
import { CalendarDays, Database, ShieldCheck } from 'lucide-react'
import { getDefaultTab, getModule } from '../config/navigation'
import type { ModuleId } from '../types/marketing'
import { PageHeader } from '../components/ui/PageHeader'
import { ModuleTabs } from '../components/ui/ModuleTabs'
import { TabErrorBoundary } from '../components/ui/TabErrorBoundary'
import { NotFoundPage } from './NotFoundPage'
import { LeadsPage } from './LeadsPage'
import { PlansBudgetsPage } from './PlansBudgetsPage'
import { DigitalMarketingPage } from './DigitalMarketingPage'
import { FieldMarketingPage } from './FieldMarketingPage'
import { TradeRetailPage } from './TradeRetailPage'
import { AgenciesPartnersPage } from './AgenciesPartnersPage'
import { MarketingAssetsPage } from './MarketingAssetsPage'
import { ExpensesPaymentsPage } from './ExpensesPaymentsPage'
import { ApprovalsContractsPage } from './ApprovalsContractsPage'
import { ReportsAnalyticsPage } from './ReportsAnalyticsPage'
import { AIAssistantPage } from './AIAssistantPage'
import { MonthlyPlansWorkspace } from '../components/workflow/MonthlyPlansWorkspace'
import { MonthlyExpensesWorkspace } from '../components/workflow/MonthlyExpensesWorkspace'
import { ApprovalInboxPage } from '../components/workflow/ApprovalInboxPage'

export function MarketingModulePage() {
  const { moduleId, tab } = useParams()
  const location = useLocation()
  const module = getModule(moduleId)

  if (!module) return <NotFoundPage />

  const activeTab =
    tab && module.tabs.some((item) => item.id === tab) ? tab : getDefaultTab(module)

  if (!tab || !module.tabs.some((item) => item.id === tab)) {
    return <Navigate to={`${module.path}/${activeTab}${location.search}`} replace />
  }

  return (
    <div className="stack-24">
      <PageHeader
        eyebrow="Marketing workspace · Local demo"
        title={module.label}
        subtitle={module.description}
        meta={
          <>
            <span className="page-meta-item">
              <Database size={13} /> Demo data stored in this browser
            </span>
            <span className="page-meta-item">
              <CalendarDays size={13} /> FY 2026–27 · Q3
            </span>
            <span className="page-meta-item">
              <ShieldCheck size={13} /> No backend connected
            </span>
          </>
        }
      />
      <ModuleTabs module={module} activeTab={activeTab} />
      <div className="tab-content" key={`${module.id}-${activeTab}`}>
        <div className="tab-panel">
          <TabErrorBoundary key={`${module.id}-${activeTab}`} tabLabel={module.tabs.find((item) => item.id === activeTab)?.label}>
            <ModuleTabContent moduleId={module.id} tab={activeTab} />
          </TabErrorBoundary>
        </div>
      </div>
    </div>
  )
}

function ModuleTabContent({ moduleId, tab }: { moduleId: ModuleId; tab: string }) {
  switch (moduleId) {
    case 'plans':
      if (tab === 'monthly-plans') return <MonthlyPlansWorkspace />
      return <PlansBudgetsPage tab={tab} />
    case 'digital':
      return <DigitalMarketingPage tab={tab} />
    case 'field':
      return <FieldMarketingPage tab={tab} />
    case 'trade':
      return <TradeRetailPage tab={tab} />
    case 'agencies':
      return <AgenciesPartnersPage tab={tab} />
    case 'assets':
      return <MarketingAssetsPage tab={tab} />
    case 'leads':
      return <LeadsPage tab={tab} />
    case 'expenses':
      if (tab === 'monthly-expenses') return <MonthlyExpensesWorkspace />
      return <ExpensesPaymentsPage tab={tab} />
    case 'approvals':
      if (tab === 'approval-inbox') return <ApprovalInboxPage />
      return <ApprovalsContractsPage tab={tab} />
    case 'reports':
      return <ReportsAnalyticsPage tab={tab} />
    case 'assistant':
      return <AIAssistantPage tab={tab} />
    default:
      return null
  }
}
