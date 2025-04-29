# Middleware

Middleware allows you to run code before or after a route handler executes. This is useful for tasks like authentication, logging, request validation, and more.

## Using Middleware

### Global Middleware

To apply middleware to all routes, use the `use` method:

```typescript
import { cors, jsonBody, Router } from 'bun-router'

const router = new Router()

// Apply middleware globally
router.use(jsonBody())
router.use(cors())

// Define routes that will use the middleware
router.get('/api/data', (req) => {
  // req.jsonBody is available thanks to jsonBody middleware
  return Response.json({ message: 'Data accessed' })
})
```

### Group Middleware

You can apply middleware to a group of routes:

```typescript
router.group({
  prefix: '/api',
  middleware: [authMiddleware(), jsonBody()],
}, () => {
  // All routes in this group use authMiddleware and jsonBody
  router.get('/users', getUsersHandler)
  router.post('/users', createUserHandler)
})
```

### Route-Specific Middleware

You can also apply middleware to specific routes by passing it as the last parameter:

```typescript
// Apply middleware to a single route
router.get('/admin/dashboard', dashboardHandler, 'web', 'dashboard', [adminAuthMiddleware()])

// Multiple middleware for a specific route
router.post('/users', createUserHandler, 'api', 'users.create', [
  validateUserMiddleware(),
  logRequestMiddleware()
])

// With named routes
router.get('/profile', profileHandler, 'web', 'profile', [authMiddleware()])
```

This Laravel-style approach allows you to directly attach middleware to routes when you define them. The order of parameters is:

```typescript
router.method(
  path,           // The route path
  handler,        // The route handler function
  type?,          // Optional: 'api' or 'web'
  name?,          // Optional: Route name for named routes
  middleware?     // Optional: Array of middleware
)
```

The middleware will be executed in the order they are defined in the array.

### Fluid Middleware API

Alternatively, you can use the fluid middleware API which allows you to chain middleware to a route after it has been defined:

```typescript
// Define a route and chain middleware to it
router.get('/admin/dashboard', adminDashboardHandler)
  .middleware(authMiddleware(), loggingMiddleware())

// This is especially useful when applying multiple middleware
router.post('/api/users', createUserHandler, 'api', 'users.create')
  .middleware(validateUserMiddleware())
  .middleware(rateLimit())
  .middleware(logRequestMiddleware())

// You can also combine with other fluent methods
router.get('/users/{id}', showUserHandler, 'api', 'users.show')
  .middleware(authMiddleware())
  .whereNumber('id')
```

This fluent API provides a clean and readable way to apply middleware that is similar to Laravel's route definition style.

## Built-in Middleware

bun-router includes several built-in middleware components:

### JSON Body Parser

Parses JSON request bodies and makes them available as `req.jsonBody`:

```typescript
import { jsonBody, Router } from 'bun-router'

const router = new Router()
router.use(jsonBody())

router.post('/api/users', (req) => {
  // Access the parsed JSON body
  const userData = req.jsonBody
  console.log(userData.name, userData.email)

  return Response.json({ message: 'User created' })
})
```

### CORS

Handles Cross-Origin Resource Sharing headers:

```typescript
import { cors, Router } from 'bun-router'

const router = new Router()

// Simple CORS with defaults
router.use(cors())

// Custom CORS configuration
router.use(cors({
  origin: ['https://example.com', 'https://api.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Request-ID'],
  credentials: true,
  maxAge: 86400, // 24 hours in seconds
}))
```

### Request ID

Adds unique IDs to requests via the `X-Request-ID` header:

```typescript
import { requestId, Router } from 'bun-router'

const router = new Router()
router.use(requestId())

router.get('/api/status', (req) => {
  // Access the request ID
  const id = req.headers.get('X-Request-ID')
  console.log(`Processing request ${id}`)

  return Response.json({ status: 'ok' })
})
```

### Session

Provides session management:

```typescript
import { Router, session } from 'bun-router'

const router = new Router()

router.use(session({
  secret: 'your-secret-key',
  cookie: {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: true,
  },
  storage: 'memory', // or 'file', 'redis', etc.
}))

router.get('/profile', (req) => {
  // Access or modify session data
  const userId = req.session.get('userId')

  if (!userId) {
    return new Response('Not logged in', { status: 401 })
  }

  return Response.json({ userId, lastAccess: req.session.get('lastAccess') })
})

router.post('/login', async (req) => {
  const data = await req.json()

  // Authenticate user (simplified for example)
  if (data.username === 'admin' && data.password === 'password') {
    // Store data in session
    req.session.set('userId', 'user_123')
    req.session.set('lastAccess', Date.now())

    return Response.json({ success: true })
  }

  return Response.json({ success: false }, { status: 401 })
})
```

### CSRF Protection

Protects against Cross-Site Request Forgery attacks:

```typescript
import { csrf, Router, session } from 'bun-router'

const router = new Router()

// Session middleware is required for CSRF
router.use(session({ secret: 'your-secret-key' }))

// Add CSRF protection
router.use(csrf())

// Routes that generate forms can access the CSRF token
router.get('/form', (req) => {
  const csrfToken = req.csrfToken()

  const html = `
    <form method="POST" action="/submit">
      <input type="hidden" name="_csrf" value="${csrfToken}">
      <input type="text" name="name">
      <button type="submit">Submit</button>
    </form>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
})

