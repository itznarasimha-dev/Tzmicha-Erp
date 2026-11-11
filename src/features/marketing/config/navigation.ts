import {
  Activity,
  BadgeCheck,
  BadgePercent,
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Circle,
  Clapperboard,
  ClipboardList,
  Clock3,
  Download,
  FileSignature,
  FileText,
  FolderKanban,
  Gauge,
  Gift,
  Globe,
  Handshake,
  Image,
  Images,
  Landmark,
  LayoutDashboard,
  LayoutList,
  Lightbulb,
  LineChart,
  Mail,
  MapPin,
  MapPinned,
  Megaphone,
  MonitorSmartphone,
  MousePointerClick,
  Package,
  PenTool,
  PieChart,
  PiggyBank,
  Printer,
  Receipt,
  ReceiptText,
  Route,
  Scale,
  SearchCheck,
  Share2,
  ShieldCheck,
  Star,
  Store,
  Target,
  TrendingUp,
  Trophy,
  Users,
  UsersRound,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleId } from '../types/marketing'

export interface ModuleTab {
  id: string
  label: string
  /** Optional icon shown in the compact glass tab bar. */
  icon?: LucideIcon
}

export interface MarketingModule {
  id: ModuleId
  label: string
  path: string
  description: string
  icon: LucideIcon
  tabs: ModuleTab[]
  /** Hidden from the employee-facing Marketing navigation, but still routable. */
  hidden?: boolean
}

const tabIcons: Record<string, LucideIcon> = {
  overview: LayoutList,
  'monthly-plans': CalendarRange,
  'annual-plans': CalendarRange,
  'quarterly-plans': CalendarClock,
  'campaign-budgets': PiggyBank,
  'budget-tracking': Gauge,
  'forecast-vs-actual': Scale,
  campaigns: Megaphone,
  'paid-advertising': MousePointerClick,
  'social-media': Share2,
  'email-marketing': Mail,
  'website-seo': Globe,
  'content-studio': PenTool,
  influencers: Star,
  'video-production': Video,
  'field-teams': UsersRound,
  'field-visits': MapPin,
  'store-visits': Store,
  'event-activities': CalendarDays,
  'market-research': SearchCheck,
  'expense-claims': ReceiptText,
  'monthly-expenses': ReceiptText,
  'visit-reports': ClipboardList,
  'store-activities': Store,
  'posters-banners': Image,
  'retail-promotions': BadgePercent,
  'dealer-schemes': Handshake,
  'store-agreements': FileSignature,
  'trade-events': CalendarCheck,
  agencies: Building2,
  'production-houses': Clapperboard,
  'printing-vendors': Printer,
  'event-organizers': CalendarCheck,
  'vendor-performance': Gauge,
  'videos-photos': Images,
  catalogues: BookOpen,
  'digital-creatives': MonitorSmartphone,
  'promotional-materials': Gift,
  'campaign-leads': Users,
  'lead-tracking': Route,
  'follow-ups': CalendarClock,
  'sales-handovers': Handshake,
  attribution: PieChart,
  'sales-opportunities': Target,
  'campaign-to-sales': TrendingUp,
  'roi-analysis': LineChart,
  'campaign-expenses': Receipt,
  'vendor-invoices': FileText,
  'celebrity-payments': Star,
  'field-expense-claims': MapPin,
  'budget-vs-actual': Scale,
  'finance-integration': Landmark,
  'pending-approvals': Clock3,
  'approval-inbox': ClipboardList,
  'campaign-approvals': Megaphone,
  'budget-approvals': Wallet,
  'offer-approvals': BadgePercent,
  'contract-management': FileSignature,
  'usage-rights': ShieldCheck,
  renewals: CalendarClock,
  'role-performance': Gauge,
  'campaign-performance': BarChart3,
  'channel-performance': PieChart,
  'product-brand': Package,
  'retailer-performance': Store,
  'roi-profitability': TrendingUp,
  'export-reports': Download,
  'campaign-suggestions': Lightbulb,
  'budget-optimization': PiggyBank,
  'content-ideas': PenTool,
  'performance-insights': Activity,
  'competitor-comparison': Trophy,
}

