import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { DemoDataProvider } from './context/DemoDataContext'
import { DemoRoleProvider } from './context/DemoRoleContext'
import { RoleWorkspaceProvider } from './context/RoleWorkspaceContext'
import { MarketingDepartmentProvider } from './context/MarketingDepartmentContext'
import { HRDataProvider as LegacyHRDataProvider } from './pages/marketing-workspace/HRContext'
import { HRDataProvider } from './context/HRContext'
import { AppLayout } from './components/layout/AppLayout'
import { MarketingDashboard } from './pages/MarketingDashboard'
import { MarketingModulePage } from './pages/MarketingModulePage'
import { RoleWorkspacePage } from './pages/RoleWorkspacePage'
import { HRWorkspacePage } from './pages/HRWorkspacePage'
import { NotFoundPage } from './pages/NotFoundPage'

const homePath = '/marketing/workspace'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DemoRoleProvider>
            <DemoDataProvider>
              <RoleWorkspaceProvider>
                <MarketingDepartmentProvider>
                  <LegacyHRDataProvider>
                    <HRDataProvider>
                      <BrowserRouter>
                        <Routes>
                          {/* The role workspace is the primary home. Existing marketing modules remain routable below it. */}
                          <Route path="/login" element={<Navigate to={homePath} replace />} />
                          <Route element={<AppLayout />}>
                            <Route path="/" element={<Navigate to={homePath} replace />} />
                            <Route path="/marketing" element={<Navigate to={homePath} replace />} />
                            <Route path="/marketing/workspace" element={<RoleWorkspacePage />} />
                            <Route path="/marketing/workspace/:section" element={<RoleWorkspacePage />} />
                            <Route path="/marketing/dashboard" element={<MarketingDashboard />} />
                            <Route path="/marketing/dashboard/:tab" element={<Navigate to="/marketing/dashboard" replace />} />
                            <Route path="/marketing/:moduleId" element={<MarketingModulePage />} />
                            <Route path="/marketing/:moduleId/:tab" element={<MarketingModulePage />} />
                            <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
                            <Route path="/hr/:section" element={<HRWorkspacePage />} />
                            <Route path="*" element={<NotFoundPage />} />
                          </Route>
                        </Routes>
                      </BrowserRouter>
                    </HRDataProvider>
                  </LegacyHRDataProvider>
                </MarketingDepartmentProvider>
              </RoleWorkspaceProvider>
            </DemoDataProvider>
          </DemoRoleProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
