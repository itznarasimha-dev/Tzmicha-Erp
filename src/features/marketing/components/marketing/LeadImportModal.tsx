import { useId, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FileUp,
  UploadCloud,
} from 'lucide-react'
import type { Campaign, Lead } from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Field } from '../ui/Form'
import { Modal } from '../ui/Modal'
import { downloadCsv, parseCsv, type ParsedCsv } from '../../utils/csv'
import {
  LEAD_IMPORT_FIELDS,
  autoMapLeadColumns,
  emptyLeadImportMapping,
  evaluateLeadImport,
  type LeadImportFieldKey,
  type LeadImportMapping,
  type LeadImportRowState,
} from '../../utils/leadImport'
import { formatNumber } from '../../utils/format'

interface LeadImportModalProps {
  open: boolean
  onClose: () => void
  leads: Lead[]
  campaigns: Campaign[]
  onImport: (leads: Lead[]) => void
}

type ImportStep = 'upload' | 'map' | 'review' | 'done'

interface ImportSummary {
  fileName: string
  imported: number
  skipped: number
  invalid: number
}

const stateBadge: Record<LeadImportRowState, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  valid: { label: 'Ready', tone: 'success' },
  duplicate: { label: 'Duplicate', tone: 'warning' },
  invalid: { label: 'Invalid', tone: 'danger' },
}

const templateRow: Record<LeadImportFieldKey, string> = {
  name: 'Asha Verma',
  company: 'Verma Home Studio',
  phone: '+91 98765 43210',
  email: 'asha@vermahome.demo',
  location: 'Jaipur, Rajasthan',
  industry: 'Interior Design',
  source: 'Website Enquiry',
  sourceCategory: 'Website',
  sourceDetail: 'Festive landing page',
  marketingActivity: 'SmartHome festive campaign',
  campaign: '',
  product: 'SmartHome Hub',
  assignedTo: 'Ananya Rao',
  status: 'New',
  priority: 'Medium',
  nextFollowUp: '',
  notes: 'Sample row for the campaign lead import template.',
}

