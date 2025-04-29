# API Reference

This page provides detailed documentation for the `bun-router` API.

## Router

### Constructor

```typescript
new Router(options?: RouterOptions)
```

Creates a new router instance.

**Parameters:**

- `options` (optional): Configuration options for the router

**Example:**

```typescript
import { Router } from 'bun-router'

const router = new Router({
  verbose: true,
  apiPrefix: '/api',
})
```

### Route Methods

#### HTTP Methods

```typescript
router.get(path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
router.post(path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
router.put(path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
router.patch(path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
router.delete(path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
router.options(path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
router.head(path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
```

Defines a route that responds to the specified HTTP method.

**Parameters:**

- `path`: The URL path pattern
- `handler`: Function that handles the request
- `type` (optional): Route type, either 'api' or 'web'
- `name` (optional): Name for the route, used for URL generation
- `middleware` (optional): Array of middleware to be executed before the handler

**Returns:**

- `Router`: The router instance for method chaining

**Example:**

```typescript
// Basic route
router.get('/users', getUsersHandler)

// Named route with type
router.get('/users/{id}', getUserHandler, 'api', 'users.show')

// Route with middleware
router.post('/users', createUserHandler, 'api', 'users.create', [
  validateUserMiddleware,
  logRequestMiddleware
])
```

#### Multiple Methods

```typescript
router.match(methods: string[], path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
```

Defines a route that responds to multiple HTTP methods.

**Parameters:**

- `methods`: Array of HTTP methods
- `path`: The URL path pattern
- `handler`: Function that handles the request
- `type` (optional): Route type, either 'api' or 'web'
- `name` (optional): Name for the route
- `middleware` (optional): Array of middleware to be executed before the handler

**Example:**

```typescript
router.match(['GET', 'HEAD'], '/api/health', healthCheckHandler)

// With middleware
router.match(['GET', 'POST'], '/data', dataHandler, 'api', 'data', [authMiddleware])
```

#### Any Method

```typescript
router.any(path: string, handler: RouteHandler, type?: 'api' | 'web', name?: string, middleware?: (string | MiddlewareHandler)[]): Router
```

Defines a route that responds to any HTTP method.

**Parameters:**

- `path`: The URL path pattern
- `handler`: Function that handles the request
- `type` (optional): Route type, either 'api' or 'web'
- `name` (optional): Name for the route
- `middleware` (optional): Array of middleware to be executed before the handler

**Example:**

```typescript
router.any('/users', getUsersHandler, 'api', 'users.list', [
  validateUserMiddleware,
  logRequestMiddleware
])
```

### Redirects

```typescript
router.redirectRoute(path: string, destination: string, status?: number): void
router.permanentRedirectRoute(path: string, destination: string): void
```

Creates redirect routes.

**Example:**

```typescript
router.redirectRoute('/old-path', '/new-path', 302)
router.permanentRedirectRoute('/very-old-path', '/new-path')
```

### Route Groups

```typescript
router.group(options: GroupOptions, callback: () => void): void
```

Groups related routes with shared attributes.

**Parameters:**

- `options`: Group configuration (prefix, middleware, domain)
- `callback`: Function containing route definitions

**Example:**

```typescript
router.group({
  prefix: '/api',
  middleware: [authMiddleware],
}, () => {
  router.get('/users', getUsersHandler)
  router.post('/users', createUserHandler)
})
```

### Middleware

```typescript
router.use(middleware: Middleware | Middleware[]): void
```

Adds global middleware to the router.

**Example:**

```typescript
router.use(corsMiddleware)
router.use([loggerMiddleware, jsonBodyMiddleware])
```

```typescript
router.middleware(...middleware: (string | MiddlewareHandler)[]): Router
```

Adds middleware to the most recently added route (fluent API).

**Example:**

```typescript
router.get('/users', getUsers)
  .middleware(authMiddleware, logRequestMiddleware)
```

### Domain Routing

```typescript
router.domain(domain: string, callback: () => void): void
```

Groups routes under a specific domain.

**Example:**

```typescript
router.domain('api.example.com', () => {
  router.get('/users', getUsersHandler)
})
```

