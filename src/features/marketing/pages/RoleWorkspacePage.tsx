import { Navigate, useParams } from 'react-router-dom'
import { useDemoRole } from '../context/DemoRoleContext'
import { getRoleDefaultSection, getRoleNavigation, roleWorkspacePath } from '../config/roleNavigation'
import { MarketingWorkspacePage } from './MarketingWorkspacePage'

export function RoleWorkspacePage() {
  const { roleId } = useDemoRole()
  const { section } = useParams<{ section?: string }>()
  const navigation = getRoleNavigation(roleId)
  const defaultSection = getRoleDefaultSection(roleId)

  if (!section) {
    return <Navigate to={roleWorkspacePath(defaultSection)} replace />
  }

  if (!navigation.some((item) => item.id === section)) {
    return <Navigate to={roleWorkspacePath(defaultSection)} replace />
  }

  return <MarketingWorkspacePage section={section} />
}
