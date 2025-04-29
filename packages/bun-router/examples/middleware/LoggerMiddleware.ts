import type { EnhancedRequest, NextFunction } from '../../src/types'

/**
 * Logger middleware example that logs request information
 */
export class LoggerMiddleware {
  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    const start = performance.now()
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)

    // Call the next middleware or route handler
    const response = await next()

    // Log the response time
    const duration = performance.now() - start
    console.log(`[${new Date().toISOString()}] Completed in ${duration.toFixed(2)}ms`)

    return response
  }
}