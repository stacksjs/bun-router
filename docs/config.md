# Configuration

bun-router can be configured when initializing a new router instance. This page covers all the available configuration options.

## Basic Configuration

When creating a new router instance, you can pass a configuration object:

```typescript
import { BunRouter } from 'bun-router'

const router = new BunRouter({
  // Configuration options here
  verbose: true,
  apiPrefix: '/api',
})
```

## Available Options

Here's a complete list of configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `verbose` | `boolean` | `false` | Enable verbose logging of routes and requests |
| `apiPrefix` | `string` | `''` | Global prefix for all routes |
| `baseUrl` | `string` | `''` | Base URL for generating route URLs |
| `defaultMiddleware` | `object` | `{}` | Default middleware to apply to routes |
| `corsOptions` | `object` | `null` | CORS configuration options |
| `serverErrorHandler` | `function` | `null` | Global error handler for server errors |
| `notFoundHandler` | `function` | `null` | Handler for 404 Not Found responses |
| `webSocketOptions` | `object` | `{}` | Default WebSocket configuration |

## Verbose Logging

When `verbose` is set to `true`, bun-router will log detailed information about route registration and request handling:

```typescript
const router = new BunRouter({
  verbose: true,
})
```

This is useful during development to debug routing issues.

## API Prefix

The `apiPrefix` option adds a global prefix to all routes:

```typescript
const router = new BunRouter({
  apiPrefix: '/api/v1',
})

// This route will be accessible at /api/v1/users
router.get('/users', getUsersHandler)
```

## Default Middleware

You can specify default middleware to be applied to different route types:

```typescript
const router = new BunRouter({
  defaultMiddleware: {
    api: [corsMiddleware, jsonBodyMiddleware],
    web: [sessionMiddleware, csrfMiddleware],
  },
})
```

## CORS Configuration

Configure Cross-Origin Resource Sharing (CORS) globally:

```typescript
const router = new BunRouter({
  corsOptions: {
    origin: ['https://example.com'],
    methods: ['GET', 'POST'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Custom-Header'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },
})
```

## Error Handlers

Customize how errors are handled:

```typescript
const router = new BunRouter({
  // Custom 500 error handler
  serverErrorHandler: (error) => {
    console.error('Server error:', error)
    return new Response('Something went wrong', { status: 500 })
  },

  // Custom 404 handler
  notFoundHandler: (req) => {
    return new Response(`Page not found: ${req.url}`, { status: 404 })
  },
})
```

## WebSocket Configuration

Configure default WebSocket behavior:

```typescript
const router = new BunRouter({
  webSocketOptions: {
    maxPayloadLength: 32 * 1024 * 1024, // 32MB
    idleTimeout: 300, // 5 minutes
    backpressureLimit: 1024 * 1024, // 1MB
    perMessageDeflate: true,
    publishToSelf: false,
  },
})
```

## Environment-Specific Configuration

You can create different configurations based on the environment:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development'

const router = new BunRouter({
  verbose: isDevelopment,
  corsOptions: isDevelopment
    ? { origin: '*' }
    : { origin: ['https://myapp.com'] },
})
```

## Per-Route Configuration

While global configuration is set on the router instance, many options can be overridden at the route level:

```typescript
// Override CORS for a specific route
router.get('/public-api', handler, {
  cors: {
    origin: '*',
  },
})

// Override middleware for a route group
router.group({
  prefix: '/admin',
  middleware: [authMiddleware],
}, () => {
  // Routes in this group use authMiddleware
})
```
