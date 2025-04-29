# Advanced Error Handling

Proper error handling is crucial for building robust web applications. This guide covers strategies for comprehensive error handling in bun-router applications.

## Global Error Handling

The most straightforward approach to catch all errors is to implement a global error handling middleware:

```typescript
import { BunRouter } from 'bun-router'

const router = new BunRouter()

// Global error handling middleware
function errorHandler(req, next) {
  try {
    // Attempt to process the request
    return next(req)
  }
  catch (error) {
    console.error('Unhandled error:', error)

    // Determine if this is a known error type
    if (error instanceof NotFoundError) {
      return new Response('Resource not found', { status: 404 })
    }

    if (error instanceof ValidationError) {
      return Response.json({
        error: 'Validation failed',
        details: error.details
      }, { status: 400 })
    }

    if (error instanceof AuthorizationError) {
      return new Response('Unauthorized', { status: 403 })
    }

    // Generic error response for unknown errors
    return Response.json({
      error: 'An unexpected error occurred',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    }, { status: 500 })
  }
}

// Apply as the first middleware to catch all errors
router.use(errorHandler)
```

## Custom Error Classes

Define custom error classes to make error handling more structured:

```typescript
// Base application error
class AppError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.name = this.constructor.name
    this.status = status
  }
}

// Specific error types
class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = '') {
    super(`${resource}${id ? ` with ID ${id}` : ''} not found`, 404)
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = {}) {
    super(message, 400)
    this.details = details
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403)
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401)
  }
}
```

## Route-Specific Error Handling

For more targeted error handling, you can wrap individual routes:

```typescript
function handleRouteErrors(handler) {
  return async (req) => {
    try {
      return await handler(req)
    }
    catch (error) {
      // Handle errors for this specific route
      console.error(`Error in route ${req.method} ${req.url}:`, error)

      if (error instanceof ValidationError) {
        return Response.json({ errors: error.details }, { status: 400 })
      }

      // Re-throw other errors to be caught by the global handler
      throw error
    }
  }
}

// Apply to specific routes
router.get('/users/:id', handleRouteErrors(async (req) => {
  const { id } = req.params
  const user = await findUser(id)

  if (!user) {
    throw new NotFoundError('User', id)
  }

  return Response.json(user)
}))
```

## Async Error Handling

For asynchronous operations, ensure proper error catching:

```typescript
router.get('/users/:id', async (req) => {
  try {
    const { id } = req.params
    const user = await findUser(id)

    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    return Response.json(user)
  }
  catch (error) {
    console.error('Failed to fetch user:', error)

    return Response.json({
      error: 'Failed to fetch user',
      message: error.message
    }, { status: 500 })
  }
})
```

## Domain-Specific Error Handling

Group error handling by domain or feature:

```typescript
// User-related route group with specific error handling
router.group({
  prefix: '/users',
  middleware: [userErrorHandler]
}, () => {
  router.get('/', getUsersHandler)
  router.get('/:id', getUserHandler)
  router.post('/', createUserHandler)
  // ...more user routes
})

// Order-related route group with specific error handling
router.group({
  prefix: '/orders',
  middleware: [orderErrorHandler]
}, () => {
  router.get('/', getOrdersHandler)
  router.get('/:id', getOrderHandler)
  router.post('/', createOrderHandler)
  // ...more order routes
})

// Domain-specific error handler middleware
function userErrorHandler(req, next) {
  try {
    return next(req)
  }
  catch (error) {
    if (error instanceof UserNotFoundError) {
      return new Response('User not found', { status: 404 })
    }

    if (error instanceof DuplicateUserError) {
      return Response.json({
        error: 'User already exists',
        field: error.field
      }, { status: 409 })
    }

    // Re-throw for global handler
    throw error
  }
}
```

## Validation Error Handling

For input validation errors, provide detailed feedback:

