<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# bun-router

A high-performance, feature-rich router for Bun applications.

## Features

- Fast and efficient routing system
- Support for all HTTP methods
- Path parameters and parameter constraints
- Middleware support with built-in middleware
- Group routing, resource routing, and nested routes
- Named routes and URL generation
- Domain and subdomain routing
- CSRF protection and session management
- Type-safe API
- Native Bun.serve() integration
- WebSocket support

## Installation

```bash
bun add bun-router
```

## Basic Usage

```typescript
import { BunRouter } from 'bun-router'

// Create a router
const router = new BunRouter()

// Define routes
router.get('/', () => new Response('Hello, World!'))
router.post('/users', async (req) => {
  const data = await req.json()
  return Response.json({ message: 'User created', data })
})

// Start the server
router.serve({
  port: 3000,
})
```

## Route Options

```typescript
// Route with path parameters
router.get('/users/{id}', (req) => {
  const { id } = req.params
  return Response.json({ id })
})

// Named routes
router.get('/users/{id}', getUserHandler, 'api', 'users.show')

// Generate URL for named route
const url = router.route('users.show', { id: '123' })
```

## Middleware

```typescript
import { BunRouter, cors, jsonBody } from 'bun-router'

const router = new BunRouter()

// Use middleware globally
router.use(jsonBody())
router.use(cors())

// Or apply to a group of routes
router.group({
  prefix: '/api',
  middleware: [jsonBody(), cors()]
}, () => {
  router.get('/users', () => Response.json({ users: [] }))
})
```

### Built-in Middleware

- **Cors** - Handles Cross-Origin Resource Sharing
- **JsonBody** - Parses JSON request bodies into `req.jsonBody`
- **RequestId** - Adds unique IDs to requests with `X-Request-ID` header
- **Session** - Provides session management with `req.session`
- **Csrf** - Protects against cross-site request forgery
- **Auth** - Basic authentication middleware

### Creating Custom Middleware

```typescript
import { EnhancedRequest, MiddlewareHandler, NextFunction } from 'bun-router'

class LoggerMiddleware {
  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    console.log(`${req.method} ${req.url}`)
    return next()
  }
}

// Use custom middleware
router.use(new LoggerMiddleware())
```

## WebSocket Support

bun-router provides seamless integration with Bun's high-performance WebSocket capabilities:

```typescript
import type { ServerWebSocket } from 'bun'
import { BunRouter } from 'bun-router'

// Define data type for WebSocket clients
interface ClientData {
  userId: string
  room: string
}

// Create a router
const router = new BunRouter<ClientData>() // Type-safe WebSockets

// Add a regular HTTP route
router.get('/', () => new Response('WebSocket Server'))

// Configure WebSocket handling
router.websocket({
  // Handle new connections
  open(ws) {
    console.log('Client connected from:', ws.remoteAddress)

    // Set client data (available in all handlers as ws.data)
    ws.data = { userId: 'user_123', room: 'general' }

    // Subscribe to topics for pub/sub messaging
    ws.subscribe('general')
    ws.send('Welcome to the server!')
  },

  // Handle incoming messages
  message(ws, message) {
    // Handle different message types (string, ArrayBuffer, Uint8Array)
    const content = typeof message === 'string' ? message : 'Binary data received'
    console.log(`Received from ${ws.data.userId}: ${content}`)

    // Send response and check for backpressure
    const sendResult = ws.send(`Echo: ${content}`)

    if (sendResult === -1) {
      console.log('Backpressure detected, message queued')
    }
    else if (sendResult === 0) {
      console.log('Send failed, connection may be closed')
    }
    else {
      console.log(`Sent ${sendResult} bytes`)
    }

    // Broadcast to all subscribers of a topic (except sender)
    router.publish('general', `${ws.data.userId}: ${content}`)
  },

  // Handle disconnections
  close(ws, code, reason) {
    console.log(`Client ${ws.data.userId} disconnected: ${reason || 'No reason'} (${code})`)
    ws.unsubscribe('general')
  },

  // Handle errors
  error(ws, error) {
    console.error(`Error for client ${ws.data.userId}:`, error)
  },

  // Handle backpressure relief
  drain(ws) {
    console.log(`Backpressure relieved for ${ws.data.userId}, socket ready for more data`)
  },

  // Advanced configuration options
  maxPayloadLength: 16 * 1024 * 1024, // 16MB max message size (default)
  idleTimeout: 120, // 2 minutes (default)
  backpressureLimit: 1024 * 1024, // 1MB (default)
  closeOnBackpressureLimit: false, // Don't close on backpressure limit (default)

  // Enable per-message compression
  perMessageDeflate: {
    compress: '16KB', // Use 16KB compression level
    decompress: true
  },

  sendPings: true, // Send ping frames to keep connection alive (default)
  publishToSelf: false // Don't send published messages to publisher (default)
})

// Start the server
router.serve({ port: 3000 })
```

