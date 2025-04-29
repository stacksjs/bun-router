# Performance Optimization

Optimizing your bun-router application is essential for delivering a fast, responsive experience to your users. This guide covers strategies to improve the performance of your application.

## Leveraging Bun's Speed

Bun is designed to be fast by default. To maximize performance:

1. **Use the latest Bun version**: Bun regularly receives performance improvements with each release
2. **Understand Bun's compiler optimizations**: Bun optimizes your code during compilation
3. **Leverage Bun's built-in features**: Use Bun's native APIs whenever possible instead of third-party libraries

## Route Organization for Better Performance

How you organize your routes can significantly impact performance:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Organize routes from most specific to most general
// Frequently accessed routes should be defined first
router.get('/api/products/:id', getProductHandler) // Specific route
router.get('/api/products', getProductsHandler)
router.get('/api/categories/:id/products', getCategoryProductsHandler)

// Catch-all route should be defined last
router.get('*', notFoundHandler)
```

## Middleware Optimization

Middleware can introduce performance bottlenecks if not implemented carefully:

```typescript
// Inefficient middleware - runs on every request
router.use(async (req, next) => {
  // Expensive operation on every request
  const data = await fetchDataFromDatabase()
  req.data = data
  return next(req)
})

// More efficient - conditional execution
router.use((req, next) => {
  // Only perform expensive operations when necessary
  if (req.url.startsWith('/api/admin') && !req.adminData) {
    // Expensive operation only for admin routes
    req.adminData = fetchAdminData()
  }
  return next(req)
})

// Best - targeted middleware for specific routes
router.group({
  prefix: '/api/admin',
  middleware: [adminDataMiddleware]
}, () => {
  router.get('/stats', adminStatsHandler)
  router.get('/users', adminUsersHandler)
})
```

## Caching Strategies

Implement caching to reduce response times:

```typescript
import { redis } from 'bun'

// Route with caching
router.get('/api/products', async (req) => {
  const cacheKey = 'products-list'

  // Try to get data from cache
  const cachedData = await redis.get(cacheKey)
  if (cachedData) {
    return Response.json(JSON.parse(cachedData))
  }

  // If not in cache, fetch from database
  const products = await db.products.findMany()

  // Store in cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(products), 'EX', 300)

  return Response.json(products)
})

// Cache middleware for reusability
function cacheMiddleware(keyPrefix, ttlSeconds = 300) {
  return async (req, next) => {
    const cacheKey = `${keyPrefix}:${req.url}`

    // Check cache first
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return Response.json(JSON.parse(cachedData))
    }

    // Process request if not in cache
    const response = await next(req)

    // Only cache successful responses
    if (response.status >= 200 && response.status < 300) {
      const responseBody = await response.json()
      await redis.set(cacheKey, JSON.stringify(responseBody), 'EX', ttlSeconds)

      // Return a new response since we already consumed the original
      return Response.json(responseBody)
    }

    return response
  }
}

// Apply cache to specific routes
router.get('/api/categories', cacheMiddleware('categories', 600), getCategoriesHandler)
```

## Response Optimization

Optimize your responses for faster delivery:

```typescript
// Inefficient - returning large payload
router.get('/api/users', async (req) => {
  const users = await db.users.findMany({
    include: { posts: true, comments: true, profile: true }
  })
  return Response.json(users) // Large, potentially unused data
})

// More efficient - pagination
router.get('/api/users', async (req) => {
  const page = parseInt(req.query.page || '1')
  const limit = parseInt(req.query.limit || '10')

  const users = await db.users.findMany({
    skip: (page - 1) * limit,
    take: limit,
    select: { id: true, name: true, email: true } // Only necessary fields
  })

  return Response.json({
    users,
    page,
    limit,
    hasMore: users.length === limit
  })
})

// Best - optimized with projection based on client needs
router.get('/api/users', async (req) => {
  const page = parseInt(req.query.page || '1')
  const limit = parseInt(req.query.limit || '10')

  // Allow clients to request only needed fields
  const fields = req.query.fields ? req.query.fields.split(',') : ['id', 'name', 'email']

  // Convert fields array to selection object
  const select = fields.reduce((acc, field) => ({ ...acc, [field]: true }), {})

  const users = await db.users.findMany({
    skip: (page - 1) * limit,
    take: limit,
    select
  })

  return Response.json({
    users,
    page,
    limit,
    hasMore: users.length === limit
  })
})
```

## Database Query Optimization

Optimize database interactions:

```typescript
// Inefficient database query
router.get('/api/products/:id', async (req) => {
  const { id } = req.params

  // N+1 query problem
  const product = await db.products.findUnique({ where: { id } })
  const category = await db.categories.findUnique({ where: { id: product.categoryId } })
  const relatedProducts = await db.products.findMany({
    where: { categoryId: product.categoryId },
    take: 5
  })

  return Response.json({
    product,
    category,
    relatedProducts
  })
})