```typescript
import { z } from 'zod'

// Create a schema for user input
const userSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  age: z.number().int().positive().optional()
})

router.post('/users', async (req) => {
  try {
    // Parse and validate the request body
    const data = await req.json()
    const validatedData = userSchema.parse(data)

    // Process the validated data
    const user = await createUser(validatedData)

    return Response.json(user, { status: 201 })
  }
  catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return Response.json({
        error: 'Validation failed',
        details: error.format()
      }, { status: 400 })
    }

    // Handle other errors
    console.error('User creation error:', error)
    return Response.json({
      error: 'Failed to create user'
    }, { status: 500 })
  }
})
```

## Database Error Handling

Handle database-specific errors in a structured way:

```typescript
router.get('/products/:id', async (req) => {
  try {
    const { id } = req.params
    const product = await db.products.findUnique({ where: { id } })

    if (!product) {
      return new Response('Product not found', { status: 404 })
    }

    return Response.json(product)
  }
  catch (error) {
    // Handle database-specific errors
    if (error.code === 'P2002') {
      // Prisma unique constraint violation
      return Response.json({
        error: 'Database constraint violation',
        details: 'A record with this identifier already exists'
      }, { status: 409 })
    }

    if (error.code === 'P2025') {
      // Prisma record not found
      return new Response('Product not found', { status: 404 })
    }

    // Log unexpected database errors
    console.error('Database error:', error)

    return Response.json({
      error: 'Database error',
      message: 'Failed to retrieve product'
    }, { status: 500 })
  }
})
```

## Rate Limiting and Throttling Errors

Handle rate limiting in a user-friendly way:

```typescript
import { redis } from 'bun'

// Rate limiting middleware
async function rateLimiter(req, next) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const key = `ratelimit:${ip}`

  try {
    // Get current count
    const count = Number.parseInt(await redis.get(key) || '0')

    // Check limit
    if (count >= 100) { // 100 requests per minute
      return new Response('Too many requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + 60).toString()
        }
      })
    }

    // Increment counter
    await redis.incr(key)

    // Set expiry if first request
    if (count === 0) {
      await redis.expire(key, 60) // 1 minute
    }

    // Process request
    const response = await next(req)

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '100')
    response.headers.set('X-RateLimit-Remaining', (100 - count - 1).toString())

    return response
  }
  catch (error) {
    console.error('Rate limiting error:', error)

    // Fail open if rate limiting breaks
    return next(req)
  }
}

router.use(rateLimiter)
```

## Error Logging

Implement comprehensive error logging:

```typescript
function errorLoggerMiddleware(req, next) {
  try {
    return next(req)
  }
  catch (error) {
    // Log detailed error information
    const logEntry = {
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent'),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: error.status || 500
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Request error:', logEntry)
    }
    else {
      // In production, send to logging service
      try {
        // Example: Send to a logging service
        fetch('https://logging-service.example.com/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        }).catch(err => console.error('Failed to send log:', err))
      }
      catch (logError) {
        console.error('Logging failed:', logError)
      }
    }

    // Re-throw for error handling middleware
    throw error
  }
}

// Apply before the error handler middleware
router.use(errorLoggerMiddleware)
router.use(errorHandler)
```

## Not Found Handling

Handle 404 errors for undefined routes:

