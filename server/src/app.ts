import crypto from 'node:crypto'
import cors from 'cors'
import express, { type Request } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { getConfig } from './config.js'
import { queryAsOwner } from './db/pool.js'
import { logger } from './logger.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'
import { meRouter } from './routes/me.js'
import { hrRouter } from './routes/hr/index.js'
import { marketingRouter } from './routes/marketing/index.js'
import { approvalsRouter } from './routes/approvals.js'

export function createApp() {
  const config = getConfig()
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  app.use(
    cors({
      origin(origin, callback) {
        // Non-browser clients (curl, server-to-server) send no Origin.
        if (!origin) return callback(null, true)
        if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} is not allowed`))
      },
      credentials: false,
      allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )

  app.use(express.json({ limit: '1mb' }))

  app.use((req, res, next) => {
    const incoming = req.header('x-request-id')
    req.requestId =
      incoming && /^[\w.:-]{8,128}$/.test(incoming) ? incoming : crypto.randomUUID()
    res.setHeader('X-Request-Id', req.requestId)
    next()
  })

  app.use(
    pinoHttp({
      logger,
      genReqId: (req: Request) => req.requestId,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === `${config.API_PREFIX}/health`,
      },
      customLogLevel(_req, res, err) {
        if (err || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },
      serializers: {
        req(req: Request & { id?: string }) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
            requestId: req.requestId,
          }
        },
      },
    }),
  )

  app.use(
    rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      limit: config.RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => req.path === '/health',
    }),
  )

  const health = async (_req: express.Request, res: express.Response) => {
    try {
      await queryAsOwner('select 1 as ok')
      res.json({ status: 'ok', database: 'reachable', time: new Date().toISOString() })
    } catch (error) {
      logger.error({ err: error }, 'Health check failed')
      res.status(503).json({ status: 'degraded', database: 'unreachable' })
    }
  }

  app.get('/health', health)
  app.get(`${config.API_PREFIX}/health`, health)

  app.use(`${config.API_PREFIX}/me`, meRouter)
  app.use(`${config.API_PREFIX}/hr`, hrRouter)
  app.use(`${config.API_PREFIX}/marketing`, marketingRouter)
  app.use(`${config.API_PREFIX}/approvals`, approvalsRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
