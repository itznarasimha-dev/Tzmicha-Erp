import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardList,
  Compass,
  Lightbulb,
  Megaphone,
  ReceiptText,
  Search,
  Target,
  UserRound,
  Users,
} from 'lucide-react'
import {
  getRoleDefaultSection,
  getRoleNavigation,
  roleWorkspacePath,
} from '../../config/roleNavigation'
import { useDemoRole } from '../../context/DemoRoleContext'
import { useMarketingDepartment } from '../../context/MarketingDepartmentContext'
import { useClickOutside } from '../../hooks/useClickOutside'

interface SearchResult {
  id: string
  title: string
  subtitle: string
  href: string
  group: string
  icon: typeof Search
}

interface GlobalSearchProps {
  onNavigate?: () => void
  autoFocus?: boolean
  className?: string
}

export function GlobalSearch({ onNavigate, autoFocus = false, className = '' }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const navigate = useNavigate()
  const { roleId } = useDemoRole()
  const department = useMarketingDepartment()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useClickOutside(rootRef, () => setOpen(false), open)

  useEffect(() => {
    if (autoFocus) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 60)
      return () => window.clearTimeout(timer)
    }
  }, [autoFocus])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const availableSections = new Set(getRoleNavigation(roleId).map((item) => item.id))
    const sectionPath = (preferred: string) =>
      roleWorkspacePath(
        availableSections.has(preferred) ? preferred : getRoleDefaultSection(roleId),
      )
    const matches: SearchResult[] = []
    const add = (result: SearchResult) => matches.push(result)

    department.leads
      .filter((lead) =>
        `${lead.name} ${lead.businessName} ${lead.phone} ${lead.email} ${lead.location} ${lead.product} ${lead.stage}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 5)
      .forEach((lead) => {
        add({
          id: `lead-${lead.id}`,
          title: lead.name,
          subtitle: `${lead.businessName || lead.product} · ${lead.stage}`,
          href: sectionPath('pipeline'),
          group: 'Leads',
          icon: Target,
        })
      })

    department.campaigns
      .filter((campaign) =>
        `${campaign.name} ${campaign.objective} ${campaign.targetAudience} ${campaign.status}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 4)
      .forEach((campaign) => {
        add({
          id: `campaign-${campaign.id}`,
          title: campaign.name,
          subtitle: `${campaign.status} · ${department.sectors.find((sector) => sector.id === campaign.sectorId)?.name ?? 'Sector'}`,
          href: sectionPath('campaigns'),
          group: 'Campaigns',
          icon: Megaphone,
        })
      })

    department.sectors
      .filter((sector) =>
        `${sector.name} ${sector.code} ${sector.description} ${sector.objective} ${sector.status}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 4)
      .forEach((sector) => {
        add({
          id: `sector-${sector.id}`,
          title: sector.name,
          subtitle: `${sector.status} · monthly target ${sector.monthlyLeadTarget} leads`,
          href: sectionPath(roleId === 'senior' ? 'sector' : 'department'),
          group: 'Sectors',
          icon: BriefcaseBusiness,
        })
      })

    department.employees
      .filter((employee) =>
        `${employee.name} ${employee.email} ${employee.designation} ${employee.role} ${employee.location}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 4)
      .forEach((employee) => {
        add({
          id: `employee-${employee.id}`,
          title: employee.name,
          subtitle: `${employee.designation} · ${employee.role}`,
          href: sectionPath(roleId === 'senior' ? 'team' : 'department'),
          group: 'People',
          icon: Users,
        })
      })

    department.tasks
      .filter((task) =>
        `${task.title} ${task.category} ${task.description} ${task.status}`.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .forEach((task) => {
        add({
          id: `task-${task.id}`,
          title: task.title,
          subtitle: `${task.category} · ${task.status}`,
          href: sectionPath(roleId === 'manager' ? 'assignment' : 'tasks'),
          group: 'Work',
          icon: ClipboardList,
        })
      })

    department.approvalRequests
      .filter((request) =>
        `${request.title} ${request.summary} ${request.kind} ${request.status}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 3)
      .forEach((request) => {
        add({
          id: `approval-${request.id}`,
          title: request.title,
          subtitle: `${request.kind} · ${request.status}`,
          href: sectionPath('approvals'),
          group: 'Approvals',
          icon: BadgeCheck,
        })
      })

    department.expenses
      .filter((expense) =>
        `${expense.title} ${expense.category} ${expense.employeeName} ${expense.status} ${expense.description}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 3)
      .forEach((expense) => {
        add({
          id: `expense-${expense.id}`,
          title: expense.title,
          subtitle: `${expense.category} · ${expense.status}`,
          href: sectionPath('expenses'),
          group: 'Expenses',
          icon: ReceiptText,
        })
      })

    department.plans
      .filter((plan) =>
        `${plan.title} ${plan.objective} ${plan.type} ${plan.status}`.toLowerCase().includes(q),
      )
      .slice(0, 3)
      .forEach((plan) => {
        add({
          id: `plan-${plan.id}`,
          title: plan.title,
          subtitle: `${plan.type} · ${plan.status}`,
          href: sectionPath('planning'),
          group: 'Plans',
          icon: Compass,
        })
      })

    department.ideas
      .filter((idea) =>
        `${idea.title} ${idea.description} ${idea.status} ${idea.submittedByName}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 3)
      .forEach((idea) => {
        add({
          id: `idea-${idea.id}`,
          title: idea.title,
          subtitle: `${idea.submittedByName} · ${idea.status}`,
          href: sectionPath('ideas'),
          group: 'Ideas',
          icon: Lightbulb,
        })
      })

    department.followUps
      .filter((followUp) => {
        const lead = department.leads.find((item) => item.id === followUp.leadId)
        return `${lead?.name ?? ''} ${lead?.businessName ?? ''} ${followUp.mode} ${followUp.status}`
          .toLowerCase()
          .includes(q)
      })
      .slice(0, 3)
      .forEach((followUp) => {
        const lead = department.leads.find((item) => item.id === followUp.leadId)
        add({
          id: `follow-up-${followUp.id}`,
          title: lead?.name ?? 'Follow-up',
          subtitle: `${followUp.mode} · ${followUp.status}`,
          href: sectionPath('follow-ups'),
          group: 'Follow-ups',
          icon: UserRound,
        })
      })

    return matches
  }, [query, department, roleId])

  useEffect(() => {
    setHighlight(0)
  }, [query])

  const grouped = useMemo(() => {
    const groups = new Map<string, SearchResult[]>()
    results.forEach((result) => {
      const existing = groups.get(result.group) ?? []
      existing.push(result)
      groups.set(result.group, existing)
    })
    return [...groups.entries()]
  }, [results])

  const selectResult = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    onNavigate?.()
    navigate(result.href)
  }

  const flatResults = results.slice(0, 14)

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!open || flatResults.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((current) => (current + 1) % flatResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((current) => (current - 1 + flatResults.length) % flatResults.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const result = flatResults[highlight]
      if (result) selectResult(result)
    }
  }

  let runningIndex = -1

  return (
    <div className={`global-search ${className}`.trim()} ref={rootRef}>
      <div className="input-icon">
        <Search size={15} aria-hidden="true" />
        <input
          ref={inputRef}
          className="input"
          type="search"
          value={query}
          placeholder="Search leads, sectors, campaigns, people…"
          aria-label="Global marketing search"
          aria-expanded={open && query.trim().length > 0}
          aria-controls="global-search-results"
          role="combobox"
          aria-autocomplete="list"
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <kbd className="search-kbd">Ctrl K</kbd>
      </div>
      {open && query.trim() ? (
        <div className="search-panel" id="global-search-results" role="listbox">
          {flatResults.length === 0 ? (
            <div className="search-empty">
              No records match “{query.trim()}”. Try a lead, sector, campaign, task or expense.
            </div>
          ) : (
            <div className="search-panel__section">
              {grouped.map(([group, groupResults]) => (
                <div key={group}>
                  <p className="search-panel__label">{group}</p>
                  {groupResults.map((result) => {
                    runningIndex += 1
                    const isHighlighted = runningIndex === highlight
                    const Icon = result.icon
                    return (
                      <button
                        key={result.id}
                        type="button"
                        role="option"
                        aria-selected={isHighlighted}
                        className={`search-result ${isHighlighted ? 'is-highlighted' : ''}`.trim()}
                        onMouseEnter={() => setHighlight(runningIndex)}
                        onClick={() => selectResult(result)}
                      >
                        <span className="search-result__icon">
                          <Icon size={14} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: 'block',
                              color: 'var(--text)',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {result.title}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--muted)' }}>
                            {result.subtitle}
                          </span>
                        </span>
                        <ArrowUpRight size={12} className="search-result__meta" />
                      </button>
                    )
                  })}
                </div>
              ))}
              <p className="text-xs faint" style={{ padding: '7px 9px 2px' }}>
                Search covers marketing records stored in this browser.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
