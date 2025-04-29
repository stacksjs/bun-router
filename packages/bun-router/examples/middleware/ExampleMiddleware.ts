import type { EnhancedRequest, NextFunction } from '../../src/types'

/**
 * Example middleware for testing the middleware:map command
 */
export class ExampleMiddleware {
  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    console.log('Example middleware executed')

    // Continue to the next middleware or route handler
    return next()
  }
}