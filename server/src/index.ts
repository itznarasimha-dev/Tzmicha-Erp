import dns from 'node:dns'
import { createApp } from './app.js'
import { getConfig } from './config.js'
import { assertRlsRoleAvailable, closePool } from './db/pool.js'
import { logger } from './logger.js'

try {
  dns.setDefaultResultOrder('ipv4first')
} catch {}

async function main() {
  const config = getConfig()

  await assertRlsRoleAvailable()

  const app = createApp()
  const server = app.listen(config.PORT, () => {
    logger.info(
      {
        port: config.PORT,
        env: config.NODE_ENV,
        apiPrefix: config.API_PREFIX,
        rls: config.DB_ENFORCE_RLS ? `enforced (${config.DB_RLS_ROLE})` : 'DISABLED',
      },
      'Totally ERP API listening',
    )
  })

  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'Shutting down')
    server.close(async () => {
      await closePool()
      process.exit(0)
    })
    // Hard stop if connections do not drain.
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection')
  })
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception')
    void shutdown('uncaughtException')
  })
}

main().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start API')
  process.exit(1)
})
