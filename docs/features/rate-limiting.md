# Rate Limiting

Bun Router includes built-in rate limiting functionality to protect your routes from abuse and control resource usage. The rate limiter is implemented using the `ts-rate-limiter` library and offers a flexible API for limiting request rates.

## Basic Usage

The simplest way to add rate limiting to your application is to use the `rateLimit` middleware:

```ts
import { Router, rateLimit } from 'bun-router'

const router = new Router()

// Apply rate limiting to all routes (100 requests per minute by default)
router.use(rateLimit())

// Start the server
router.serve({ port: 3000 })
```

You can also directly use the RateLimit class:

```ts
import { Router, RateLimit } from 'bun-router'

const router = new Router()

// Apply rate limiting with custom options
router.use(new RateLimit({
  maxRequests: 50,
  windowMs: 30 * 1000 // 30 seconds
}))

// Start the server
router.serve({ port: 3000 })
```

## Global Configuration

You can configure rate limiting globally in your `router.config.ts` file:

```ts
// router.config.ts
export default {
  server: {
    // Rate limiting configuration
    rateLimit: {
      // Enable/disable rate limiting globally
      enabled: true,

      // Basic settings
      max: 100, // Max requests per timeWindow
      timeWindow: 60000, // Time window in milliseconds (1 minute)

      // Custom message for rate limit exceeded response
      message: 'Rate limit exceeded. Please try again later.',

      // Advanced rate limiting options
      advanced: {
        // Token bucket algorithm settings (alternative to fixed window)
        tokensPerInterval: 100,
        interval: 60000,
        burst: 50,

        // Skip rate limiting for failed requests (status >= 400)
        skipFailedRequests: true,

        // Rate limiting algorithm
        algorithm: 'sliding-window', // 'fixed-window', 'sliding-window', 'token-bucket'
      },

      // Storage options for rate limiting data
      stores: {
        // Storage type: 'memory' (default) or 'redis'
        type: 'redis',

        // Redis configuration (when type is 'redis')
        redis: {
          url: 'redis://localhost:6379',
          prefix: 'ratelimit:',
        },
      },
    },

    // Security-specific rate limit configuration (for auth routes, etc.)
    security: {
      rateLimit: {
        enabled: true,
        max: 50, // Stricter limits for sensitive routes
        timeWindow: 300000, // 5 minutes
        message: 'Too many authentication attempts. Please try again later.',
        advanced: {
          skipFailedRequests: false, // Count failed auth attempts
        }
      }
    }
  }
}
```

When you instantiate the rate limiter without custom options, it will automatically use these configuration values:

```ts
// This will use the settings from router.config.ts
const limiter = rateLimit()
router.use(limiter.handle.bind(limiter))
```

## Configuration Options

The rate limiter accepts several configuration options:

```ts
const limiter = rateLimit({
  // How long to keep records of requests in memory (in milliseconds)
  windowMs: 60 * 1000, // 1 minute (default)

  // Max number of requests during windowMs before sending a 429 response
  maxRequests: 100, // default

  // Return rate limit info in the `RateLimit-*` headers
  standardHeaders: true, // default

  // Return rate limit info in the `X-RateLimit-*` headers
  legacyHeaders: false, // default

  // Skip incrementing the count if the response status code is >= 400
  skipFailedRequests: false, // default

  // Function to generate keys (defaults to IP address)
  keyGenerator: (request) => request.headers.get('x-forwarded-for') || '127.0.0.1',

  // Function to determine whether to skip rate limiting for a request
  skip: (request) => false,

  // Function to generate custom response when rate limit is exceeded
  handler: (request, limitInfo) => new Response('Rate limit exceeded', { status: 429 }),

  // Algorithm for rate limiting
  algorithm: 'fixed-window', // 'fixed-window', 'sliding-window', 'token-bucket'

  // Draft mode (allows requests to pass but adds headers)
  draftMode: false,
})
```

## Multiple Rate Limiters

You can create multiple rate limiters with different settings for different routes or route groups:

