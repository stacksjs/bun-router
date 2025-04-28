# @bun-router

A Laravel-inspired router for Bun applications.

## Features

- Laravel-style routing API
- Support for route parameters
- Route grouping
- Action class support
- Middleware support (global and route-specific)
- Built on top of Bun's native HTTP server

## Installation

```bash
bun add @bun-router
```

## Basic Usage

```typescript
import { route } from '@bun-router'

// Basic route with inline handler
route.get('/', () => new Response('Hello World!'))

// Route with parameters
route.get('/users/{id}', (req) => {
  const { id } = req.params
  return Response.json({ userId: id })
})

// Route with action class
route.post('/subscribe', 'Actions/SubscribeAction')

// Route grouping
route.group({ prefix: '/api' }, () => {
  route.get('/users', 'Actions/User/IndexAction')
  route.post('/users', 'Actions/User/StoreAction')
})

// Health check route
route.health()

// Start the server
route.serve({
  port: 3000,
})
```

## Action Classes

Action classes provide a clean way to organize your route handlers. Create a class that implements a `handle` method:

```typescript
// actions/subscribe_action.ts
import type { EnhancedRequest } from '@bun-router'

export default class SubscribeAction {
  async handle(request: EnhancedRequest): Promise<Response> {
    const data = await request.json()

    // Handle subscription logic

    return Response.json({
      success: true,
      message: 'Subscribed successfully'
    })
  }
}
```

## Middleware

Middleware allows you to run code before your route handlers. You can use middleware globally or for specific routes/groups.

### Creating Middleware

Create a middleware class that implements the `handle` method:

```typescript
// middleware/auth.ts
import type { EnhancedRequest, Middleware, NextFunction } from '@bun-router'

export default class AuthMiddleware implements Middleware {
  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 })
    }

    // If auth passes, continue to next middleware or route handler
    return next()
  }
}
```

### Using Middleware

You can use middleware in several ways:

1. Global Middleware (applies to all routes):

```typescript
route.use('Middleware/Auth')
route.use('Middleware/Logger')

// Or with inline middleware
route.use(async (req, next) => {
  console.log(`${req.method} ${req.url}`)
  return next()
})
```

2. Group Middleware (applies to all routes in a group):

```typescript
route.group({
  prefix: '/api',
  middleware: ['Middleware/Auth']
}, () => {
  route.get('/users', 'Actions/User/IndexAction')
  route.post('/users', 'Actions/User/StoreAction')
})
```

3. Inline Middleware:

```typescript
route.group({
  middleware: [
    async (req, next) => {
      console.log('Processing request...')
      const response = await next()
      console.log('Request complete')
      return response
    }
  ]
}, () => {
  route.get('/users', 'Actions/User/IndexAction')
})
```

## Route Groups

Group related routes with a common prefix and middleware:

```typescript
route.group({
  prefix: '/api/v1',
  middleware: ['Middleware/Auth', 'Middleware/RateLimit']
}, () => {
  // All routes here will be prefixed with /api/v1
  route.get('/users', 'Actions/User/IndexAction')
  route.post('/users', 'Actions/User/StoreAction')

  // Nested groups
  route.group({
    prefix: '/admin',
    middleware: ['Middleware/AdminAuth']
  }, () => {
    route.get('/stats', 'Actions/Admin/StatsAction')
  })
})
```

## Route Parameters

Access route parameters through the `params` object:

```typescript
route.get('/users/{id}/posts/{postId}', (req) => {
  const { id, postId } = req.params
  return Response.json({ userId: id, postId })
})
```

## TypeScript Support

The router is written in TypeScript and provides full type definitions:

```typescript
import type { ActionHandler, EnhancedRequest, Middleware, NextFunction } from '@bun-router'

// Type-safe request handling
const handler: ActionHandler = (req: EnhancedRequest) => {
  const { id } = req.params
  return Response.json({ id })
}

// Type-safe middleware
const loggerMiddleware: Middleware = {
  handle: async (req: EnhancedRequest, next: NextFunction) => {
    console.log(`${req.method} ${req.url}`)
    return next()
  }
}

route.use(loggerMiddleware.handle)
route.get('/users/{id}', handler)
```

## Server Configuration

The `serve` method accepts all Bun server options:

```typescript
route.serve({
  port: 3000,
  hostname: 'localhost',
  development: true,
})
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
