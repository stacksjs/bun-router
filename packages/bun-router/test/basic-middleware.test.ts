import { describe, expect, it, beforeEach } from 'bun:test'
import { Router } from '../src/router'
import type { EnhancedRequest, NextFunction } from '../src/types'

// Extend EnhancedRequest for testing
declare module '../src/types' {
  interface EnhancedRequest {
    testOrder?: string[]
  }
}

describe('Bun Router - Middleware Tests', () => {
  let router: Router

  beforeEach(() => {
    router = new Router()
  })

  it('should apply route-specific middleware', async () => {
    // Create a simple middleware
    const loggerMiddleware = async (req: EnhancedRequest, next: NextFunction) => {
      // Add something to the request
      req.requestId = 'test-request-id'
      // Continue to next middleware/route handler
      return await next()
    }

    // Create a route that uses the middleware
    await router.get('/middleware-test', async (req) => {
      return new Response(`Request ID: ${req.requestId}`, {
        status: 200,
      })
    }, 'web')

    // Apply the middleware to all routes
    await router.use(loggerMiddleware)

    // Make a request to the route
    const response = await router.handleRequest(new Request('http://localhost/middleware-test'))

    // Verify the middleware was applied
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Request ID: test-request-id')
  })

  it('should apply middleware in the correct order', async () => {
    // Create middleware functions
    const middleware1 = async (req: EnhancedRequest, next: NextFunction) => {
      req.testOrder = ['middleware1']
      const response = await next()

      // Read the final content
      const text = await response.text()

      // Return a modified response
      return new Response(`${text}, after middleware1`, {
        status: response.status,
        headers: response.headers,
      })
    }

    const middleware2 = async (req: EnhancedRequest, next: NextFunction) => {
      req.testOrder?.push('middleware2')
      const response = await next()

      // Read the final content
      const text = await response.text()

      // Return a modified response
      return new Response(`${text}, after middleware2`, {
        status: response.status,
        headers: response.headers,
      })
    }

    // Register middlewares in order
    await router.use(middleware1)
    await router.use(middleware2)

    // Create a route
    await router.get('/order-test', (req) => {
      req.testOrder?.push('handler')
      return new Response(`Order: ${req.testOrder?.join(' -> ')}`, { status: 200 })
    })

    // Make a request
    const response = await router.handleRequest(new Request('http://localhost/order-test'))

    // Verify middleware execution order
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Order: middleware1 -> middleware2 -> handler, after middleware2, after middleware1')
  })

  it('should allow middleware to short-circuit responses', async () => {
    // Create an auth middleware that blocks some requests
    const authMiddleware = async (req: EnhancedRequest, next: NextFunction) => {
      if (req.url.includes('protected')) {
        return new Response('Unauthorized', { status: 401 })
      }
      return next()
    }

    // Register the middleware
    await router.use(authMiddleware)

    // Register routes
    await router.get('/protected', () => new Response('Secret Data', { status: 200 }))
    await router.get('/public', () => new Response('Public Data', { status: 200 }))

    // Test protected route
    const protectedResponse = await router.handleRequest(new Request('http://localhost/protected'))
    expect(protectedResponse.status).toBe(401)
    expect(await protectedResponse.text()).toBe('Unauthorized')

    // Test public route
    const publicResponse = await router.handleRequest(new Request('http://localhost/public'))
    expect(publicResponse.status).toBe(200)
    expect(await publicResponse.text()).toBe('Public Data')
  })
})
