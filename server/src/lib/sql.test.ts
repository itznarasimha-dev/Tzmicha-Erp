import { describe, expect, it } from 'vitest'
import { buildUpdate, createFilter, offsetIndex } from './sql.js'

describe('buildUpdate', () => {
  it('only emits allowed columns and skips undefined values', () => {
    const fragment = buildUpdate(
      { name: 'Asha', status: undefined, injected: 'x', salary: 100 },
      ['name', 'status', 'salary'],
    )

    expect(fragment.text).toBe('name = $1, salary = $2')
    expect(fragment.values).toEqual(['Asha', 100])
  })

  it('honours a non-default starting placeholder index', () => {
    const fragment = buildUpdate({ name: 'Asha' }, ['name'], 4)
    expect(fragment.text).toBe('name = $4')
    expect(fragment.values).toEqual(['Asha'])
  })

  it('returns an empty fragment when nothing is updatable', () => {
    expect(buildUpdate({ nope: 1 }, ['name'])).toEqual({ text: '', values: [] })
    expect(buildUpdate({ name: undefined }, ['name'])).toEqual({ text: '', values: [] })
  })

  it('keeps null and false as real values', () => {
    const fragment = buildUpdate({ manager_id: null, is_active: false }, ['manager_id', 'is_active'])
    expect(fragment.values).toEqual([null, false])
  })
})

describe('FilterBuilder', () => {
  it('builds an empty filter', () => {
    const filter = createFilter()
    expect(filter.isEmpty).toBe(true)
    expect(filter.where).toBe('')
    expect(filter.and).toBe('')
    expect(filter.params).toEqual([])
  })

  it('numbers placeholders sequentially across clause types', () => {
    const filter = createFilter()
      .equal('e.org_id', 'org-1')
      .gte('e.created_at', '2026-01-01')
      .lte('e.created_at', '2026-12-31')
      .search(['e.name', 'e.email'], '  asha  ')

    expect(filter.where).toBe(
      'where e.org_id = $1 and e.created_at >= $2 and e.created_at <= $3 and ' +
        '(e.name ilike $4 or e.email ilike $4)',
    )
    expect(filter.params).toEqual(['org-1', '2026-01-01', '2026-12-31', '%asha%'])
  })

  it('skips null, undefined and blank range values', () => {
    const filter = createFilter()
      .equal('a', null)
      .equal('b', undefined)
      .gte('c', '')
      .lte('d', null)

    expect(filter.isEmpty).toBe(true)
    expect(filter.params).toEqual([])
  })

  it('supports anyOf with array binding', () => {
    const filter = createFilter().anyOf('l.status', ['New', 'Contacted'])
    expect(filter.where).toBe('where l.status = any($1)')
    expect(filter.params).toEqual([['New', 'Contacted']])

    expect(createFilter().anyOf('l.status', []).isEmpty).toBe(true)
    expect(createFilter().anyOf('l.status', undefined).isEmpty).toBe(true)
  })

  it('ignores blank search terms', () => {
    expect(createFilter().search(['name'], '   ').isEmpty).toBe(true)
    expect(createFilter().search(['name'], undefined).isEmpty).toBe(true)
  })

  it('applies equalIf only when the condition is truthy', () => {
    expect(createFilter().equalIf(false, 'x', 1).isEmpty).toBe(true)
    expect(createFilter().equalIf(true, 'x', 1).where).toBe('where x = $1')
  })

  it('exposes raw predicates and manual params', () => {
    const filter = createFilter().raw('e.deleted_at is null')
    const limit = filter.param(25)
    const offset = filter.param(50)

    expect(filter.where).toBe('where e.deleted_at is null')
    expect(limit).toBe('$1')
    expect(offset).toBe('$2')
    expect(filter.params).toEqual([25, 50])
  })

  it('supports the and fragment for pre-built where strings', () => {
    expect(createFilter().equal('a', 1).equal('b', 2).and).toBe('a = $1 and b = $2')
  })
})

describe('offsetIndex', () => {
  it('returns the next placeholder index', () => {
    expect(offsetIndex([])).toBe(1)
    expect(offsetIndex(['a'])).toBe(2)
    expect(offsetIndex(['a', 'b', 'c'])).toBe(4)
  })
})
