import type { AuthContext } from '../middleware/auth.js'

declare global {
  namespace Express {
    interface Request {
      /** Correlation id echoed in error responses and logs. */
      requestId: string
      /** Populated by the `authenticate` middleware. */
      auth?: AuthContext
      /** Populated by `validateQuery`. Express 5 makes req.query read-only. */
      validatedQuery?: unknown
    }
  }
}

export {}