// POST routes are protected from CSRF attacks
router.post('/submit', (req) => {
  // CSRF check happens automatically
  // If the token is missing or invalid, the request is rejected

  return new Response('Form submitted successfully')
})
```

### Auth

Basic authentication middleware:

```typescript
import { auth, Router } from 'bun-router'

const router = new Router()

// Basic auth middleware
router.use(auth({
  type: 'basic',
  validate: (username, password) => {
    // Validate credentials (use secure comparison in production)
    return username === 'admin' && password === 'secret'
  }
}))

// JWT auth middleware
router.use(auth({
  type: 'jwt',
  secret: 'your-jwt-secret',
  algorithms: ['HS256'],
  getToken: (req) => {
    return req.headers.get('Authorization')?.split(' ')[1] || ''
  }
}))

// Protected routes
router.get('/api/protected', (req) => {
  // req.auth contains the authenticated user
  return Response.json({ user: req.auth })
})
```

## Middleware Execution Order

Middleware executes in the order it is added:

1. Global middleware (added with `router.use()`)
2. Group middleware (specified in `router.group()`)
3. Route-specific middleware
4. The route handler itself

If any middleware returns a response, subsequent middleware and the route handler are skipped.

## CLI Commands for Working with Middleware

Bun Router provides helpful CLI commands for working with middleware:

### Generate Built-in Middleware Types

To generate TypeScript types for built-in middleware:

```bash
bun router middleware:types
```

Options:

- `--output` - Specify output file path (default: `middleware-types.ts`)
- `--watch` - Watch for changes in middleware directory

### Generate Project Middleware Map

To scan your project for middleware classes and generate a type map:

```bash
bun router middleware:map
```

This command scans your project directories for middleware classes and generates a TypeScript type definition file that includes all your middleware. This is particularly useful for autocompletion and type safety when using the fluid middleware API.

Options:

- `--dir` - Directory to scan (default: `src`)
- `--output` - Output file path (default: `middleware-map.ts`)
- `--watch` - Watch for changes in the directory

Example output:

```typescript
import { AuthMiddleware } from 'app/middleware/AuthMiddleware'
import { LoggerMiddleware } from 'app/middleware/LoggerMiddleware'
import { RateLimitMiddleware } from 'app/middleware/RateLimitMiddleware'

export interface MiddlewareMap {
  AuthMiddleware: typeof AuthMiddleware
  LoggerMiddleware: typeof LoggerMiddleware
  RateLimitMiddleware: typeof RateLimitMiddleware
}

export type MiddlewareType = AuthMiddleware | LoggerMiddleware | RateLimitMiddleware

export type MiddlewareHandler = (req: any, next: () => Promise<Response>) => Promise<Response>

export const middlewareMap: MiddlewareMap = {
  AuthMiddleware: AuthMiddleware,
  LoggerMiddleware: LoggerMiddleware,
  RateLimitMiddleware: RateLimitMiddleware
}
```

## Creating Custom Middleware

You can create your own middleware using either class-based or function-based approaches.

### Class-Based Middleware

```typescript
import { EnhancedRequest, Middleware, NextFunction } from 'bun-router'

class LoggerMiddleware implements Middleware {
  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    const start = performance.now()
    console.log(`${req.method} ${req.url} - Started`)

    // Call the next middleware or route handler
    const response = await next()

    const time = performance.now() - start
    console.log(`${req.method} ${req.url} - Completed in ${time.toFixed(2)}ms`)

    return response
  }
}

// Use the middleware
router.use(new LoggerMiddleware())
```

### Function-Based Middleware

```typescript
import { EnhancedRequest, NextFunction } from 'bun-router'

function rateLimiter(maxRequests: number, windowMs: number) {
  // Store IP addresses and their request counts
  const requests = new Map<string, { count: number, resetTime: number }>()

  return {
    async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
      const ip = req.headers.get('X-Forwarded-For') || req.headers.get('host') || 'unknown'
      const now = Date.now()

      // Get or initialize request data for this IP
      const data = requests.get(ip) || { count: 0, resetTime: now + windowMs }

      // Reset count if the window has passed
      if (now > data.resetTime) {
        data.count = 0
        data.resetTime = now + windowMs
      }

      // Increment request count
      data.count++
      requests.set(ip, data)

      // Check if limit exceeded
      if (data.count > maxRequests) {
        return new Response('Too Many Requests', { status: 429 })
      }

      // Proceed to next middleware or route handler
      return next()
    }
  }
}

// Use the middleware
router.use(rateLimiter(100, 60 * 1000)) // 100 requests per minute
```

## Passing Data Between Middleware

Middleware can pass data to subsequent middleware and route handlers by attaching properties to the request object:

```typescript
function userLoader() {
  return {
    async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
      // Get user ID from request
      const userId = req.headers.get('X-User-ID')

      if (userId) {
        // Load user data
        const user = await loadUserFromDatabase(userId)

        // Attach user to request
        req.user = user
      }

      return next()
    }
  }
}

router.use(userLoader())

router.get('/profile', (req) => {
  // Access the user loaded by middleware
  if (!req.user) {
    return new Response('User not found', { status: 404 })
  }

  return Response.json(req.user)
})
```

## Next Steps

Now that you understand middleware in bun-router, check out these related topics:

- [Custom Middleware](/advanced/custom-middleware) - In-depth guide to creating custom middleware
- [Error Handling](/advanced/error-handling) - Handle errors in middleware and routes
- [Authentication](/features/authentication) - Detailed authentication patterns