```typescript
// Define all your routes first
router.get('/', homeHandler)
router.get('/about', aboutHandler)
// ...more routes

// Then add a catch-all handler at the end
router.all('*', (req) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`)

  // HTML response for browsers
  if (req.headers.get('accept')?.includes('text/html')) {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Page Not Found</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; }
            h1 { color: #e53e3e; }
          </style>
        </head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <a href="/">Return to homepage</a>
        </body>
      </html>
    `, {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // JSON response for API requests
  return Response.json({
    error: 'Not Found',
    message: `No route found for ${req.method} ${req.url}`
  }, { status: 404 })
})
```

## API Error Responses

Standardize API error responses for consistency:

```typescript
// Create a utility function for standardized API errors
function apiError(status, code, message, details = null) {
  const body = {
    status,
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  }

  if (details) {
    body.error.details = details
  }

  return Response.json(body, { status })
}

router.get('/api/users/:id', async (req) => {
  try {
    const { id } = req.params
    const user = await findUser(id)

    if (!user) {
      return apiError(404, 'USER_NOT_FOUND', `User with ID ${id} not found`)
    }

    return Response.json(user)
  }
  catch (error) {
    return apiError(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? { message: error.message } : null
    )
  }
})
```

## Error Boundaries

Create error boundaries for different parts of your application:

```typescript
// API error boundary
router.group({
  prefix: '/api',
  middleware: [apiErrorBoundary]
}, () => {
  // All API routes
})

// Admin routes error boundary
router.group({
  prefix: '/admin',
  middleware: [adminErrorBoundary]
}, () => {
  // All admin routes
})

// Public routes error boundary
router.group({
  prefix: '/',
  middleware: [publicErrorBoundary]
}, () => {
  // All public routes
})

// Example error boundary middleware
function apiErrorBoundary(req, next) {
  try {
    return next(req)
  }
  catch (error) {
    // Return standardized API error response
    return Response.json({
      error: {
        status: error.status || 500,
        message: error.message || 'An unexpected error occurred',
        code: error.code || 'INTERNAL_ERROR'
      }
    }, { status: error.status || 500 })
  }
}
```

## Environment-Specific Error Handling

Adjust error responses based on the environment:

```typescript
function environmentAwareErrorHandler(req, next) {
  try {
    return next(req)
  }
  catch (error) {
    const isDevelopment = process.env.NODE_ENV === 'development'

    // In development, provide detailed error information
    if (isDevelopment) {
      return Response.json({
        error: {
          message: error.message,
          stack: error.stack,
          type: error.name,
          details: error.details || undefined
        }
      }, { status: error.status || 500 })
    }

    // In production, provide minimal information
    return Response.json({
      error: 'An error occurred while processing your request'
    }, { status: error.status || 500 })
  }
}

router.use(environmentAwareErrorHandler)
```

## Handling Timeouts

Implement timeout handling for routes:

```typescript
function timeoutMiddleware(timeoutMs = 10000) {
  return async (req, next) => {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      // Race the request against the timeout
      return await Promise.race([
        next(req),
        timeoutPromise
      ])
    }
    catch (error) {
      if (error.message.includes('Request timeout')) {
        return new Response('Request timed out', { status: 504 })
      }
      throw error
    }
  }
}

// Apply to specific routes that might be slow
router.get('/reports/generate', timeoutMiddleware(30000), generateReportHandler)
```

## Recovery Strategies

Implement recovery strategies for critical functions:

```typescript
async function getUserWithRetry(id, maxRetries = 3) {
  let retries = 0

  while (retries < maxRetries) {
    try {
      return await db.users.findUnique({ where: { id } })
    }
    catch (error) {
      retries++
      console.log(`Attempt ${retries} failed to get user ${id}:`, error.message)

      if (retries >= maxRetries) {
        throw new Error(`Failed to get user after ${maxRetries} attempts`)
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 2 ** retries * 100))
    }
  }
}

router.get('/users/:id', async (req) => {
  try {
    const { id } = req.params
    const user = await getUserWithRetry(id)

    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    return Response.json(user)
  }
  catch (error) {
    return Response.json({
      error: 'Failed to retrieve user',
      message: error.message
    }, { status: 500 })
  }
})
```

## Best Practices

When implementing error handling, follow these best practices:

1. **Use a global error handler** to catch all unhandled errors
2. **Create domain-specific error types** for more targeted handling
3. **Standardize error responses** across your application
4. **Log errors** with sufficient context for debugging
5. **Hide sensitive error details** in production environments
6. **Implement timeouts** for potentially slow operations
7. **Use recovery strategies** for critical functions
8. **Provide helpful error messages** to users
9. **Add appropriate HTTP status codes** to error responses

## Next Steps

Now that you understand advanced error handling in bun-router, check out these related topics:

- [Custom Middleware](/advanced/custom-middleware) - Learn more about creating custom middleware
- [Middleware](/features/middleware) - Explore built-in middleware in bun-router
- [Websockets](/features/websockets) - Handle errors in websocket connections
