import { LogOut, ShieldCheck } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ProgressBar, utilisationTone } from '../ui/ProgressBar'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useDemoData } from '../../context/DemoDataContext'
import { demoEmployee } from '../../data/marketing/plans'
import { performanceSeries } from '../../data/marketing/dashboard'
import { formatDate, formatINR } from '../../utils/format'
import { clamp } from '../../utils/format'

interface EmployeeProfileModalProps {
  open: boolean
  onClose: () => void
}

export function EmployeeProfileModal({ open, onClose }: EmployeeProfileModalProps) {
  const { session, signOut } = useAuth()
  const { data, lastSavedAt, storageAvailable } = useDemoData()

  const current = performanceSeries[performanceSeries.length - 1]
  const activeCampaigns = data.campaigns.filter((campaign) => campaign.status === 'Active').length

  const targets = [
    {
      label: 'Monthly qualified leads',
      achieved: current.leads,
      target: demoEmployee.targets.monthlyLeads,
      format: (value: number) => String(Math.round(value)),
    },
    {
      label: 'Attributed revenue',
      achieved: current.revenue,
      target: demoEmployee.targets.monthlyRevenue,
      format: (value: number) => formatINR(value),
    },
    {
      label: 'Active campaigns',
      achieved: activeCampaigns,
      target: demoEmployee.targets.campaignCount,
      format: (value: number) => String(Math.round(value)),
    },
    {
      label: 'Field visits completed',
      achieved: 33,
      target: demoEmployee.targets.fieldVisits,
      format: (value: number) => String(Math.round(value)),
    },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Employee profile"
      description="Demo employee workspace — no administrator controls are available in this portal."
      footer={
        <>
          <Button
            variant="ghost"
            className="modal-footer__start"
            icon={<LogOut size={15} />}
            onClick={signOut}
          >
            Sign out
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="row-12" style={{ alignItems: 'flex-start' }}>
        <Avatar name={demoEmployee.name} size="xl" />
        <div className="grow">
          <div className="row-8 wrap">
            <h3 style={{ fontSize: '1.05rem' }}>{session?.name ?? demoEmployee.name}</h3>
            <span className="badge badge--warning">Demo employee</span>
          </div>
          <p className="text-sm muted">
            {session?.role ?? demoEmployee.role} · {session?.department ?? demoEmployee.department}
          </p>
          <div className="row-10 wrap mt-8" style={{ gap: 6 }}>
            <span className="code-tag">{session?.employeeId ?? demoEmployee.id}</span>
            <span className="tag">{demoEmployee.location}</span>
          </div>
        </div>
      </div>

      <div className="detail-grid mt-16">
        <div className="detail-item">
          <dt>Email</dt>
          <dd>{session?.email ?? demoEmployee.email}</dd>
        </div>
        <div className="detail-item">
          <dt>Phone</dt>
          <dd>{demoEmployee.phone}</dd>
        </div>
        <div className="detail-item">
          <dt>Joined</dt>
          <dd>{formatDate(demoEmployee.joinDate)}</dd>
        </div>
        <div className="detail-item">
          <dt>Department</dt>
          <dd>{session?.department ?? demoEmployee.department}</dd>
        </div>
      </div>

      <div className="divider" style={{ margin: '18px 0' }} />

      <div className="between" style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: '0.85rem' }}>Assigned targets</h4>
        <span className="text-xs faint">Illustrative demo targets</span>
      </div>
      <div className="stack-12">
        {targets.map((item) => {
          const percent = item.target > 0 ? clamp((item.achieved / item.target) * 100, 0, 160) : 0
          return (
            <div key={item.label}>
              <div className="between" style={{ marginBottom: 4 }}>
                <span className="text-sm">{item.label}</span>
                <span className="text-xs muted mono">
                  {item.format(item.achieved)} / {item.format(item.target)}
                </span>
              </div>
              <ProgressBar value={percent} tone={utilisationTone(percent)} size="sm" />
            </div>
          )
        })}
      </div>

      <div className="callout callout--info mt-16">
        <ShieldCheck size={16} />
        <span>
          This is a frontend demonstration profile. The session is not authenticated against a real
          identity provider. Demo changes are saved in this browser
          {storageAvailable ? '' : ' (storage is currently unavailable, so changes last for this session)'}
          {lastSavedAt ? ` · last saved ${lastSavedAt.toLocaleTimeString('en-IN')}` : ''}.
        </span>
      </div>
    </Modal>
  )
}
