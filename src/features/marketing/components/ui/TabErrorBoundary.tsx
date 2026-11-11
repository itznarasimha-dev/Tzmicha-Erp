import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CircleAlert, RotateCcw } from 'lucide-react'
import { Button } from './Button'

interface TabErrorBoundaryProps {
  children: ReactNode
  tabLabel?: string
}

interface TabErrorBoundaryState {
  error: Error | null
}

/**
 * Keeps a rendering failure inside one tab instead of leaving the workspace blank.
 * The boundary is remounted whenever the module or tab changes.
 */
export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  state: TabErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Marketing] ${this.props.tabLabel ?? 'Tab'} failed to render`, error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="empty-state" role="alert" style={{ minHeight: 320 }}>
        <span className="empty-state__icon" aria-hidden="true">
          <CircleAlert size={24} />
        </span>
        <h3>This tab could not be displayed</h3>
        <p>
          The rest of the Marketing workspace is still available. Try the tab again, or switch to
          another tab and come back.
        </p>
        <Button
          variant="primary"
          icon={<RotateCcw size={15} />}
          onClick={() => this.setState({ error: null })}
        >
          Try again
        </Button>
      </div>
    )
  }
}
