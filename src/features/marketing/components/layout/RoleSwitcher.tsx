import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Eye, ShieldCheck, UserRoundCog } from 'lucide-react'
import { roleWorkspaceHome } from '../../config/roleNavigation'
import { HR_HOME, getHRNavigationItem, isHRPath } from '../../config/hrNavigation'
import { useDemoRole } from '../../context/DemoRoleContext'
import { useToast } from '../../context/ToastContext'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useClickOutside } from '../../hooks/useClickOutside'
import type { DemoRoleId } from '../../types/workflow'

const roleTone: Record<DemoRoleId, string> = {
  junior: 'var(--chart-1)',
  senior: 'var(--chart-2)',
  manager: 'var(--chart-3)',
  hr: 'var(--chart-1)',
  finance: 'var(--chart-3)',
  employee: 'var(--chart-5)',
}

export function RoleSwitcher() {
  const { roleId, profile, profiles, setRoleId } = useDemoRole()
  const { inboxItems } = useWorkflow()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, () => setOpen(false), open)

  const pending = useMemo(
    () =>
      isHRPath(location.pathname)
        ? 0
        : inboxItems.filter((item) => item.mode === 'decision').length,
    [inboxItems, location.pathname],
  )

  const selectRole = (next: DemoRoleId) => {
    if (next !== roleId) {
      const nextProfile = profiles.find((item) => item.id === next)
      setRoleId(next)
      const hrSection = location.pathname.split('/')[2]
      navigate(
        isHRPath(location.pathname)
          ? getHRNavigationItem(hrSection)
            ? `/hr/${hrSection}`
            : HR_HOME
          : roleWorkspaceHome(next),
      )
      pushToast({
        title: `Preview role: ${nextProfile?.roleLabel ?? next}`,
        description: 'This only changes the local demo view. No real permission or identity is changed.',
        tone: 'info',
      })
    }
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`role-switcher ${open ? 'is-open' : ''}`.trim()}
        aria-label={`Preview role: ${profile.roleLabel}. Change demo role`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Switch preview role — demo only"
      >
        <span
          className="role-switcher__avatar"
          style={{ background: roleTone[roleId] }}
          aria-hidden="true"
        >
          {profile.initials}
        </span>
        <span className="role-switcher__text">
          <span className="role-switcher__eyebrow">Preview role</span>
          <span className="role-switcher__name">{profile.shortLabel}</span>
        </span>
        {pending > 0 ? (
          <span className="role-switcher__count" aria-label={`${pending} items need a decision`}>
            {pending}
          </span>
        ) : null}
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open ? (
        <div className="menu role-switcher__menu" role="menu" aria-label="Preview role options">
          <div className="role-switcher__head">
            <span className="role-switcher__head-icon"><Eye size={14} /></span>
            <div>
              <p className="role-switcher__head-title">Preview-only role switcher</p>
              <p className="text-xs muted">Not authentication. Changes the demo view only.</p>
            </div>
          </div>
          <div className="menu__divider" />
          {profiles.map((item) => {
            const active = item.id === roleId
            return (
              <button
                key={item.id}
                type="button"
                className={`menu__item role-switcher__option ${active ? 'is-active' : ''}`.trim()}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => selectRole(item.id)}
              >
                <span
                  className="role-switcher__option-avatar"
                  style={{ background: roleTone[item.id] }}
                  aria-hidden="true"
                >
                  {item.initials}
                </span>
                <span className="role-switcher__option-text">
                  <span className="role-switcher__option-name">{item.name}</span>
                  <span className="role-switcher__option-role">{item.roleLabel}</span>
                  <span className="role-switcher__option-scope">{item.scope}</span>
                </span>
                {active ? <ShieldCheck size={14} className="role-switcher__check" aria-hidden="true" /> : null}
              </button>
            )
          })}
          <div className="menu__divider" />
          <p className="role-switcher__foot">
            <UserRoundCog size={12} /> Demo records are stored in this browser only.
          </p>
        </div>
      ) : null}
    </div>
  )
}
