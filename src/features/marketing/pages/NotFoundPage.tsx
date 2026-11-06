import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { getFirstVisibleModulePath, getVisibleModules } from '../config/navigation'

const homePath = getFirstVisibleModulePath()
const visibleCount = getVisibleModules().length

export function NotFoundPage() {
  return (
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <span className="empty-state__icon" aria-hidden="true">
        <Compass size={24} />
      </span>
      <h3>This page is not part of the Marketing portal</h3>
      <p>
        The address may be incorrect, or the module does not exist. Only the {visibleCount} Marketing
        modules in the sidebar are available.
      </p>
      <Link to={homePath} style={{ marginTop: 8 }}>
        <Button variant="primary" icon={<Home size={15} />}>
          Back to Marketing workspace
        </Button>
      </Link>
    </div>
  )
}

export function ModuleNotFound() {
  return (
    <div className="empty-state" style={{ minHeight: '50vh' }}>
      <span className="empty-state__icon" aria-hidden="true">
        <Compass size={24} />
      </span>
      <h3>Marketing module not found</h3>
      <p>Choose one of the {visibleCount} Marketing modules from the sidebar to continue.</p>
      <Link to={homePath} style={{ marginTop: 8 }}>
        <Button variant="primary">Open Marketing workspace</Button>
      </Link>
    </div>
  )
}
