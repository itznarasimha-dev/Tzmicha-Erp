import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider, ThemeProvider } from './store'
import { ToastViewport } from './components/ui'
import { AppLayout } from './components/layout'
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
              <Route path="/" element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/recruitment" element={<Recruitment />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/payments" element={<DailyPayments />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/offboarding" element={<Offboarding />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <ToastViewport />
        </BrowserRouter>
      </StoreProvider>
    </ThemeProvider>
  )
}
