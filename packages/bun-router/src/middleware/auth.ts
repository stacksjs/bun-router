import type { EnhancedRequest, Middleware, NextFunction } from '../types'

export default class AuthMiddleware implements Middleware {
  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Here you would typically validate the token
    // For example purposes, we just check if it starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      return new Response('Invalid token format', { status: 401 })
    }

    // If auth passes, continue to next middleware or route handler
    return next()
  }
}
