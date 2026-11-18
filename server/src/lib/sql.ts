/**
 * Small SQL builders that only ever accept internal, whitelisted identifiers.
 * Values are always parameterised.
 */

export interface SqlFragment {
  text: string
  values: unknown[]
}

export function buildUpdate(
  columns: Record<string, unknown>,
  allowed: readonly string[],
  startIndex = 1,
): SqlFragment {
  const sets: string[] = []
  const values: unknown[] = []
  let index = startIndex

  for (const [key, value] of Object.entries(columns)) {
    if (value === undefined) continue
    if (!allowed.includes(key)) continue
    sets.push(`${key} = $${index}`)
    values.push(value)
    index += 1
  }

  return { text: sets.join(', '), values }
}

/**
 * Incremental WHERE builder. Every `add` call appends exactly one parameter,
 * which keeps placeholder numbering unambiguous.
 *
 *   const f = createFilter()
 *   f.equal('e.org_id', orgId)
 *   f.equalIf(status, 'l.status', status)
 *   f.search(['e.name', 'e.email'], q)
 */
export class FilterBuilder {
  private readonly clauses: string[] = []
  private readonly values: unknown[] = []

  private bind(value: unknown): string {
    this.values.push(value)
    return `$${this.values.length}`
  }

  /** `expr = $n` */
  equal(expr: string, value: unknown): this {
    if (value === undefined || value === null) return this
    this.clauses.push(`${expr} = ${this.bind(value)}`)
    return this
  }

  equalIf(condition: unknown, expr: string, value: unknown): this {
    if (!condition) return this
    return this.equal(expr, value)
  }

  /** `expr = any($n)` for array values. */
  anyOf(expr: string, values: readonly unknown[] | undefined): this {
    if (!values || values.length === 0) return this
    this.clauses.push(`${expr} = any(${this.bind(values)})`)
    return this
  }

  /** `expr >= $n` */
  gte(expr: string, value: unknown): this {
    if (value === undefined || value === null || value === '') return this
    this.clauses.push(`${expr} >= ${this.bind(value)}`)
    return this
  }

  /** `expr <= $n` */
  lte(expr: string, value: unknown): this {
    if (value === undefined || value === null || value === '') return this
    this.clauses.push(`${expr} <= ${this.bind(value)}`)
    return this
  }

  /** Case-insensitive contains across several expressions. */
  search(expressions: readonly string[], term: string | undefined): this {
    const trimmed = term?.trim()
    if (!trimmed) return this
    const placeholder = this.bind(`%${trimmed}%`)
    this.clauses.push(`(${expressions.map((expr) => `${expr} ilike ${placeholder}`).join(' or ')})`)
    return this
  }

  /** Parameterless predicate authored internally. */
  raw(sql: string): this {
    this.clauses.push(sql)
    return this
  }

  /** Append a value and return its placeholder (for LIMIT/OFFSET clauses). */
  param(value: unknown): string {
    return this.bind(value)
  }

  get isEmpty(): boolean {
    return this.clauses.length === 0
  }

  get where(): string {
    return this.clauses.length ? `where ${this.clauses.join(' and ')}` : ''
  }

  get and(): string {
    return this.clauses.join(' and ')
  }

  get params(): unknown[] {
    return this.values
  }
}

export function createFilter(): FilterBuilder {
  return new FilterBuilder()
}

/** Append extra parameters to a fragment and return their starting index. */
export function offsetIndex(values: unknown[]): number {
  return values.length + 1
}
