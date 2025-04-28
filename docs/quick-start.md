# Quick Start

This guide will help you get up and running with bun-router quickly. We'll create a simple API with multiple routes, parameters, and middleware.

## Basic Setup

First, make sure you have bun-router installed:

```bash
bun add bun-router
```

Create a new file called `server.ts` in your project:

```typescript
import { BunRouter } from 'bun-router'

// Create a new router
const router = new BunRouter()

// Define a basic route
router.get('/', () => {
  return new Response('Welcome to my API!')
})

// Start the server
router.serve({
  port: 3000,
})

console.log('Server running at http://localhost:3000')
```

Run the server with Bun:

```bash
bun run server.ts
```

Visit `http://localhost:3000` in your browser to see "Welcome to my API!".

## Adding More Routes

Let's add more routes to our API:

```typescript
import { BunRouter } from 'bun-router'

const router = new BunRouter()

// Home route
router.get('/', () => {
  return new Response('Welcome to my API!')
})

// JSON response
router.get('/api/info', () => {
  return Response.json({
    name: 'My API',
    version: '1.0.0',
    status: 'running',
  })
})

// Different HTTP methods
router.post('/api/echo', async (req) => {
  const data = await req.json()
  return Response.json(data)
})

router.serve({ port: 3000 })
```

## Route Parameters

Routes can have parameters that are automatically parsed and available in the `req.params` object:

```typescript
// Route with parameters
router.get('/users/{id}', (req) => {
  const { id } = req.params
  return Response.json({ userId: id })
})

// Multiple parameters
router.get('/posts/{postId}/comments/{commentId}', (req) => {
  const { postId, commentId } = req.params
  return Response.json({ postId, commentId })
})
```

You can add constraints to parameters:

```typescript
// Only match if id is a number
router.get('/users/{id}', (req) => {
  return Response.json({ userId: req.params.id })
}).whereNumber('id')

// Only match if username is alphanumeric
router.get('/users/by-username/{username}', (req) => {
  return Response.json({ username: req.params.username })
}).whereAlphaNumeric('username')
```

## Using Middleware

Middleware allows you to process requests before they reach your route handlers:

```typescript
import { BunRouter, jsonBody } from 'bun-router'

const router = new BunRouter()

// Apply middleware globally
router.use(jsonBody())

// Now all routes can access req.jsonBody
router.post('/api/users', (req) => {
  const user = req.jsonBody
  // ...process user data
  return Response.json({ message: 'User created', user })
})
```

## Route Groups

Group related routes together:

```typescript
router.group({
  prefix: '/api',
}, () => {
  router.get('/users', () => Response.json({ users: [] }))
  router.get('/posts', () => Response.json({ posts: [] }))

  // Nested group
  router.group({
    prefix: '/admin',
    middleware: [authMiddleware], // Apply middleware to group
  }, () => {
    router.get('/stats', () => Response.json({ stats: {} }))
    router.get('/users', () => Response.json({ adminUsers: [] }))
  })
})
```

## Named Routes

Name your routes to generate URLs later:

```typescript
router.get('/users/{id}', getUserHandler, 'users.show')

// Generate URL from named route
const url = router.route('users.show', { id: '123' }) // '/users/123'
```

## Next Steps

This quick start guide covers the basics of bun-router. For more detailed information, check out:

- [Routing Basics](/features/routing-basics)
- [Middleware](/features/middleware)
- [WebSockets](/features/websockets)
- [Route Groups](/features/route-groups)
