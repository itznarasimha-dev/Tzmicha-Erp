import pino from 'pino'

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info')
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Intentionally independent from the full config loader so that importing the
 * logger never fails because of missing database credentials (unit tests, CLI
 * helpers). Runtime configuration is validated by `loadConfig` at boot.
 */
export const logger = pino({
  level,
  base: { service: 'totally-erp-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
      }),
})
