import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function findSourceFiles(dir: string): string[] {
  let results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results = results.concat(findSourceFiles(fullPath))
    } else if (
      entry.isFile() &&
      /\.(jsx?|tsx?)$/.test(entry.name) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.test.js')
    ) {
      results.push(fullPath)
    }
  }
  return results
}

describe('Phase 3 Rule: Zero Mock Data Imports in Production UI Components and Pages', () => {
  it('enforces that no production page, modal, view, or chart imports mock-data or mockData', () => {
    const featureFiles = findSourceFiles(path.resolve(process.cwd(), 'src/features'))
    expect(featureFiles.length).toBeGreaterThan(100)

    const violations: Array<{ file: string; line: number; text: string }> = []

    for (const file of featureFiles) {
      // Exclude Context definitions which handle offline demo fallbacks
      const normalizedPath = file.replace(/\\/g, '/')
      if (normalizedPath.endsWith('/context/SalesContext.jsx')) continue
      if (normalizedPath.endsWith('/context/DemoDataContext.tsx')) continue
      if (normalizedPath.endsWith('/context/DemoRoleContext.tsx')) continue
      if (normalizedPath.endsWith('/features/sales/data/mockData.js')) continue

      const content = fs.readFileSync(file, 'utf8')
      const lines = content.split('\n')

      lines.forEach((lineText, index) => {
        const trimmed = lineText.trim()
        if (
          (trimmed.startsWith('import ') || trimmed.includes('require(')) &&
          (trimmed.includes('mockData') || trimmed.includes('mock-data') || trimmed.includes('faker'))
        ) {
          violations.push({
            file: path.relative(process.cwd(), file),
            line: index + 1,
            text: trimmed,
          })
        }
      })
    }

    if (violations.length > 0) {
      console.error('Found prohibited mock data imports in production UI:', violations)
    }

    expect(violations).toEqual([])
  })
})
