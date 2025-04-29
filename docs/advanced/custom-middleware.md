# Custom Middleware

Middleware is a powerful feature of bun-router that allows you to intercept and modify requests and responses. This guide covers how to create custom middleware for various use cases.

## Middleware Basics

Middleware in bun-router follows a simple pattern:

```typescript
function myMiddleware(req, next) {
  // Do something before handling the request

  // Call the next middleware or route handler
  const response = next(req)

  // Do something with the response

  // Return the (possibly modified) response
  return response
}
```

## Creating Synchronous Middleware

Here's an example of a simple logging middleware:

```typescript
import { Router } from 'bun-router'

const router = new Router()

function loggerMiddleware(req, next) {
  console.log(`${req.method} ${req.url}`)

  // Time the request
  const start = performance.now()

  // Call the next middleware or route handler
  const response = next(req)

  // Calculate time elapsed
  const ms = Math.round(performance.now() - start)
  console.log(`${req.method} ${req.url} completed in ${ms}ms`)

  return response
}

// Apply middleware to all routes
router.use(loggerMiddleware)

// Define routes
router.get('/', (req) => {
  return new Response('Home page')
})
```

## Creating Asynchronous Middleware

For middleware that needs to perform asynchronous operations:

```typescript
import { Router } from 'bun-router'

const router = new Router()

async function authMiddleware(req, next) {
  // Get the authorization header
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Extract token from header
    const token = authHeader.split(' ')[1]

    // Verify token (async operation)
    const user = await verifyToken(token)

    // Attach user to request for downstream handlers
    req.user = user

    // Continue to next middleware or route handler
    return next(req)
  }
  catch (error) {
    return new Response('Invalid token', { status: 403 })
  }
}

// Apply middleware to specific routes
router.get('/profile', authMiddleware, (req) => {
  // Thanks to the middleware, req.user is available
  return Response.json({
    username: req.user.username,
    email: req.user.email
  })
})
```

## Passing Data Between Middleware

You can modify the request object to pass data to downstream middleware or route handlers:

```typescript
// First middleware
function firstMiddleware(req, next) {
  // Attach data to the request
  req.customData = { timestamp: Date.now() }

  return next(req)
}

// Second middleware
function secondMiddleware(req, next) {
  // Access data from previous middleware
  console.log('Request timestamp:', req.customData.timestamp)

  // Add more data
  req.customData.processedBy = 'secondMiddleware'

  return next(req)
}

// Apply middleware
router.use(firstMiddleware)
router.use(secondMiddleware)

// Route handler
router.get('/', (req) => {
  // Access data from middleware
  const { timestamp, processedBy } = req.customData

  return Response.json({ timestamp, processedBy })
})
```

## Conditionally Applying Middleware

You can create middleware that only applies under certain conditions:

```typescript
function conditionalMiddleware(condition) {
  return (req, next) => {
    // Skip middleware if condition is not met
    if (!condition(req)) {
      return next(req)
    }

    // Apply middleware logic
    console.log('Middleware applied')

    return next(req)
  }
}

// Apply middleware only to API routes
router.use(conditionalMiddleware(req => req.url.includes('/api/')))
```

## Response Modification Middleware

Middleware can also modify responses:

```typescript
function responseHeadersMiddleware(req, next) {
  // Get the response from the next middleware or route handler
  const response = next(req)

  // Set custom headers
  response.headers.set('X-Custom-Header', 'Custom Value')
  response.headers.set('X-Powered-By', 'bun-router')

  return response
}

// Apply middleware
router.use(responseHeadersMiddleware)
```

## Error Handling Middleware

Create middleware specifically for handling errors:

```typescript
function errorHandlerMiddleware(req, next) {
  try {
    // Attempt to process the request
    return next(req)
  }
  catch (error) {
    console.error('Request error:', error)

    // Return a formatted error response
    return Response.json({
      error: 'An error occurred',
      message: error.message
    }, { status: 500 })
  }
}

// Apply as the first middleware to catch all errors
router.use(errorHandlerMiddleware)
```

## Middleware That Interacts with External Services

Middleware can interact with databases, caches, or other external services:

```typescript
import { redis } from 'bun'

// Cache middleware
async function cacheMiddleware(req, next) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req)
  }

  // Create a cache key based on the URL
  const cacheKey = `cache:${req.url}`

  // Check if the response is already cached
  const cachedResponse = await redis.get(cacheKey)

  if (cachedResponse) {
    // Parse the cached response
    const { body, status, headers } = JSON.parse(cachedResponse)

    // Recreate the response from cache
    return new Response(body, {
      status,
      headers: new Headers(headers)
    })
  }

  // Not in cache, get the response
  const response = await next(req)

  // Clone the response before consuming it
  const clonedResponse = response.clone()

  // Store in cache (async)
  clonedResponse.text().then((body) => {
    const headersObj = Object.fromEntries(clonedResponse.headers.entries())

    redis.set(
      cacheKey,
      JSON.stringify({
        body,
        status: clonedResponse.status,
        headers: headersObj
      }),
      { ex: 60 } // 60 seconds
    )
  })

  return response
}

// Apply cache middleware
router.use(cacheMiddleware)
```

