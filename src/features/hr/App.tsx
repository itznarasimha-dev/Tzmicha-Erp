import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider, ThemeProvider } from './store'
import { ToastViewport } from './components/ui'
import { AppLayout } from './components/layout'
import { HrRouteGuard } from './components/hr-guard'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import EmployeeProfile from './pages/EmployeeProfile'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Recruitment from './pages/Recruitment'
import Onboarding from './pages/Onboarding'
import Payroll from './pages/Payroll'
import Contracts from './pages/Contracts'
import ContractDetail from './pages/ContractDetail'
import DailyPayments from './pages/DailyPayments'
import Expenses from './pages/Expenses'
import Performance from './pages/Performance'
import Requests from './pages/Requests'
import Offboarding from './pages/Offboarding'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HrRouteGuard routeId="dashboard"><Dashboard /></HrRouteGuard>} />
              <Route path="/employees" element={<HrRouteGuard routeId="employees"><Employees /></HrRouteGuard>} />
              <Route path="/employees/:id" element={<HrRouteGuard routeId="employee-profile"><EmployeeProfile /></HrRouteGuard>} />
              <Route path="/attendance" element={<HrRouteGuard routeId="attendance"><Attendance /></HrRouteGuard>} />
              <Route path="/leave" element={<HrRouteGuard routeId="leave"><Leave /></HrRouteGuard>} />
              <Route path="/recruitment" element={<HrRouteGuard routeId="recruitment"><Recruitment /></HrRouteGuard>} />
              <Route path="/onboarding" element={<HrRouteGuard routeId="onboarding"><Onboarding /></HrRouteGuard>} />
              <Route path="/payroll" element={<HrRouteGuard routeId="payroll"><Payroll /></HrRouteGuard>} />
              <Route path="/contracts" element={<HrRouteGuard routeId="contracts"><Contracts /></HrRouteGuard>} />
              <Route path="/contracts/:id" element={<HrRouteGuard routeId="contract-detail"><ContractDetail /></HrRouteGuard>} />
              <Route path="/payments" element={<HrRouteGuard routeId="payments"><DailyPayments /></HrRouteGuard>} />
              <Route path="/expenses" element={<HrRouteGuard routeId="expenses"><Expenses /></HrRouteGuard>} />
              <Route path="/performance" element={<HrRouteGuard routeId="performance"><Performance /></HrRouteGuard>} />
              <Route path="/requests" element={<HrRouteGuard routeId="requests"><Requests /></HrRouteGuard>} />
              <Route path="/offboarding" element={<HrRouteGuard routeId="offboarding"><Offboarding /></HrRouteGuard>} />
              <Route path="/reports" element={<HrRouteGuard routeId="reports"><Reports /></HrRouteGuard>} />
              <Route path="/settings" element={<HrRouteGuard routeId="settings"><Settings /></HrRouteGuard>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <ToastViewport />
        </BrowserRouter>
      </StoreProvider>
    </ThemeProvider>
  )
}