// More efficient - combining queries
router.get('/api/products/:id', async (req) => {
  const { id } = req.params

  // Single query with joins/includes
  const product = await db.products.findUnique({
    where: { id },
    include: {
      category: true,
      relatedProducts: {
        take: 5,
        where: {
          id: { not: id } // Exclude current product
        }
      }
    }
  })

  return Response.json(product)
})
```

## Compression

Enable compression to reduce payload sizes:

```typescript
import { gzip, gunzip } from 'bun'

// Compression middleware
function compressionMiddleware(req, next) {
  return next(req).then(async (response) => {
    // Check if client accepts gzip
    if (req.headers.get('accept-encoding')?.includes('gzip')) {
      const body = await response.arrayBuffer()
      const compressed = gzip(body)

      // Create a new response with compressed body
      return new Response(compressed, {
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'content-encoding': 'gzip',
          'content-length': compressed.length.toString()
        },
        status: response.status,
        statusText: response.statusText
      })
    }

    return response
  })
}

// Apply compression globally
router.use(compressionMiddleware)
```

## Static Asset Optimization

Serve static assets efficiently:

```typescript
import { file } from 'bun'

// Inefficient - reading file on each request
router.get('/logo.png', async () => {
  const data = await file('public/logo.png').arrayBuffer()
  return new Response(data, {
    headers: { 'content-type': 'image/png' }
  })
})

// More efficient - caching file data in memory
const STATIC_FILES = new Map()

async function getStaticFile(path) {
  if (!STATIC_FILES.has(path)) {
    const f = file(path)
    const data = await f.arrayBuffer()
    const type = f.type

    STATIC_FILES.set(path, {
      data,
      type,
      lastModified: new Date().toUTCString()
    })
  }

  return STATIC_FILES.get(path)
}

router.get('/logo.png', async (req) => {
  const { data, type, lastModified } = await getStaticFile('public/logo.png')

  // Return cached file with proper headers
  return new Response(data, {
    headers: {
      'content-type': type,
      'cache-control': 'max-age=86400',
      'last-modified': lastModified
    }
  })
})

// Best - using Bun's built-in static file serving
router.get('/static/*', async (req) => {
  const path = new URL(req.url).pathname.replace('/static/', '')
  const f = file(`public/${path}`)

  if (await f.exists()) {
    return new Response(f, {
      headers: {
        'cache-control': 'max-age=86400'
      }
    })
  }

  return new Response('Not found', { status: 404 })
})
```

## Server-Sent Events for Real-Time Updates

Use Server-Sent Events for efficient real-time updates:

```typescript
// Server-Sent Events endpoint
router.get('/api/updates', async (req) => {
  const encoder = new TextEncoder()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Function to send updates
      const sendUpdate = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Send initial data
      sendUpdate({ type: 'connected', time: new Date().toISOString() })

      // Set up event listener for new data
      const interval = setInterval(() => {
        sendUpdate({ type: 'update', time: new Date().toISOString() })
      }, 5000)

      // Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
})
```

## HTTP/2 and HTTP/3 Support

Leverage modern HTTP protocols:

```typescript
import { createSecureServer } from 'node:https'
import { readFileSync } from 'node:fs'

// HTTP/2 server setup with Bun router
const serverOptions = {
  cert: readFileSync('path/to/cert.pem'),
  key: readFileSync('path/to/key.pem'),
  allowHTTP1: true, // For backward compatibility
  http2: true
}

const router = new Router()
// Define your routes...

const server = createSecureServer(serverOptions, (req, res) => {
  // Handle the request with your router
  router.handle(req, res)
})

server.listen(3000, () => {
  console.log('HTTP/2 server running on port 3000')
})
```

## Load Testing and Benchmarking

Regularly test your application's performance:

```typescript
// Using the built-in Bun benchmarking tools
import { bench } from 'bun:bench'