const moduleDefinitions: MarketingModule[] = [
  {
    id: 'dashboard',
    label: 'Marketing Dashboard',
    path: '/marketing/dashboard',
    description:
      'A consolidated view of campaign performance, pipeline, spend and the marketing workflow.',
    icon: LayoutDashboard,
    tabs: [],
  },
  {
    id: 'plans',
    label: 'Plans & Budgets',
    path: '/marketing/plans',
    description:
      'Build monthly marketing plans, allocate campaign budgets and track utilisation.',
    icon: Wallet,
    tabs: [
      { id: 'monthly-plans', label: 'Monthly Plans' },
      { id: 'campaign-budgets', label: 'Campaign Budgets' },
      { id: 'budget-tracking', label: 'Budget Tracking' },
      { id: 'forecast-vs-actual', label: 'Forecast vs Actual' },
    ],
  },
  {
    id: 'digital',
    label: 'Digital Marketing',
    path: '/marketing/digital',
    description:
      'Plan, run and review digital campaigns across paid, social, email, search and creator channels.',
    icon: Megaphone,
    tabs: [
      { id: 'campaigns', label: 'Campaigns' },
      { id: 'social-media', label: 'Social Media' },
      { id: 'email-marketing', label: 'Email Marketing' },
      { id: 'website-seo', label: 'Website & SEO' },
    ],
  },
  {
    id: 'field',
    label: 'Field Marketing',
    path: '/marketing/field',
    description:
      'Coordinate field teams, visits, demos and market research across every region.',
    icon: MapPinned,
    tabs: [
      { id: 'field-teams', label: 'Field Teams' },
      { id: 'field-visits', label: 'Field Visits' },
      { id: 'store-visits', label: 'Store Visits & Demos' },
      { id: 'event-activities', label: 'Event Activities' },
      { id: 'market-research', label: 'Market Research' },
      { id: 'expense-claims', label: 'Expense Claims' },
      { id: 'visit-reports', label: 'Visit Reports' },
    ],
  },
  {
    id: 'trade',
    label: 'Trade & Retail Marketing',
    path: '/marketing/trade',
    description:
      'Activate stores and dealers with collateral, promotions, schemes and trade events.',
    icon: Store,
    tabs: [
      { id: 'store-activities', label: 'Store Activities' },
      { id: 'posters-banners', label: 'Posters & Banners' },
      { id: 'retail-promotions', label: 'Retail Promotions' },
      { id: 'dealer-schemes', label: 'Dealer Schemes' },
      { id: 'store-agreements', label: 'Store Agreements' },
      { id: 'trade-events', label: 'Trade Events' },
    ],
  },
  {
    id: 'agencies',
    label: 'Agencies & Partners',
    path: '/marketing/agencies',
    description:
      'Manage creative, media, production, print and event partners with performance visibility.',
    icon: Handshake,
    hidden: true,
    tabs: [
      { id: 'agencies', label: 'Agencies' },
      { id: 'influencers', label: 'Influencers' },
      { id: 'production-houses', label: 'Production Houses' },
      { id: 'printing-vendors', label: 'Printing Vendors' },
      { id: 'event-organizers', label: 'Event Organizers' },
      { id: 'vendor-performance', label: 'Vendor Performance' },
    ],
  },
  {
    id: 'assets',
    label: 'Marketing Assets',
    path: '/marketing/assets',
    description:
      'A searchable library of approved creative, collateral, video and digital assets.',
    icon: FolderKanban,
    hidden: true,
    tabs: [
      { id: 'posters-banners', label: 'Posters & Banners' },
      { id: 'videos-photos', label: 'Videos & Photos' },
      { id: 'catalogues', label: 'Catalogues & Brochures' },
      { id: 'digital-creatives', label: 'Digital Creatives' },
      { id: 'promotional-materials', label: 'Promotional Materials' },
    ],
  },
  {
    id: 'leads',
    label: 'Leads & Attribution',
    path: '/marketing/leads',
    description:
      'Capture, qualify and convert leads while connecting every outcome back to campaign spend.',
    icon: Target,
    tabs: [
      { id: 'overview', label: 'Dashboard' },
      { id: 'campaign-leads', label: 'Campaign Leads' },
      { id: 'lead-tracking', label: 'Pipeline Board' },
      { id: 'follow-ups', label: 'Follow-ups' },
      { id: 'sales-handovers', label: 'Sales Handovers' },
      { id: 'attribution', label: 'Attribution' },
      { id: 'sales-opportunities', label: 'Sales Opportunities' },
      { id: 'campaign-to-sales', label: 'Campaign-to-Sales' },
      { id: 'roi-analysis', label: 'ROI Analysis' },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses & Payments',
    path: '/marketing/expenses',
    description:
      'Record campaign expenses, track invoices and reconcile spend against approved budgets.',
    icon: ReceiptText,
    tabs: [
      { id: 'monthly-expenses', label: 'Monthly Expenses' },
      { id: 'campaign-expenses', label: 'Campaign Expenses' },
      { id: 'field-expense-claims', label: 'Field Expense Claims' },
      { id: 'budget-vs-actual', label: 'Budget vs Actual' },
      { id: 'finance-integration', label: 'Finance Integration' },
    ],
  },
  {
    id: 'approvals',
    label: 'Approvals & Contracts',
    path: '/marketing/approvals',
    description:
      'Route campaign, budget, offer and creative requests through review with a clear audit trail.',
    icon: BadgeCheck,
    tabs: [
      { id: 'approval-inbox', label: 'Approval Inbox' },
      { id: 'pending-approvals', label: 'Pending Approvals' },
      { id: 'campaign-approvals', label: 'Campaign Approvals' },
      { id: 'budget-approvals', label: 'Budget Approvals' },
      { id: 'offer-approvals', label: 'Offer Approvals' },
      { id: 'contract-management', label: 'Contract Management' },
      { id: 'usage-rights', label: 'Usage Rights' },
      { id: 'renewals', label: 'Renewal & Expiry Alerts' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    path: '/marketing/reports',
    description:
      'Interrogate sample marketing data, compare channels and export board-ready reports.',
    icon: BarChart3,
    tabs: [
      { id: 'role-performance', label: 'My Performance' },
      { id: 'campaign-performance', label: 'Campaign Performance' },
      { id: 'channel-performance', label: 'Channel Performance' },
      { id: 'product-brand', label: 'Product & Brand Analysis' },
      { id: 'retailer-performance', label: 'Retailer Performance' },
      { id: 'roi-profitability', label: 'ROI & Profitability' },
      { id: 'export-reports', label: 'Export Reports' },
    ],
  },
  {
    id: 'assistant',
    label: 'AI Marketing Assistant',
    path: '/marketing/assistant',
    description:
      'Explore local, template-driven marketing suggestions based on the workspace demo data.',
    icon: Bot,
    tabs: [
      { id: 'campaign-suggestions', label: 'Campaign Suggestions' },
      { id: 'budget-optimization', label: 'Budget Optimization' },
      { id: 'content-ideas', label: 'Content Ideas' },
      { id: 'performance-insights', label: 'Performance Insights' },
      { id: 'competitor-comparison', label: 'Competitor Comparison' },
    ],
  },
]

export const marketingModules: MarketingModule[] = moduleDefinitions.map((mod) => ({
  ...mod,
  tabs: mod.tabs.map((tab) => ({
    ...tab,
    icon: tab.icon ?? tabIcons[tab.id] ?? Circle,
  })),
}))

export const moduleMap = new Map(marketingModules.map((mod) => [mod.id, mod]))

/** Employee-facing modules. Hidden modules stay routable for direct links and future roles. */
export const visibleMarketingModules = marketingModules.filter((mod) => !mod.hidden)

export function getVisibleModules(): MarketingModule[] {
  return visibleMarketingModules
}

export function getModule(id: string | undefined): MarketingModule | undefined {
  if (!id) return undefined
  return moduleMap.get(id as ModuleId)
}

export function getDefaultTab(mod: MarketingModule): string {
  return mod.tabs[0]?.id ?? ''
}

export function getFirstVisibleModule(): MarketingModule {
  return visibleMarketingModules[0] ?? marketingModules[0]
}

export function getFirstVisibleModulePath(): string {
  const mod = getFirstVisibleModule()
  if (!mod) return '/'
  const tab = getDefaultTab(mod)
  return tab ? `${mod.path}/${tab}` : mod.path
}

export function moduleHref(id: ModuleId, tab?: string): string {
  const mod = moduleMap.get(id)
  if (!mod) return getFirstVisibleModulePath()
  if (!tab) return mod.path
  return `${mod.path}/${tab}`
}