export function LeadImportModal({
  open,
  onClose,
  leads,
  campaigns,
  onImport,
}: LeadImportModalProps) {
  const inputId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<ImportStep>('upload')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<LeadImportMapping>(emptyLeadImportMapping)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const evaluation = useMemo(
    () =>
      parsed
        ? evaluateLeadImport({
            headers: parsed.headers,
            rows: parsed.rows,
            mapping,
            existingLeads: leads,
            campaigns,
          })
        : null,
    [campaigns, leads, mapping, parsed],
  )

  const missingRequired = LEAD_IMPORT_FIELDS.filter(
    (field) => field.required && !mapping[field.key],
  )
  const mappedHeaders = new Set(
    LEAD_IMPORT_FIELDS.map((field) => mapping[field.key]).filter(Boolean),
  )
  const duplicateMappedHeader = mappedHeaders.size !==
    LEAD_IMPORT_FIELDS.filter((field) => mapping[field.key]).length

  const resetFile = () => {
    setFileName('')
    setParsed(null)
    setMapping(emptyLeadImportMapping())
    setFileError('')
    setSummary(null)
    setStep('upload')
    if (fileInput.current) fileInput.current.value = ''
  }

  const loadFile = async (file: File | undefined) => {
    setFileError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv')) {
      setFileError('Choose a .csv file. Other file types are not supported.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError('The CSV is larger than 2 MB. Split it into smaller files and try again.')
      return
    }

    try {
      const result = parseCsv(await file.text())
      if (result.errors.length || result.headers.length === 0 || result.rows.length === 0) {
        setFileError(result.errors.join(' ') || 'No usable CSV rows were found.')
        return
      }
      setFileName(file.name)
      setParsed({ headers: result.headers, rows: result.rows })
      setMapping(autoMapLeadColumns(result.headers))
      setStep('map')
    } catch {
      setFileError('The file could not be read. Check that it is a valid UTF-8 CSV file.')
    }
  }

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    void loadFile(event.target.files?.[0])
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    void loadFile(event.dataTransfer.files?.[0])
  }

  const updateMapping = (key: LeadImportFieldKey, header: string) => {
    setMapping((current) => ({ ...current, [key]: header }))
  }

  const downloadTemplate = () => {
    const result = downloadCsv(
      'campaign-lead-import-template',
      LEAD_IMPORT_FIELDS.map((field) => ({
        header: field.label,
        value: (row: Record<LeadImportFieldKey, string>) => row[field.key],
      })),
      [templateRow],
    )
    if (!result.ok) setFileError(result.message)
  }

  const close = () => {
    onClose()
  }

  const confirmImport = () => {
    if (!evaluation || !parsed) return
    const incoming = evaluation.validRows
      .map((row) => row.lead)
      .filter((lead): lead is Lead => Boolean(lead))
    if (!incoming.length) return
    onImport(incoming)
    setSummary({
      fileName,
      imported: incoming.length,
      skipped: evaluation.duplicateRows.length,
      invalid: evaluation.invalidRows.length,
    })
    setStep('done')
  }

  const footer = (() => {
    if (step === 'upload') {
      return (
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="primary" icon={<FileUp size={14} />} onClick={() => fileInput.current?.click()}>
            Choose CSV
          </Button>
        </>
      )
    }
    if (step === 'map') {
      return (
        <>
          <Button variant="ghost" icon={<ArrowLeft size={14} />} onClick={resetFile}>
            Back
          </Button>
          <Button
            variant="primary"
            icon={<ArrowRight size={14} />}
            onClick={() => setStep('review')}
            disabled={missingRequired.length > 0 || duplicateMappedHeader || !evaluation}
          >
            Review import
          </Button>
        </>
      )
    }
    if (step === 'review') {
      return (
        <>
          <Button variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => setStep('map')}>
            Back to mapping
          </Button>
          <Button
            variant="primary"
            icon={<CheckCircle2 size={15} />}
            onClick={confirmImport}
            disabled={!evaluation?.validRows.length}
          >
            Confirm import {evaluation?.validRows.length ? `${evaluation.validRows.length} leads` : ''}
          </Button>
        </>
      )
    }
    return (
      <>
        <Button variant="ghost" onClick={resetFile}>Import another file</Button>
        <Button variant="primary" onClick={close}>Done</Button>
      </>
    )
  })()

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import campaign leads"
      description="Upload a CSV, map your columns and review every row before adding records. Files are processed in this browser only."
      size="xl"
      closeOnOverlay={false}
      footer={footer}
    >
      <div className="lead-import">
        <ol className="lead-import__steps" aria-label="Import progress">
          {[
            ['upload', 'Choose file'],
            ['map', 'Map columns'],
            ['review', 'Review'],
            ['done', 'Summary'],
          ].map(([id, label], index) => {
            const order = ['upload', 'map', 'review', 'done']
            const currentIndex = order.indexOf(step)
            const state = index < currentIndex ? 'is-complete' : index === currentIndex ? 'is-current' : ''
            return (
              <li key={id} className={state}>
                <span>{index + 1}</span>
                {label}
              </li>
            )
          })}
        </ol>

        {fileError ? (
          <div className="callout callout--warning" role="alert">
            <CircleAlert size={15} />
            <span>{fileError}</span>
          </div>
        ) : null}

        {step === 'upload' ? (
          <div className="stack-16">
            <label
              htmlFor={inputId}
              className={`lead-import__drop ${dragging ? 'is-dragging' : ''}`.trim()}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInput}
                id={inputId}
                type="file"
                accept=".csv,text/csv"
                onChange={onFileInput}
                className="sr-only"
              />
              <span className="lead-import__drop-icon">
                <UploadCloud size={26} />
              </span>
              <span className="lead-import__drop-title">Drop a CSV here or choose a file</span>
              <span className="lead-import__drop-copy">
                Up to 2 MB. UTF-8, comma-separated files with a header row work best.
              </span>
              <span className="btn btn--soft btn--sm">Browse files</span>
            </label>

            <div className="lead-import__upload-grid">
              <div className="lead-import__note">
                <FileSpreadsheet size={17} />
                <div>
                  <p>Required columns</p>
                  <span>Lead name, company, phone and email. Other columns are mapped automatically where possible.</span>
                </div>
              </div>
              <div className="lead-import__note">
                <CheckCircle2 size={17} />
                <div>
                  <p>Duplicate protection</p>
                  <span>Rows matching an existing email or phone, or another row in the file, are skipped.</span>
                </div>
              </div>
            </div>

            <div className="between wrap">
              <p className="text-xs muted">
                No upload, API or shared database is used. Imported records live in this browser's demo data.
              </p>
              <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={downloadTemplate}>
                Download template
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'map' && parsed ? (
          <div className="stack-16">
            <div className="lead-import__file">
              <span className="lead-import__file-icon"><FileSpreadsheet size={18} /></span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="lead-import__file-name">{fileName}</span>
                <span className="text-xs muted">
                  {formatNumber(parsed.rows.length)} data rows · {parsed.headers.length} columns
                </span>
              </span>
              <Button variant="ghost" size="xs" onClick={resetFile}>Replace file</Button>
            </div>

            {missingRequired.length ? (
              <div className="callout callout--warning" role="status">
                <CircleAlert size={15} />
                <span>
                  Map these required fields before continuing: {missingRequired.map((field) => field.label).join(', ')}.
                </span>
              </div>
            ) : null}
            {duplicateMappedHeader ? (
              <div className="callout callout--warning" role="status">
                <CircleAlert size={15} />
                <span>Each CSV column can only be mapped to one lead field.</span>
              </div>
            ) : null}

            <div className="form-grid lead-import__mapping">
              {LEAD_IMPORT_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  htmlFor={`lead-import-${field.key}`}
                  required={field.required}
                  hint={mapping[field.key] ? `Using “${mapping[field.key]}”` : 'Not mapped'}
                >
                  <select
                    id={`lead-import-${field.key}`}
                    className="select"
                    value={mapping[field.key]}
                    onChange={(event) => updateMapping(field.key, event.target.value)}
                  >
                    <option value="">Do not import</option>
                    {parsed.headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>

            {evaluation ? (
              <>
                <div className="lead-import__summary">
                  <span><strong>{formatNumber(evaluation.validRows.length)}</strong> ready</span>
                  <span><strong>{formatNumber(evaluation.duplicateRows.length)}</strong> duplicates</span>
                  <span><strong>{formatNumber(evaluation.invalidRows.length)}</strong> invalid</span>
                </div>
                <PreviewTable rows={evaluation.rows.slice(0, 5)} />
                <p className="text-xs muted">
                  Preview shows the first five rows. Continue to review every row and confirm before importing.
                </p>
              </>
            ) : null}
          </div>
        ) : null}

        {step === 'review' && evaluation ? (
          <div className="stack-16">
            <div className="lead-import__summary lead-import__summary--review">
              <span className="is-ready"><strong>{formatNumber(evaluation.validRows.length)}</strong> ready to import</span>
              <span><strong>{formatNumber(evaluation.duplicateRows.length)}</strong> duplicates skipped</span>
              <span className={evaluation.invalidRows.length ? 'is-invalid' : ''}>
                <strong>{formatNumber(evaluation.invalidRows.length)}</strong> invalid rows
              </span>
            </div>

            {evaluation.duplicateRows.length ? (
              <div className="callout callout--info">
                <CircleAlert size={15} />
                <span>
                  Duplicate rows are skipped using normalised email and phone values against the existing
                  {' '}{formatNumber(leads.length)} lead records and earlier rows in this file.
                </span>
              </div>
            ) : null}
            {evaluation.invalidRows.length ? (
              <div className="callout callout--warning">
                <CircleAlert size={15} />
                <span>Invalid rows are listed below. Fix them in the CSV and import again, or continue with valid rows.</span>
              </div>
            ) : null}

            <ReviewTable
              rows={evaluation.rows}
            />

            <p className="text-xs muted">
              No records have been added yet. Choose “Confirm import” to write the valid rows into the
              local demo lead table. You can close this dialog without changing anything.
            </p>
          </div>
        ) : null}

        {step === 'done' && summary ? (
          <div className="lead-import__done">
            <span className="lead-import__done-icon"><CheckCircle2 size={30} /></span>
            <h3>Import complete</h3>
            <p>
              {formatNumber(summary.imported)} lead{summary.imported === 1 ? '' : 's'} from {summary.fileName}
              {' '}were added to the campaign lead table immediately.
            </p>
            <div className="lead-import__summary lead-import__summary--review">
              <span className="is-ready"><strong>{formatNumber(summary.imported)}</strong> imported</span>
              <span><strong>{formatNumber(summary.skipped)}</strong> skipped duplicates</span>
              <span className={summary.invalid ? 'is-invalid' : ''}><strong>{formatNumber(summary.invalid)}</strong> invalid</span>
            </div>
            <div className="callout callout--info">
              <CircleAlert size={15} />
              <span>
                Records were saved through the existing browser demo-data store. No server, CRM or
                shared database was contacted.
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function PreviewTable({ rows }: { rows: ReturnType<typeof evaluateLeadImport>['rows'] }) {
  return (
    <div className="table-wrap lead-import__table-wrap">
      <table className="table table--compact">
        <caption className="sr-only">CSV import preview</caption>
        <thead>
          <tr>
            <th>Row</th>
            <th>Lead</th>
            <th>Contact</th>
            <th>Source</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.line}>
              <td>{row.line}</td>
              <td>
                <span className="cell-primary">{row.values.name || '—'}</span>
                <span className="text-xs muted">{row.values.company || 'Company missing'}</span>
              </td>
              <td>
                <span className="text-xs">{row.values.phone || '—'}</span>
                <span className="text-xs muted">{row.values.email || '—'}</span>
              </td>
              <td className="text-xs">{row.values.source || 'Other'}</td>
              <td>
                <Badge tone={stateBadge[row.state].tone}>{stateBadge[row.state].label}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReviewTable({ rows }: { rows: ReturnType<typeof evaluateLeadImport>['rows'] }) {
  return (
    <div className="table-wrap lead-import__table-wrap">
      <table className="table table--compact">
        <caption className="sr-only">Campaign lead import review</caption>
        <thead>
          <tr>
            <th>Row</th>
            <th>Lead</th>
            <th>Email / phone</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.line} className={row.state === 'invalid' ? 'is-invalid-row' : ''}>
              <td>{row.line}</td>
              <td>
                <span className="cell-primary">{row.values.name || '—'}</span>
                <span className="text-xs muted">{row.values.company || 'Company missing'}</span>
              </td>
              <td>
                <span className="text-xs">{row.values.email || '—'}</span>
                <span className="text-xs muted">{row.values.phone || '—'}</span>
              </td>
              <td>
                <Badge tone={stateBadge[row.state].tone}>{stateBadge[row.state].label}</Badge>
                {row.state === 'duplicate' && row.duplicateOf ? (
                  <span className="lead-import__row-note">Matches {row.duplicateOf}</span>
                ) : null}
                {row.errors.length ? (
                  <span className="lead-import__row-note lead-import__row-note--error">
                    {row.errors.join(' ')}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