### WebSocket Utility Methods

The router provides utility methods for working with WebSockets:

```typescript
// Publish a message to all subscribers of a topic
// Returns: Number of bytes sent (or negative on error)
const result = router.publish('room-123', JSON.stringify({
  type: 'message',
  text: 'Hello!'
}), true) // Optional: enable compression

// Get the number of subscribers for a topic
const count = router.subscriberCount('room-123')

// Upgrade an HTTP request to a WebSocket connection
router.get('/custom-upgrade', (req) => {
  const success = router.upgrade(req, {
    // Optional custom headers for the 101 Switching Protocols response
    headers: { 'X-Custom-Header': 'value' },

    // Custom data to attach to the WebSocket
    data: {
      userId: '123',
      authenticated: true,
      permissions: ['read', 'write']
    }
  })

  if (!success) {
    return new Response('Failed to upgrade connection', { status: 400 })
  }

  // If upgrade is successful, this response is ignored
  return new Response('Upgraded to WebSocket')
})

// Get client IP address
router.get('/ip', (req) => {
  const ip = router.requestIP(req)
  return Response.json(ip)
})

// Set custom timeout for a request
router.get('/long-operation', (req) => {
  // Extend timeout to 5 minutes for this specific request
  router.timeout(req, 300)

  // Perform long operation...
  return new Response('Operation completed')
})
```

### WebSocket Patterns

Here are some common patterns for working with WebSockets:

#### JSON Communication

```typescript
// Client-side
const ws = new WebSocket('ws://localhost:3000/ws')
ws.send(JSON.stringify({ type: 'login', userId: '123' }))

// Server-side
router.websocket({
  message(ws, message) {
    try {
      const data = JSON.parse(message.toString())

      switch (data.type) {
        case 'login':
          handleLogin(ws, data.userId)
          break
        case 'message':
          handleMessage(ws, data)
          break
      }
    }
    catch (e) {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }))
    }
  }
})
```

#### Room-Based Chat

```typescript
router.websocket({
  open(ws) {
    ws.data = { userId: generateId(), room: 'lobby' }
    ws.subscribe('lobby')
    broadcastToRoom('lobby', `${ws.data.userId} joined the lobby`)
  },

  message(ws, message) {
    const text = message.toString()

    if (text.startsWith('/join ')) {
      const newRoom = text.slice(6).trim()

      // Leave current room
      const oldRoom = ws.data.room
      ws.unsubscribe(oldRoom)
      broadcastToRoom(oldRoom, `${ws.data.userId} left the room`)

      // Join new room
      ws.data.room = newRoom
      ws.subscribe(newRoom)
      broadcastToRoom(newRoom, `${ws.data.userId} joined the room`)

      ws.send(`You joined ${newRoom}`)
    }
    else {
      // Regular message
      broadcastToRoom(ws.data.room, `${ws.data.userId}: ${text}`)
    }
  }
})

function broadcastToRoom(room, message) {
  router.publish(room, message)
}
```

#### Handling Backpressure

```typescript
router.websocket({
  message(ws, message) {
    // Send a large response
    const largeData = generateLargeResponse()
    const result = ws.send(largeData)

    if (result === -1) {
      // Message was queued due to backpressure
      console.log('Backpressure detected, will process more in drain event')

      // Store state to resume in drain handler
      ws.data.pendingOperations = [/* ...operations to complete */]
    }
  },

  drain(ws) {
    // Socket is ready to receive more data
    if (ws.data.pendingOperations?.length) {
      const nextOp = ws.data.pendingOperations.shift()
      processOperation(ws, nextOp)
    }
  }
})
```

## Bun-Native Features

bun-router fully integrates with Bun's native `Bun.serve()` API, leveraging the latest Bun features for optimal performance.

### Static Responses

Define static routes without handler functions for optimal performance:

```typescript
router.get('/health', () => new Response('OK'))
router.get('/ready', () => new Response('Ready', {
  headers: { 'X-Ready': '1' }
}))

// These are automatically optimized to Bun's static routes internally
```

### Method-Specific Handlers

The router automatically organizes multiple methods for the same path into Bun's method-specific handlers:

