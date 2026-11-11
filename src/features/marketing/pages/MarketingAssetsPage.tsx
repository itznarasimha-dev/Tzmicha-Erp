import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  Download,
  Eye,
  FileText,
  Film,
  FolderKanban,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoData } from '../context/DemoDataContext'
import { useToast } from '../context/ToastContext'
import type { Asset, AssetCategory } from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SectionCard } from '../components/ui/SectionCard'
import { AvatarWithName } from '../components/ui/Avatar'
import {
  ChartCard,
  ChartTooltip,
  LegendItem,
  PieLegend,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../components/charts/ChartKit'
import {
  DataNote,
  DemoNote,
  DetailRows,
  FilterRow,
  MetricCard,
  MetricGrid,
  TabIntro,
} from '../components/marketing/ModuleKit'
import { campaignName } from '../data/marketing'
import { downloadCsv } from '../utils/csv'
import { dateOnlyFromNow } from '../utils/dates'
import { formatDate, formatNumber, formatPercent, uid } from '../utils/format'

const ASSET_STATUSES: Asset['status'][] = ['Draft', 'Under Review', 'Approved']
const ASSET_CATEGORIES: AssetCategory[] = [
  'Posters & Banners',
  'Videos & Photos',
  'Catalogues & Brochures',
  'Digital Creatives',
  'Promotional Materials',
]
const TONES = ['amber', 'indigo', 'rose', 'violet', 'teal', 'blue', 'slate']

const categoryByTab: Record<string, AssetCategory> = {
  'posters-banners': 'Posters & Banners',
  'videos-photos': 'Videos & Photos',
  catalogues: 'Catalogues & Brochures',
  'digital-creatives': 'Digital Creatives',
  'promotional-materials': 'Promotional Materials',
}

type UploadFormValues = {
  name: string
  category: AssetCategory
  campaignId: string
  owner: string
  version: string
  note: string
  status: Asset['status']
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1000))} KB`
}

function kindOf(file: File): Asset['kind'] {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'document'
}

function toneForCategory(category: AssetCategory): string {
  const index = ASSET_CATEGORIES.indexOf(category)
  return TONES[Math.max(0, index) % TONES.length]
}

function AssetPreviewSurface({ asset, size = 'card' }: { asset: Asset; size?: 'card' | 'row' }) {
  const toneClass = `tone-${asset.tone || 'slate'}`
  if (asset.kind === 'image' && asset.localUrl) {
    return <img src={asset.localUrl} alt={asset.name} />
  }
  if (asset.kind === 'video' && asset.localUrl) {
    return (
      <div className={`asset-preview--video ${toneClass}`} style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
        <span className="asset-preview__play"><Video size={18} /></span>
      </div>
    )
  }
  const Icon = asset.kind === 'video' ? Film : asset.kind === 'document' ? FileText : ImageIcon
  if (size === 'row') {
    return <Icon size={17} />
  }
  return (
    <>
      <span className="asset-preview__pattern" aria-hidden="true" />
      <span className="asset-preview__icon"><Icon size={20} /></span>
    </>
  )
}

export function MarketingAssetsPage({ tab }: { tab: string }) {
  const { data, update, addNotification } = useDemoData()
  const { pushToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const chartAnim = useChartAnimation()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<AssetCategory>('Posters & Banners')
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest')

  const category = categoryByTab[tab] ?? null
  const previewAsset = data.assets.find((asset) => asset.id === previewId) ?? null

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setUploadCategory(category ?? 'Posters & Banners')
      setUploadOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, category])

  const tabAssets = useMemo(() => {
    const base = data.assets.filter((asset) => (category ? asset.category === category : true))
    const q = query.trim().toLowerCase()
    return base
      .filter((asset) => {
        if (statusFilter !== 'All' && asset.status !== statusFilter) return false
        if (!q) return true
        return `${asset.name} ${asset.owner} ${asset.fileName} ${asset.version} ${campaignName(data.campaigns, asset.campaignId)}`.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [data.assets, data.campaigns, category, query, statusFilter, sort])

  const categoryData = ASSET_CATEGORIES.map((name, index) => ({
    name,
    value: data.assets.filter((asset) => asset.category === name).length,
    color: chartColors[index % chartColors.length],
  })).filter((entry) => entry.value > 0)

  const statusData = ASSET_STATUSES.map((status, index) => ({
    name: status,
    value: data.assets.filter((asset) => asset.status === status).length,
    color: chartColors[index % chartColors.length],
  }))

  const uploadAsset = (values: UploadFormValues, file: File | null) => {
    if (!file) return
    const asset: Asset = {
      id: uid('AS'),
      name: values.name.trim(),
      category: values.category,
      campaignId: values.campaignId || null,
      createdAt: dateOnlyFromNow(0),
      owner: values.owner.trim() || 'Ananya Rao',
      version: values.version.trim() || 'v1.0',
      status: values.status,
      kind: kindOf(file),
      fileName: file.name,
      sizeLabel: formatBytes(file.size),
      tone: toneForCategory(values.category),
      localUrl: URL.createObjectURL(file),
      note: values.note.trim(),
    }
    update('assets', (current) => [asset, ...current])
    addNotification({
      title: 'Asset uploaded to demo library',
      body: `${asset.name} (${asset.fileName}) was added locally. The file preview is session-only.`,
      kind: 'system',
      href: '/marketing/assets/overview',
    })
    pushToast({
      title: 'Asset added to this browser session',
      description: `${asset.fileName} is previewable now. The file itself is not stored in localStorage and will need re-uploading after a reload.`,
      tone: 'success',
    })
    setUploadOpen(false)
  }

  const replaceFile = (asset: Asset, file: File) => {
    if (asset.localUrl?.startsWith('blob:')) URL.revokeObjectURL(asset.localUrl)
    const url = URL.createObjectURL(file)
    update('assets', (current) =>
      current.map((item) =>
        item.id === asset.id
          ? { ...item, localUrl: url, fileName: file.name, sizeLabel: formatBytes(file.size), kind: kindOf(file), createdAt: dateOnlyFromToday() }
          : item,
      ),
    )
    pushToast({
      title: 'Local file replaced',
      description: `${file.name} now previews in this session. The previous object URL was released.`,
      tone: 'success',
    })
  }

  const setAssetStatus = (asset: Asset, status: Asset['status']) => {
    update('assets', (current) => current.map((item) => (item.id === asset.id ? { ...item, status } : item)))
    pushToast({
      title: 'Asset status updated',
      description: `${asset.name} marked ${status} in local demo data. No approval workflow was triggered.`,
      tone: 'success',
    })
  }

  const removeAsset = (asset: Asset) => {
    if (asset.localUrl?.startsWith('blob:')) URL.revokeObjectURL(asset.localUrl)
    update('assets', (current) => current.filter((item) => item.id !== asset.id))
    pushToast({
      title: 'Asset removed from demo library',
      description: `${asset.name} was deleted locally. Any session preview URL was released.`,
      tone: 'success',
    })
    setDeleteAsset(null)
    setPreviewId(null)
  }

  const exportAssets = (rows: Asset[], label = 'asset-library') => {
    const result = downloadCsv(`marketing-${label}-demo`, [
      { header: 'ID', value: (asset: Asset) => asset.id },
      { header: 'Name', value: (asset: Asset) => asset.name },
      { header: 'Category', value: (asset: Asset) => asset.category },
      { header: 'Campaign', value: (asset: Asset) => campaignName(data.campaigns, asset.campaignId) },
      { header: 'Owner', value: (asset: Asset) => asset.owner },
      { header: 'Version', value: (asset: Asset) => asset.version },
      { header: 'Status', value: (asset: Asset) => asset.status },
      { header: 'File', value: (asset: Asset) => asset.fileName },
      { header: 'Size', value: (asset: Asset) => asset.sizeLabel },
      { header: 'Created', value: (asset: Asset) => asset.createdAt },
      { header: 'Note', value: (asset: Asset) => asset.note },
    ], rows)
    pushToast({
      title: result.ok ? 'Asset CSV exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  const openUpload = (categoryValue?: AssetCategory) => {
    setUploadCategory(categoryValue ?? category ?? 'Posters & Banners')
    setUploadOpen(true)
  }

  const pendingReview = data.assets.filter((asset) => asset.status === 'Under Review')
  const approved = data.assets.filter((asset) => asset.status === 'Approved')

  const assetCard = (asset: Asset) => (
    <article className="asset-card" key={asset.id}>
      <button
        type="button"
        className={`asset-preview tone-${asset.tone || 'slate'}`}
        onClick={() => setPreviewId(asset.id)}
        aria-label={`Preview ${asset.name}`}
        style={{ width: '100%', border: 0, cursor: 'pointer', padding: 0 }}
      >
        <span className="asset-preview__badge"><StatusBadge status={asset.status} /></span>
        <AssetPreviewSurface asset={asset} />
        <span className="asset-preview__kind">{asset.kind === 'image' ? 'IMAGE' : asset.kind === 'video' ? 'VIDEO' : 'DOC'}</span>
      </button>
      <div className="asset-card__body">
        <p className="asset-card__name">{asset.name}</p>
        <p className="asset-card__meta">{asset.category} · {asset.version} · {asset.sizeLabel}</p>
        <p className="asset-card__meta truncate">{campaignName(data.campaigns, asset.campaignId)}</p>
        <div className="asset-card__foot">
          <span className="text-xs muted truncate" style={{ maxWidth: '58%' }}>{asset.owner}</span>
          <div className="asset-card__actions">
            <Button variant="ghost" size="xs" onClick={() => setPreviewId(asset.id)} icon={<Eye size={13} />}>View</Button>
          </div>
        </div>
      </div>
    </article>
  )

  if (tab === 'overview') {
    return (
      <div className="stack-20">
        <TabIntro
          title="Marketing asset library"
          description="Browse sample creative, video, brochure and promotional collateral. Uploaded files preview only in this browser session."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportAssets(data.assets)}>Export index</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openUpload()}>Upload asset</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Library items" value={data.assets.length} sub={`${data.assets.filter((asset) => asset.category === 'Digital Creatives').length} digital creatives`} icon={<FolderKanban size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Approved" value={approved.length} sub={`${formatPercent(data.assets.length ? (approved.length / data.assets.length) * 100 : null, 0)} of the demo library`} icon={<BadgeCheck size={15} />} tone="var(--chart-2)" progress={data.assets.length ? (approved.length / data.assets.length) * 100 : 0} />
          <MetricCard label="Under review" value={pendingReview.length} sub="Awaiting a local demo review" icon={<Eye size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Session uploads" value={data.assets.filter((asset) => Boolean(asset.localUrl)).length} sub="Preview URLs are not persisted" icon={<Upload size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Library by category" subtitle="Distribution of demo assets" height="md" isEmpty={categoryData.length === 0}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={3} stroke="none" isAnimationActive={chartAnim}>
                {categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} assets`} />} />
            </PieChart>
          </ChartCard>
          <ChartCard
            title="Review pipeline"
            subtitle="Demo asset approval states"
            height="md"
            legend={<>{statusData.map((status) => <LegendItem key={status.name} color={status.color} label={status.name} value={status.value} />)}</>}
          >
            <BarChart data={statusData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} assets`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="value" name="Assets" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <SectionCard title="Recently added" subtitle="Latest demo library entries." actions={<Button variant="ghost" size="xs" onClick={() => exportAssets([...data.assets].slice(0, 6), 'recent-assets')}>Export</Button>}>
            <div className="asset-list">
              {[...data.assets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((asset) => (
                <button type="button" className="asset-row" key={asset.id} onClick={() => setPreviewId(asset.id)} style={{ width: '100%', border: 0, borderBottom: '1px solid var(--divider)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <span className={`asset-thumb tone-${asset.tone || 'slate'}`}><AssetPreviewSurface asset={asset} size="row" /></span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="cell-primary truncate" style={{ display: 'block' }}>{asset.name}</span>
                    <span className="text-xs muted">{asset.category} · {asset.owner}</span>
                  </span>
                  <StatusBadge status={asset.status} />
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Awaiting review" subtitle="Assets that would need brand or legal sign-off in a real workflow." actions={<Button variant="ghost" size="xs" onClick={() => exportAssets(pendingReview, 'pending-review')}>Export</Button>}>
            <div className="stack-12">
              {pendingReview.length === 0 ? <p className="empty-inline">No assets are awaiting review.</p> : pendingReview.map((asset) => (
                <div key={asset.id} className="between" style={{ gap: 10 }}>
                  <button type="button" className="grow" onClick={() => setPreviewId(asset.id)} style={{ border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', minWidth: 0 }}>
                    <p className="text-xs font-semibold truncate">{asset.name}</p>
                    <p className="text-xs muted">{asset.owner} · {asset.version}</p>
                  </button>
                  <Button variant="ghost" size="xs" onClick={() => setAssetStatus(asset, 'Approved')}>Approve demo</Button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <DemoNote>
          No files are stored on a server. Uploaded files live as temporary browser object URLs and are not saved to localStorage; after a reload, only the asset metadata remains. Demo seed assets have no attached file.
        </DemoNote>
        {previewAsset ? (
          <PreviewModal
            asset={previewAsset}
            campaignLabel={campaignName(data.campaigns, previewAsset.campaignId)}
            onClose={() => setPreviewId(null)}
            onStatus={(status) => setAssetStatus(previewAsset, status)}
            onDelete={() => setDeleteAsset(previewAsset)}
            onReplace={(file) => replaceFile(previewAsset, file)}
          />
        ) : null}
        {uploadOpen ? <UploadModal open onClose={() => setUploadOpen(false)} defaultCategory={uploadCategory} onSave={uploadAsset} campaigns={data.campaigns} /> : null}
        <ConfirmDialog
          open={Boolean(deleteAsset)}
          onClose={() => setDeleteAsset(null)}
          onConfirm={() => { if (deleteAsset) removeAsset(deleteAsset) }}
          title="Delete this asset record?"
          description="The metadata will be removed from this browser. If the asset has a session upload, its preview URL will also be released. This cannot be undone."
          confirmLabel="Delete asset"
        />
      </div>
    )
  }

  if (category) {
    return (
      <div className="stack-16">
        <TabIntro
          title={category}
          description={`Browse ${category.toLowerCase()} in the demo library. Search, filter and preview assets, or upload a session-only file.`}
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportAssets(tabAssets, category.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openUpload(category)}>Upload asset</Button>
            </>
          }
        />
        <div className="grid-4">
          <div className="soft-tile"><p className="soft-tile__label">Visible</p><p className="soft-tile__value">{tabAssets.length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Approved</p><p className="soft-tile__value">{tabAssets.filter((asset) => asset.status === 'Approved').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Under review</p><p className="soft-tile__value">{tabAssets.filter((asset) => asset.status === 'Under Review').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Drafts</p><p className="soft-tile__value">{tabAssets.filter((asset) => asset.status === 'Draft').length}</p></div>
        </div>
        <FilterRow count={`${tabAssets.length} ${tabAssets.length === 1 ? 'asset' : 'assets'}`}>
          <div className="input-icon" style={{ maxWidth: 300 }}>
            <Search size={15} aria-hidden="true" />
            <input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets, owners, files…" aria-label="Search assets" />
          </div>
          <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by asset status">
            <option value="All">All statuses</option>
            {ASSET_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select className="select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort assets">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </FilterRow>
        {tabAssets.length === 0 ? (
          <SectionCard>
            <div className="empty-state" style={{ padding: 28 }}>
              <p className="empty-state__title">No assets match these filters</p>
              <p className="empty-state__description">Try a different search or status, or upload a demo asset.</p>
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => openUpload(category)}>Upload asset</Button>
            </div>
          </SectionCard>
        ) : (
          <div className="asset-grid">
            {tabAssets.map(assetCard)}
          </div>
        )}
        <DataNote>Asset metadata is stored locally. Uploaded files are session-only and are not uploaded to any server. Version and approval labels are demo values.</DataNote>

        {previewAsset ? (
          <PreviewModal
            asset={previewAsset}
            campaignLabel={campaignName(data.campaigns, previewAsset.campaignId)}
            onClose={() => setPreviewId(null)}
            onStatus={(status) => setAssetStatus(previewAsset, status)}
            onDelete={() => setDeleteAsset(previewAsset)}
            onReplace={(file) => replaceFile(previewAsset, file)}
          />
        ) : null}
        {uploadOpen ? <UploadModal open onClose={() => setUploadOpen(false)} defaultCategory={uploadCategory} onSave={uploadAsset} campaigns={data.campaigns} /> : null}
        <ConfirmDialog
          open={Boolean(deleteAsset)}
          onClose={() => setDeleteAsset(null)}
          onConfirm={() => { if (deleteAsset) removeAsset(deleteAsset) }}
          title="Delete this asset record?"
          description="The metadata will be removed from this browser. If the asset has a session upload, its preview URL will also be released. This cannot be undone."
          confirmLabel="Delete asset"
        />
      </div>
    )
  }

  return null
}

function dateOnlyFromToday(): string {
  return dateOnlyFromNow(0)
}

function UploadModal({
  open,
  onClose,
  defaultCategory,
  onSave,
  campaigns,
}: {
  open: boolean
  onClose: () => void
  defaultCategory: AssetCategory
  onSave: (values: UploadFormValues, file: File | null) => void
  campaigns: { id: string; name: string }[]
}) {
  const [values, setValues] = useState<UploadFormValues>({
    name: '',
    category: defaultCategory,
    campaignId: '',
    owner: 'Ananya Rao',
    version: 'v1.0',
    note: '',
    status: 'Draft',
  })
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof UploadFormValues>(key: K, value: UploadFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.name.trim()) next.name = 'Asset name is required.'
    if (!file) next.file = 'Choose a file to preview.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values, file)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload a demo asset"
      description="The file is previewed with a temporary browser URL. It is not uploaded to a server or persisted."
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add asset</Button></>}
    >
      <div className="form-grid">
        <Field label="Asset name" htmlFor="asset-name" required error={errors.name} className="form-grid__full">
          <input id="asset-name" className="input" value={values.name} onChange={(event) => set('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Category" htmlFor="asset-category">
          <select id="asset-category" className="select" value={values.category} onChange={(event) => set('category', event.target.value as AssetCategory)}>
            {ASSET_CATEGORIES.map((categoryValue) => <option key={categoryValue}>{categoryValue}</option>)}
          </select>
        </Field>
        <Field label="Campaign" htmlFor="asset-campaign">
          <select id="asset-campaign" className="select" value={values.campaignId} onChange={(event) => set('campaignId', event.target.value)}>
            <option value="">No campaign link</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </Field>
        <Field label="Owner" htmlFor="asset-owner">
          <input id="asset-owner" className="input" value={values.owner} onChange={(event) => set('owner', event.target.value)} />
        </Field>
        <Field label="Version" htmlFor="asset-version">
          <input id="asset-version" className="input" value={values.version} onChange={(event) => set('version', event.target.value)} />
        </Field>
        <Field label="Status" htmlFor="asset-status">
          <select id="asset-status" className="select" value={values.status} onChange={(event) => set('status', event.target.value as Asset['status'])}>
            {ASSET_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="File" htmlFor="asset-file" required error={errors.file} hint="Images, video and documents can be previewed. File size and type stay in your browser.">
          <input
            ref={inputRef}
            id="asset-file"
            className="input"
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.ai,.zip"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null
              setFile(selected)
              setErrors((current) => ({ ...current, file: '' }))
              if (selected && !values.name.trim()) {
                set('name', selected.name.replace(/\.[^.]+$/, ''))
              }
            }}
            aria-invalid={Boolean(errors.file)}
          />
        </Field>
        <Field label="Note" htmlFor="asset-note" className="form-grid__full">
          <textarea id="asset-note" className="textarea" rows={3} value={values.note} onChange={(event) => set('note', event.target.value)} placeholder="Usage notes, review context or restrictions" />
        </Field>
      </div>
      <div className="callout callout--warning mt-12">
        <Upload size={14} />
        <span>Uploads are session-only. The file preview disappears after a page reload because localStorage cannot store browser object URLs. No server upload occurs.</span>
      </div>
    </Modal>
  )
}

function PreviewModal({
  asset,
  campaignLabel,
  onClose,
  onStatus,
  onDelete,
  onReplace,
}: {
  asset: Asset
  campaignLabel: string
  onClose: () => void
  onStatus: (status: Asset['status']) => void
  onDelete: () => void
  onReplace: (file: File) => void
}) {
  const replaceRef = useRef<HTMLInputElement>(null)
  return (
    <Modal
      open
      onClose={onClose}
      title={asset.name}
      description={`${asset.category} · ${asset.version} · ${asset.id}`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="outline-danger" icon={<Trash2 size={14} />} onClick={onDelete}>Delete</Button>
        </>
      }
    >
      <div className="stack-16">
        {asset.localUrl && asset.kind === 'image' ? (
          <img className="preview-media" src={asset.localUrl} alt={asset.name} />
        ) : asset.localUrl && asset.kind === 'video' ? (
          <video className="preview-media" src={asset.localUrl} controls />
        ) : (
          <div className={`preview-placeholder tone-${asset.tone || 'slate'}`}>
            {asset.kind === 'video' ? <Film size={30} /> : asset.kind === 'document' ? <FileText size={30} /> : <ImageIcon size={30} />}
            <strong style={{ color: 'var(--text)' }}>No session preview available</strong>
            <span>
              {asset.localUrl
                ? 'This file type has no inline browser preview.'
                : 'This demo asset has metadata only. Upload or replace a file to preview it in this session.'}
            </span>
          </div>
        )}

        <div className="row-8 wrap">
          <StatusBadge status={asset.status} />
          <Badge tone="neutral">{asset.kind.toUpperCase()}</Badge>
          <Badge tone="neutral">{asset.sizeLabel}</Badge>
          {asset.localUrl ? <Badge tone="warning">Session preview</Badge> : <Badge tone="neutral">Metadata only</Badge>}
        </div>

        <DetailRows
          items={[
            { label: 'Campaign', value: campaignLabel },
            { label: 'Owner', value: <AvatarWithName name={asset.owner} sub="Asset owner" size="sm" /> },
            { label: 'File name', value: asset.fileName },
            { label: 'Created', value: formatDate(asset.createdAt) },
            { label: 'Version', value: asset.version },
            { label: 'Category', value: asset.category },
          ]}
        />

        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Notes</p>
          <p className="text-sm" style={{ lineHeight: 1.6 }}>{asset.note || 'No notes recorded.'}</p>
        </div>

        <div className="between" style={{ gap: 12, flexWrap: 'wrap' }}>
          <Field label="Demo status" htmlFor="asset-preview-status" hint="Local label only. No review or approval workflow is connected.">
            <select id="asset-preview-status" className="select" value={asset.status} onChange={(event) => onStatus(event.target.value as Asset['status'])}>
              {ASSET_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </Field>
          <div>
            <input
              ref={replaceRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.ai,.zip"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onReplace(file)
                event.target.value = ''
              }}
              aria-label="Replace asset file"
            />
            <Button variant="ghost" icon={<Upload size={14} />} onClick={() => replaceRef.current?.click()}>Replace local file</Button>
          </div>
        </div>

        <DataNote>
          Uploaded files are session-only and are intentionally stripped from localStorage. Deleting or replacing an asset releases its temporary object URL. No server or DAM integration exists.
        </DataNote>
      </div>
    </Modal>
  )
}