### Resource Routes

```typescript
router.resource(name: string, controller: string | object, options?: ResourceOptions): void
```

Creates RESTful resource routes.

**Example:**

```typescript
router.resource('posts', PostsController)
```

### URL Generation

```typescript
router.route(name: string, params?: Record<string, string | number>): string
```

Generates a URL for a named route.

**Example:**

```typescript
const url = router.route('users.show', { id: 123 })
```

### Server

```typescript
router.serve(options?: ServerOptions): Promise<Server>
```

Starts the HTTP server with the defined routes.

**Example:**

```typescript
router.serve({
  port: 3000,
  development: process.env.NODE_ENV !== 'production',
})
```

```typescript
router.reload(): Promise<void>
```

Reloads the router's routes without restarting the server.

### WebSockets

```typescript
router.websocket(options: WebSocketOptions): void
```

Configures WebSocket handling.

**Example:**

```typescript
router.websocket({
  open: (ws) => { console.log('Client connected') },
  message: (ws, message) => { ws.send(`Echo: ${message}`) },
  close: (ws, code, reason) => { console.log('Client disconnected') },
})
```

```typescript
router.publish(topic: string, message: string | Uint8Array, compress?: boolean): number
```

Publishes a message to all WebSocket clients subscribed to a topic.

```typescript
router.subscriberCount(topic: string): number
```

Returns the number of WebSocket clients subscribed to a topic.

```typescript
router.upgrade(req: Request, options?: UpgradeOptions): boolean
```

Upgrades an HTTP request to a WebSocket connection.

### Error Handling

```typescript
router.onError(handler: ErrorHandler): void
```

Sets a global error handler for the router.

**Example:**

```typescript
router.onError((error, req) => {
  console.error('Server error:', error)
  return new Response('Internal Server Error', { status: 500 })
})
```

### Utility Methods

```typescript
router.streamFile(path: string, options?: StreamOptions): Response
```

Streams a file from disk as an HTTP response.

```typescript
router.streamFileWithRanges(path: string, req: Request, options?: StreamOptions): Response
```

Streams a file with support for range requests.

```typescript
router.timeout(req: Request, seconds: number): void
```

Sets a custom timeout for the current request.

```typescript
router.requestIP(req: Request): string | null
```

Gets the client IP address from a request.

## Types

### RouteHandler

```typescript
type RouteHandler = (req: EnhancedRequest, ...args: any[]) => Response | Promise<Response>
```

Function that handles route requests.

### Middleware

```typescript
interface Middleware {
  handle: (req: EnhancedRequest, next: NextFunction) => Promise<Response>
}
```

Interface for middleware objects.

### EnhancedRequest

Extended Request object with additional properties added by bun-router.

```typescript
interface EnhancedRequest extends Request {
  params: Record<string, string>
  query: Record<string, string>
  cookies: CookieJar
  jsonBody?: any
  session?: Session
  // Additional properties added by middleware
}
```

### Route

```typescript
interface Route {
  whereNumber: (param: string) => Route
  whereAlpha: (param: string) => Route
  whereAlphaNumeric: (param: string) => Route
  whereUuid: (param: string) => Route
  whereIn: (param: string, values: string[]) => Route
  where: (param: string, pattern: RegExp) => Route
}
```

Route object returned by route definition methods.

### WebSocketOptions

```typescript
interface WebSocketOptions<T = any> {
  open?: (ws: ServerWebSocket<T>) => void
  message?: (ws: ServerWebSocket<T>, message: string | Uint8Array) => void
  close?: (ws: ServerWebSocket<T>, code: number, reason: string) => void
  drain?: (ws: ServerWebSocket<T>) => void
  error?: (ws: ServerWebSocket<T>, error: Error) => void
  maxPayloadLength?: number
  idleTimeout?: number
  backpressureLimit?: number
  perMessageDeflate?: boolean | {
    compress?: boolean | string
    decompress?: boolean
  }
  sendPings?: boolean
  publishToSelf?: boolean
}
```

Configuration options for WebSocket handling.