```typescript
router.get('/api/posts', getPosts)
router.post('/api/posts', createPost)
router.put('/api/posts/{id}', updatePost)
router.delete('/api/posts/{id}', deletePost)

// These will be organized into a more efficient format:
// '/api/posts': {
//   GET: getPosts,
//   POST: createPost
// },
// '/api/posts/{id}': {
//   PUT: updatePost,
//   DELETE: deletePost
// }
```

### Hot Reloading

Update routes without restarting the server:

```typescript
// Initial setup
const router = new BunRouter()
router.get('/api/version', () => Response.json({ version: '1.0.0' }))
const server = await router.serve({ port: 3000 })

// Later, update routes without downtime
router.get('/api/version', () => Response.json({ version: '2.0.0' }))
await router.reload()
```

### Error Handling

Add a global error handler for all routes:

```typescript
router.onError((error) => {
  console.error(error)
  return new Response(`Server Error: ${error.message}`, {
    status: 500,
    headers: { 'Content-Type': 'text/plain' }
  })
})

// Define a route that might throw an error
router.get('/api/risky', () => {
  throw new Error('Something went wrong')
})

// Serve with the error handler
router.serve({ port: 3000 })
```

### Type-Safe Route Parameters

TypeScript automatically infers parameter types from route paths:

```typescript
router.get('/orgs/{orgId}/repos/{repoId}', (req) => {
  // TypeScript knows the shape of req.params
  const { orgId, repoId } = req.params
  return Response.json({ orgId, repoId })
})
```

### Cookie Handling

Built-in support for working with cookies:

```typescript
router.get('/profile', (req) => {
  // Read cookies
  const userId = req.cookies.get('user_id')
  const theme = req.cookies.get('theme') || 'light'

  return Response.json({ userId, theme })
})

router.get('/login', (req) => {
  // Set cookies
  req.cookies.set('user_id', '12345', {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24 // 1 day
  })

  return new Response('Logged in')
})

router.get('/logout', (req) => {
  // Delete cookies
  req.cookies.delete('user_id')
  return new Response('Logged out')
})
```

### File Streaming

Easily stream files with range support:

```typescript
router.get('/files/{filename}', async (req) => {
  const filename = req.params.filename
  const path = `./uploads/${filename}`

  // Simple file streaming
  return router.streamFile(path, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
})

// With range support for video/audio streaming
router.get('/videos/{id}', async (req) => {
  const videoPath = `./videos/${req.params.id}.mp4`
  return router.streamFileWithRanges(videoPath, req)
})
```

## Route Groups

```typescript
router.group({
  prefix: '/api',
  middleware: [jsonBody()]
}, () => {
  router.get('/users', getUsersHandler)
  router.post('/users', createUserHandler)
})
```

## Parameter Constraints

```typescript
router.get('/users/{id}', getUserHandler)
  .whereNumber('id')

router.get('/categories/{slug}', getCategoryHandler)
  .whereAlpha('slug')

// Available constraints
router.whereNumber('id')
router.whereAlpha('name')
router.whereAlphaNumeric('username')
router.whereUuid('id')
router.whereIn('status', ['active', 'pending'])
```

## RESTful Resources

```typescript
// Creates all RESTful routes for 'posts'
router.resource('posts', 'PostsController')

// Equivalent to:
router.get('/posts', 'PostsController/index')
router.get('/posts/{id}', 'PostsController/show')
router.post('/posts', 'PostsController/store')
router.put('/posts/{id}', 'PostsController/update')
router.delete('/posts/{id}', 'PostsController/destroy')
```

## Redirects

```typescript
router.redirectRoute('/old-path', '/new-path')
router.permanentRedirectRoute('/very-old-path', '/new-path')
```

## Domain Routing

```typescript
router.domain('{account}.example.com', () => {
  router.get('/', (req) => {
    const account = req.params.account
    return new Response(`Welcome to ${account}'s subdomain!`)
  })
})
```

## Configuration

```typescript
const router = new BunRouter({
  verbose: true,
  apiPrefix: '/api/v1',
  defaultMiddleware: {
    api: ['Middleware/Cors', 'Middleware/JsonBody'],
    web: ['Middleware/Session', 'Middleware/Csrf']
  }
})
```

## Changelog

Please see our [releases](https://github.com/stackjs/bun-router/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/bun-router/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

"Software that is free, but hopes for a postcard." We love receiving postcards from around the world showing where Stacks is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/bun-router?style=flat-square
[npm-version-href]: https://npmjs.com/package/bun-router
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/bun-router/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/bun-router/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/bun-router/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/bun-router -->
