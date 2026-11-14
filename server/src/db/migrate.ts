import dns from 'node:dns'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

try {
  dns.setDefaultResultOrder('ipv4first')
} catch {}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath })

const { Client } = pg

const rawConnectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!rawConnectionString || rawConnectionString.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Error: DATABASE_URL or DIRECT_URL in server/.env still has placeholder [YOUR-PASSWORD].')
  console.error('👉 Please open server/.env and replace [YOUR-PASSWORD] with your actual Supabase DB password.')
  process.exit(1)
}

const connectionString = rawConnectionString.replace(/([?&])sslmode=[^&]+(&|$)/g, '$1').replace(/[?&]$/, '')

const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations')

async function runMigrations() {
  console.log('🚀 Connecting to Supabase database...')
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('✅ Connected successfully to PostgreSQL database!\n')

    // Create migrations tracker table
    await client.query(`
      create table if not exists public._migrations_tracker (
        id serial primary key,
        filename text not null unique,
        applied_at timestamptz not null default now()
      );
    `)

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const checkRes = await client.query(
        'select 1 from public._migrations_tracker where filename = $1',
        [file],
      )

      if (checkRes.rowCount && checkRes.rowCount > 0) {
        console.log(`⏩ [Skipping] ${file} (already applied)`)
        continue
      }

      console.log(`⏳ [Applying] ${file}...`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
      await client.query(sql)
      await client.query('insert into public._migrations_tracker (filename) values ($1)', [file])
      console.log(`✅ [Applied]  ${file}`)
    }

    console.log('\n🎉 All database migrations applied successfully!')

    // Apply baseline seed if not yet applied
    const seedFile = path.resolve(__dirname, '../../../supabase/seed/initial_erp_seed.sql')
    if (fs.existsSync(seedFile)) {
      const checkSeed = await client.query(
        'select 1 from public._migrations_tracker where filename = $1',
        ['seed/initial_erp_seed.sql'],
      )
      if (!checkSeed.rowCount || checkSeed.rowCount === 0) {
        console.log('\n🌱 [Seeding] Applying initial baseline seed (organizations, roles, departments)...')
        const seedSql = fs.readFileSync(seedFile, 'utf-8')
        await client.query(seedSql)
        await client.query('insert into public._migrations_tracker (filename) values ($1)', ['seed/initial_erp_seed.sql'])
        console.log('✅ [Seeded]  initial_erp_seed.sql completed successfully!')
      } else {
        console.log('\n⏩ [Skipping] Baseline seed already applied.')
      }
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigrations()
