/* Client-side CSV import and export. No server involved. */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): { ok: boolean; message: string } {
  try {
    if (!columns.length) throw new Error('No columns supplied for export.')
    if (!rows.length) throw new Error('There are no rows to export.')
    const header = columns.map((c) => escapeCell(c.header)).join(',')
    const body = rows
      .map((row) => columns.map((col) => escapeCell(col.value(row))).join(','))
      .join('\r\n')
    const csv = `\uFEFF${header}\r\n${body}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return { ok: true, message: `Exported ${rows.length} rows to ${anchor.download}.` }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'The CSV file could not be generated.',
    }
  }
}

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

export interface CsvParseResult extends ParsedCsv {
  delimiter: string
  errors: string[]
}

function detectDelimiter(firstRecord: string): string {
  const candidates = [',', '\t', ';']
  let best = ','
  let bestScore = -1
  candidates.forEach((candidate) => {
    let score = 0
    let quoted = false
    for (let index = 0; index < firstRecord.length; index += 1) {
      const char = firstRecord[index]
      if (char === '"') {
        if (quoted && firstRecord[index + 1] === '"') {
          index += 1
        } else {
          quoted = !quoted
        }
      } else if (!quoted && char === candidate) {
        score += 1
      }
    }
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  })
  return best
}

function splitCsvRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let cell = ''
  let quoted = false

  const pushCell = () => {
    record.push(cell)
    cell = ''
  }

  const pushRecord = () => {
    pushCell()
    records.push(record)
    record = []
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      pushCell()
    } else if (char === '\n') {
      pushRecord()
    } else if (char === '\r') {
      if (text[index + 1] !== '\n') pushRecord()
    } else {
      cell += char
    }
  }

  if (cell.length > 0 || record.length > 0) pushRecord()
  return records
}

function uniqueHeaders(rawHeaders: string[]): string[] {
  const seen = new Map<string, number>()
  return rawHeaders.map((header, index) => {
    const clean = header.replace(/^\uFEFF/, '').trim() || `Column ${index + 1}`
    const count = seen.get(clean) ?? 0
    seen.set(clean, count + 1)
    return count === 0 ? clean : `${clean} (${count + 1})`
  })
}

/**
 * Parse CSV text entirely in the browser. Handles quoted commas, escaped quotes,
 * embedded line breaks, a UTF-8 BOM and comma/tab/semicolon delimiters.
 */
export function parseCsv(text: string): CsvParseResult {
  const errors: string[] = []
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  if (!cleaned.trim()) {
    return { headers: [], rows: [], delimiter: ',', errors: ['The selected file is empty.'] }
  }

  const firstLine = cleaned.split('\n', 1)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const records = splitCsvRecords(cleaned, delimiter).filter((record) =>
    record.some((cell) => cell.trim().length > 0),
  )

  if (records.length === 0) {
    return { headers: [], rows: [], delimiter, errors: ['No CSV rows were found.'] }
  }

  const headers = uniqueHeaders(records[0] ?? [])
  if (headers.every((header) => /^Column \d+$/.test(header))) {
    errors.push('The header row is missing. Add column names such as Name, Company, Phone and Email.')
  }

  const rows = records.slice(1).map((record) => {
    const values = [...record]
    while (values.length < headers.length) values.push('')
    return values.slice(0, headers.length)
  })

  if (rows.length === 0) errors.push('The CSV contains headers but no data rows.')
  return { headers, rows, delimiter, errors }
}
