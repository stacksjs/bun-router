import { Router } from '../src'
import { rateLimit } from '../src/middleware'
import type { EnhancedRequest } from '../src/types'
import { config } from '../src/config'

/**
 * Example showing how to use rate limiting with configuration
 *
 * This example demonstrates:
 * 1. Global rate limiting based on configuration
 * 2. API-specific rate limits
 * 3. Stricter limits for authentication routes
 * 4. Route-specific custom limits
 */

// Create a new router
const router = new Router()

// Global rate limiter from config (used for all routes by default)
// This is configured in your router.config.ts
const globalRateLimiter = rateLimit()

// API-specific rate limiter (uses global config, but can be customized)
const apiRateLimiter = rateLimit({
  // Use the same config but customize as needed
  windowMs: config.server?.rateLimit?.timeWindow || 60 * 1000,
  maxRequests: config.server?.rateLimit?.max || 100,
})

// Security-focused rate limiter for authentication routes
// This uses the security.rateLimit config which typically has stricter limits
const authRateLimiter = rateLimit({
  windowMs: config.server?.security?.rateLimit?.timeWindow || 5 * 60 * 1000, // 5 minutes default
  maxRequests: config.server?.security?.rateLimit?.max || 20, // 20 attempts default
  skipFailedRequests: false, // Count failed login attempts
})

// Custom rate limiter with specific settings (overrides config)
// Good for high-sensitivity endpoints
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per 15 minutes
  handler: async (req: Request, { limit, remaining, resetTime }: { limit: number, remaining: number, resetTime: number }) => {
    return new Response(JSON.stringify({
      error: true,
      message: 'This endpoint is highly restricted. Please try again later.',
      retryAfter: Math.ceil(remaining / 1000),
      resetAt: new Date(resetTime).toISOString(),
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Apply global rate limiter to all routes
router.use(globalRateLimiter)

// Public routes - using global rate limit
router.get('/', async (_req: EnhancedRequest) => {
  return new Response('Welcome to the homepage')
})

router.get('/about', async (_req: EnhancedRequest) => {
  return new Response('About Us')
})

// API routes - using API-specific rate limiter
router.group({ prefix: '/api' }, () => {
  // Apply API rate limiter to all routes in this group
  router.use(apiRateLimiter)

  router.get('/users', async (_req: EnhancedRequest) => {
    return new Response(JSON.stringify({ users: [{ id: 1, name: 'User 1' }] }), {
      headers: { 'Content-Type': 'application/json' }
    })
  })

  router.get('/products', async (_req: EnhancedRequest) => {
    return new Response(JSON.stringify({ products: [{ id: 1, name: 'Product 1' }] }), {
      headers: { 'Content-Type': 'application/json' }
    })
  })
})

// Auth routes - using security-specific rate limiter
router.group({ prefix: '/auth' }, () => {
  // Apply auth rate limiter to auth routes
  router.use(authRateLimiter)

  router.post('/login', async (_req: EnhancedRequest) => {
    return new Response(JSON.stringify({ success: true, token: 'dummy-token' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  })

  router.post('/register', async (_req: EnhancedRequest) => {
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  })
})

// Admin routes - using custom strict rate limiter
router.group({ prefix: '/admin' }, () => {
  // Apply strict rate limiter to admin routes
  router.use(strictRateLimiter)

  router.get('/dashboard', async (_req: EnhancedRequest) => {
    return new Response('Admin Dashboard')
  })

  router.post('/settings', async (_req: EnhancedRequest) => {
    return new Response('Settings updated')
  })
})

// Start the server
router.serve({
  port: 3000,
})

console.log('Server running at http://localhost:3000')
console.log('Rate limiting is configured based on router.config.ts settings')
console.log('  - Default global limit: ' + (config.server?.rateLimit?.max || 100) + ' requests per ' +
  (config.server?.rateLimit?.timeWindow || 60000)/1000 + ' seconds')
console.log('  - Auth routes limit: ' + (config.server?.security?.rateLimit?.max || 20) + ' requests per ' +
  (config.server?.security?.rateLimit?.timeWindow || 300000)/1000 + ' seconds')
console.log('  - Admin routes: 5 requests per 15 minutes (custom setting)')