bench('GET /api/products', async () => {
  const response = await fetch('http://localhost:3000/api/products')
  return response.status === 200
})

bench('GET /api/users with pagination', async () => {
  const response = await fetch('http://localhost:3000/api/users?page=1&limit=10')
  return response.status === 200
})

bench('POST /api/orders', async () => {
  const response = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      products: [{ id: '1', quantity: 2 }],
      customer: { name: 'Test User', email: 'test@example.com' }
    })
  })
  return response.status === 201
})
```

## Memory Management

Monitor and optimize memory usage:

```typescript
// Periodic memory usage logging
setInterval(() => {
  const memoryUsage = process.memoryUsage()
  console.log({
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`, // Resident Set Size
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`, // Total size of the allocated heap
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`, // Actual memory used
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB` // Memory used by C++ objects bound to JavaScript objects
  })
}, 60000) // Log every minute
```

## WebSockets Optimization

Optimize WebSocket connections:

```typescript
// Efficient WebSocket handling
router.ws('/live-updates', {
  open(ws) {
    // Only send necessary data
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }))

    // Store minimal data in the WebSocket object
    ws.data = {
      connectedAt: Date.now(),
      lastActivity: Date.now()
    }
  },
  message(ws, message) {
    // Update last activity timestamp
    ws.data.lastActivity = Date.now()

    // Parse once
    const data = JSON.parse(message)

    // Process different message types efficiently
    switch (data.type) {
      case 'subscribe':
        handleSubscription(ws, data.channels)
        break
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }))
        break
      default:
        processMessage(ws, data)
    }
  },
  close(ws) {
    // Clean up any resources
    cleanupResources(ws)
  }
})

// Periodic cleanup of inactive connections
setInterval(() => {
  for (const ws of router.webSocketClients) {
    // Close connections inactive for more than 10 minutes
    if (Date.now() - ws.data.lastActivity > 600000) {
      ws.close(1000, 'Connection timeout due to inactivity')
    }
  }
}, 60000) // Check every minute
```

## Parallel Processing

Use parallel processing for CPU-intensive tasks:

```typescript
import { spawn } from 'bun'

router.post('/process-data', async (req) => {
  const data = await req.json()

  // Spawn a separate process for CPU-intensive work
  const worker = spawn({
    cmd: ['bun', 'run', 'worker.js'],
    stdin: 'pipe',
    stdout: 'pipe'
  })

  // Send data to worker
  worker.stdin.write(JSON.stringify(data))
  worker.stdin.end()

  // Get result from worker
  const result = await new Response(worker.stdout).json()

  return Response.json(result)
})

// worker.js
const data = await new Response(Bun.stdin).json()
const result = processData(data) // CPU-intensive function
console.log(JSON.stringify(result))
```

## Performance Profiling

Profile your application to identify bottlenecks:

```typescript
// Basic request timing middleware
function requestTimingMiddleware(req, next) {
  const start = performance.now()

  return next(req).then(response => {
    const duration = performance.now() - start
    console.log(`${req.method} ${req.url} completed in ${duration.toFixed(2)}ms`)

    // Add timing header
    response.headers.set('Server-Timing', `total;dur=${duration.toFixed(2)}`)

    return response
  })
}

router.use(requestTimingMiddleware)
```

## Best Practices

Follow these best practices for optimal performance:

1. **Minimize middleware usage**: Only use middleware when necessary
2. **Use appropriate caching**: Cache responses that don't change frequently
3. **Optimize database queries**: Avoid N+1 queries and fetch only needed data
4. **Implement pagination**: Break large datasets into manageable chunks
5. **Compress responses**: Use compression for large responses
6. **Use HTTP/2 or HTTP/3**: Take advantage of modern HTTP features
7. **Load test your application**: Regularly benchmark to identify bottlenecks
8. **Profile and monitor**: Use performance monitoring tools to track metrics
9. **Optimize static assets**: Serve static files efficiently with proper caching
10. **Use Server-Sent Events or WebSockets appropriately**: Choose the right technology for real-time updates

## Next Steps

Now that you've learned about performance optimization in bun-router, explore these related topics:

- [Error Handling](/advanced/error-handling) - Learn about handling errors efficiently
- [Custom Middleware](/advanced/custom-middleware) - Create optimized middleware
- [Websockets](/features/websockets) - Implement efficient real-time communication