## Composing Multiple Middleware

You can compose multiple middleware functions into a single middleware:

```typescript
function compose(...middlewares) {
  return (req, next) => {
    // Create a chain of middleware calls
    const chain = middlewares.reduceRight(
      (nextMiddleware, middleware) => {
        return req => middleware(req, nextMiddleware)
      },
      next
    )

    return chain(req)
  }
}

// Use the composed middleware
router.use(compose(
  loggerMiddleware,
  authMiddleware,
  cacheMiddleware
))
```

## Middleware with Configuration Options

Create configurable middleware by using a factory function:

```typescript
function corsMiddleware(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = [],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400, // 24 hours
  } = options

  return (req, next) => {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      const headers = new Headers()

      headers.set('Access-Control-Allow-Origin', origin)
      headers.set('Access-Control-Allow-Methods', methods.join(', '))

      if (allowedHeaders.length) {
        headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))
      }

      if (credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true')
      }

      headers.set('Access-Control-Max-Age', maxAge.toString())

      return new Response(null, { status: 204, headers })
    }

    // Handle actual request
    const response = next(req)

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', origin)

    if (exposedHeaders.length) {
      response.headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '))
    }

    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    return response
  }
}

// Use with different configurations
router.use(corsMiddleware({
  origin: 'https://example.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))
```

## Route-Specific Middleware

Apply middleware to specific routes or groups:

```typescript
// Apply to a single route
router.get('/protected', authMiddleware, (req) => {
  return new Response('Protected content')
})

// Apply to multiple routes in a group
router.group({
  prefix: '/admin',
  middleware: [authMiddleware, adminRoleMiddleware]
}, () => {
  router.get('/dashboard', (req) => {
    return new Response('Admin dashboard')
  })

  router.get('/users', (req) => {
    return new Response('User management')
  })
})
```

## Creating Middleware for Common Tasks

### Request Validation Middleware

```typescript
// Usage with zod
import { z } from 'zod'

function validateRequestMiddleware(schema) {
  return async (req, next) => {
    try {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        // Parse request body
        const body = await req.json()

        // Validate against schema
        const validatedData = schema.parse(body)

        // Attach validated data to request
        req.validatedData = validatedData
      }

      return next(req)
    }
    catch (error) {
      return Response.json({
        error: 'Validation error',
        details: error.errors || error.message
      }, { status: 400 })
    }
  }
}

const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email()
})

router.post('/users', validateRequestMiddleware(userSchema), (req) => {
  // req.validatedData contains validated user data
  const user = createUser(req.validatedData)
  return Response.json(user)
})
```

### Timing Middleware

```typescript
function timingMiddleware(req, next) {
  const start = performance.now()

  // Add timing header to response
  const response = next(req)

  const ms = performance.now() - start
  response.headers.set('X-Response-Time', `${ms.toFixed(2)}ms`)

  return response
}

router.use(timingMiddleware)
```

### Request ID Middleware

```typescript
function requestIdMiddleware(req, next) {
  // Generate a unique ID for each request
  const requestId = crypto.randomUUID()

  // Add to request for logging
  req.id = requestId

  // Add to response headers
  const response = next(req)
  response.headers.set('X-Request-ID', requestId)

  return response
}

router.use(requestIdMiddleware)
```

## Best Practices

When creating custom middleware, follow these best practices:

1. **Keep middleware focused**: Each middleware should have a single responsibility
2. **Order matters**: Apply middleware in the correct order (e.g., error handlers first)
3. **Be careful with async operations**: Ensure proper error handling for async code
4. **Don't modify the request object unnecessarily**: Only attach properties when needed
5. **Document your middleware**: Include clear documentation on what the middleware does
6. **Test middleware separately**: Write unit tests for middleware functions
7. **Consider performance**: Optimize middleware that runs on every request

## Next Steps

Now that you understand how to create custom middleware in bun-router, check out these related topics:

- [Middleware](/features/middleware) - Learn about the built-in middleware provided by bun-router
- [Route Groups](/features/route-groups) - Apply middleware to groups of routes
- [Error Handling](/advanced/error-handling) - Advanced error handling strategies
