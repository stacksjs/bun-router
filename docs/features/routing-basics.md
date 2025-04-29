# Routing Basics

Routing is the core functionality of bun-router. This page covers the basics of defining routes and handling HTTP requests.

## Defining Routes

Routes in `bun-router` follow a simple pattern: HTTP method + path + handler function.

```typescript
import { Router } from 'bun-router'

const router = new Router()

router.get('/hello', () => {
  return new Response('Hello, World!')
})
```

## HTTP Methods

bun-router supports all standard HTTP methods:

```typescript
// GET request
router.get('/users', getUsersHandler)

// POST request
router.post('/users', createUserHandler)

// PUT request
router.put('/users/{id}', updateUserHandler)

// PATCH request
router.patch('/users/{id}', partialUpdateHandler)

// DELETE request
router.delete('/users/{id}', deleteUserHandler)

// OPTIONS request
router.options('/users', optionsHandler)

// HEAD request
router.head('/users', headHandler)
```

You can also define a route that responds to multiple HTTP methods:

```typescript
router.match(['GET', 'POST'], '/multi', (req) => {
  if (req.method === 'GET')
    return new Response('This is a GET request')
  else
    return new Response('This is a POST request')
})
```

## Route Handlers

Route handlers are functions that process incoming requests and return responses. They always receive a request object as their first parameter:

```typescript
router.get('/users', (req) => {
  // req is an enhanced Request object
  console.log(req.url, req.method)

  // Return a Response
  return Response.json({ users: [] })
})
```

The handler function can be synchronous or asynchronous:

```typescript
router.get('/async-data', async (req) => {
  // Perform some async operation
  const data = await fetchDataFromDatabase()
  return Response.json(data)
})
```

## Response Types

bun-router accepts any valid Response object as the return value from a route handler:

```typescript
// Simple text response
router.get('/hello', () => {
  return new Response('Hello, World!')
})

// JSON response
router.get('/api/data', () => {
  return Response.json({
    message: 'Success',
    data: { foo: 'bar' }
  })
})

// HTML response
router.get('/html', () => {
  return new Response('<h1>Hello, World!</h1>', {
    headers: {
      'Content-Type': 'text/html',
    },
  })
})

// Custom status code
router.get('/not-found', () => {
  return new Response('Not Found', { status: 404 })
})
```

## Static Responses

For optimal performance, you can define static routes that always return the same response:

```typescript
// These are automatically optimized
router.get('/health', () => new Response('OK'))
router.get('/version', () => Response.json({ version: '1.0.0' }))
```

## Route Matching Order

Routes are matched in the order they are defined. When a request comes in, `bun-router` will try each route in order until it finds a match:

```typescript
router.get('/users/special', specialUserHandler) // Specific route first
router.get('/users/{id}', userDetailHandler) // More general route after
```

In this example, a request to `/users/special` will be handled by `specialUserHandler`, not `userDetailHandler`, because the more specific route is defined first.

## Handling 404 Not Found

If no route matches the incoming request, `bun-router` will return a 404 Not Found response. You can customize this behavior:

```typescript
// Custom 404 handler
router.setNotFoundHandler((req) => {
  return new Response(`The page at ${req.url} was not found`, {
    status: 404,
    headers: { 'Content-Type': 'text/html' },
  })
})
```

## Wildcards and Catch-All Routes

To match any path after a certain prefix, you can use the `*` wildcard:

```typescript
// Match anything under /files/
router.get('/files/*', (req) => {
  const path = req.url.split('/files/')[1]
  return new Response(`You requested the file: ${path}`)
})
```

## Starting the Server

After defining your routes, call the `serve` method to start the server:

```typescript
router.serve({
  port: 3000,
  hostname: 'localhost', // Optional, defaults to 0.0.0.0
})
```

The `serve` method accepts the same options as Bun's native `Bun.serve()` method.

## Next Steps

Now that you understand the basics of routing, check out these related topics:

- [Route Parameters](/features/route-parameters) - Learn how to capture values from URLs
- [Route Groups](/features/route-groups) - Organize routes into logical groups
- [Named Routes](/features/named-routes) - Name your routes for easier URL generation
