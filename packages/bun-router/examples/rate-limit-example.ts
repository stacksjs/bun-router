import { Router } from '../src'
import { rateLimit } from '../src/middleware'
import type { EnhancedRequest } from '../src/types'

// Create a new router
const router = new Router({ verbose: true })

// Basic usage with default settings (100 requests per minute)
router.use(rateLimit().handle.bind(rateLimit()))

// Example with custom settings
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Apply to specific routes or route groups
router.group({ prefix: '/api' }, () => {
  // Apply stricter rate limiting to authentication routes
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    maxRequests: 5, // 5 requests per hour
  })

  router.post('/login', async (req: EnhancedRequest) => {
    // The middleware needs to be registered globally or in a group
    return new Response('Login endpoint')
  })

  router.post('/register', async (req: EnhancedRequest) => {
    return new Response('Register endpoint')
  })

  // Apply general API rate limiting to other routes
  router.get('/users', async (req: EnhancedRequest) => {
    return new Response('Users list')
  })

  router.get('/products', async (req: EnhancedRequest) => {
    return new Response('Products list')
  })

  // Apply middleware to the group
  router.use(authLimiter.handle.bind(authLimiter))
})

// Example with custom response handler
const customHandlerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 50,
  handler: async (req: Request, { limit, remaining, resetTime }: { limit: number, remaining: number, resetTime: number }) => {
    return new Response(
      JSON.stringify({
        error: true,
        message: 'Too many requests, please try again later.',
        limitInfo: {
          limit,
          remaining: Math.floor(remaining / 1000), // Convert to seconds
          resetAt: new Date(resetTime).toISOString(),
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  },
})

// Create a route group with the custom handler limiter
router.group({ middleware: [customHandlerLimiter.handle.bind(customHandlerLimiter)] }, () => {
  router.get('/limited-endpoint', async (req: EnhancedRequest) => {
    return new Response('Limited resource')
  })
})

// Example with skip function to bypass rate limiting for certain requests
const skipBasedLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  skip: (req: Request) => {
    // Skip rate limiting for admin requests with special header
    const adminToken = req.headers.get('X-Admin-Token')
    // In a real app, properly validate this token
    return adminToken === 'super-secret-admin-token'
  },
})

// Create admin route group with skip-based limiter
router.group({ middleware: [skipBasedLimiter.handle.bind(skipBasedLimiter)] }, () => {
  router.get('/admin-dashboard', async (req: EnhancedRequest) => {
    return new Response('Admin dashboard')
  })
})

// Start the server
router.serve({
  port: 3000,
})

console.log('Server running at http://localhost:3000')