```ts
// Global rate limiter
const globalLimiter = rateLimit()

// API-specific rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
})

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 login attempts per hour
})

// Apply global limiter to all routes
router.use(globalLimiter)

// Apply API limiter to API routes
router.group({ prefix: '/api' }, () => {
  router.use(apiLimiter)

  // API routes here...
})

// Apply auth limiter to auth routes
router.group({ prefix: '/auth' }, () => {
  router.use(authLimiter)

  // Auth routes here...
})
```

### Route-Specific Rate Limiting

You can also apply rate limiting directly to specific routes using the middleware parameter:

```ts
// Create specialized rate limiters for different routes
const userLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 50, // 50 requests per 10 minutes
})

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 200, // 200 requests per 5 minutes
})

// Apply rate limiting to specific routes
router.get('/api/users', getUsersHandler, 'api', 'users.list', [userLimiter])
router.post('/api/users', createUserHandler, 'api', 'users.create', [
  jsonBody(),
  validateUserMiddleware(),
  userLimiter
])

// Admin routes with different rate limit
router.get('/api/admin/dashboard', adminDashboardHandler, 'api', 'admin.dashboard', [
  authMiddleware(),
  adminLimiter
])
```

This Laravel-style approach allows you to apply different rate limits to different routes without having to use route groups.

## Custom Rate Limit Responses

You can customize the response sent when a rate limit is exceeded:

```ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 50,
  handler: async (req, { limit, remaining, resetTime }) => {
    return new Response(
      JSON.stringify({
        error: true,
        message: 'Too many requests, please try again later.',
        limitInfo: {
          limit,
          remainingInSeconds: Math.floor(remaining / 1000),
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
```

## Conditional Rate Limiting

You can conditionally skip rate limiting for certain requests:

```ts
const limiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  skip: (req) => {
    // Skip rate limiting for admin requests with special header
    const adminToken = req.headers.get('X-Admin-Token')
    // In a real app, validate this token properly
    return adminToken === 'super-secret-admin-token'
  },
})
```

## Redis Storage for Production

In production environments with multiple server instances, you should use Redis storage to share rate limit data across instances. This can be configured globally in your router.config.ts:

```ts
// router.config.ts
export default {
  server: {
    rateLimit: {
      // Other settings...

      stores: {
        type: 'redis',
        redis: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          prefix: 'ratelimit:',
        },
      },
    }
  }
}
```

## Headers

The rate limiter sets the following headers on responses (when enabled):

**Standard Headers (RFC 6585):**

- `RateLimit-Limit`: Maximum number of requests allowed in the window
- `RateLimit-Remaining`: Remaining requests in the current window
- `RateLimit-Reset`: Time when the rate limit window resets (in seconds since epoch)

**Legacy Headers:**

- `X-RateLimit-Limit`: Maximum number of requests allowed in the window
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Time when the rate limit window resets (in seconds since epoch)
- `Retry-After`: Seconds remaining until requests can be made again

## Algorithms

The underlying `ts-rate-limiter` library supports different rate limiting algorithms:

- **Fixed Window** (default): Simply counts requests in a fixed time window.
- **Sliding Window**: More accurate rate limiting that distributes counts over a sliding window.
- **Token Bucket**: A flexible algorithm allowing for burst traffic while maintaining limits.

You can specify the algorithm in your configuration:

```ts
// router.config.ts
export default {
  server: {
    rateLimit: {
      // Other settings...
      advanced: {
        algorithm: 'sliding-window', // 'fixed-window', 'sliding-window', 'token-bucket'
      }
    }
  }
}
```

## More Examples

### Class-based Usage

You can also use the `RateLimit` class directly:

```ts
import { Router, RateLimit } from 'bun-router'

const router = new Router()

// Apply rate limiting with specific options
// Note: This works but doesn't use the factory function
router.use(new RateLimit({
  maxRequests: 200,
  windowMs: 60 * 1000,
}))
```

### Multiple Rate Limiters with Custom Options

```ts
import { Router, RateLimit } from 'bun-router'

const router = new Router()

// API routes with one rate limit
router.group({ prefix: '/api' }, () => {
  router.use(new RateLimit({
    maxRequests: 100,
    windowMs: 60 * 1000,
  }))
})

// Auth routes with stricter limits
router.group({ prefix: '/auth' }, () => {
  router.use(new RateLimit({
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  }))
})
```
