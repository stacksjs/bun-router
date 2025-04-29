import { Router } from '../../src'
import type { EnhancedRequest } from '../../src/types'

/**
 * Example of using bun-router with Bun's native router features
 */

// Create a router instance
const router: Router = new Router()

// Static response route
router.get('/api/status', () => new Response('OK'))
router.get('/ready', () => new Response('Ready', {
  headers: {
    'Content-Type': 'text/plain',
    'X-Ready': '1'
  }
}))

// Method-specific handlers for the same path
router.get('/api/posts', () => {
  return Response.json({ posts: [{ id: 1, title: 'Hello World' }] })
})

router.post('/api/posts', async (req) => {
  const post = await req.json()
  return Response.json({ created: true, post }, { status: 201 })
})

router.put('/api/posts/{id}', (req) => {
  return Response.json({ updated: true, id: req.params.id })
})

router.delete('/api/posts/{id}', (req) => {
  return Response.json({ deleted: true, id: req.params.id })
})

// Dynamic routes with parameters
router.get('/api/users/{id}', (req) => {
  return Response.json({ user: { id: req.params.id, name: 'John Doe' } })
})

// Wildcard route
router.get('/api/*', () => {
  return Response.json({ error: 'Route not found' }, { status: 404 })
})

// Define a route that might throw an error
router.get('/api/error', () => {
  throw new Error('Something went wrong')
})

// Register an error handler
router.onError((error) => {
  console.error('Error handled:', error.message)
  return Response.json({
    error: 'Internal Server Error',
    message: error.message
  }, { status: 500 })
})

// Health check route
router.health()

// Cookie handling example
router.get('/auth/login', (req: EnhancedRequest) => {
  // Set session cookie
  req.cookies.set('session_id', crypto.randomUUID(), {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24, // 1 day
    path: '/'
  })

  return new Response('Logged in successfully')
})

router.get('/auth/status', (req: EnhancedRequest) => {
  const sessionId = req.cookies.get('session_id')

  if (!sessionId) {
    return Response.json({ authenticated: false })
  }

  return Response.json({
    authenticated: true,
    sessionId
  })
})

router.get('/auth/logout', (req: EnhancedRequest) => {
  req.cookies.delete('session_id', { path: '/' })
  return new Response('Logged out successfully')
})

// Start the server with Hot Reload support
async function startServer(): Promise<void> {
  console.log('Starting server...')
  const server = await router.serve({
    port: 3000,
    development: true
  })

  console.log(`Server running at ${server.url}`)

  // For demonstration, reload the routes after a delay
  setTimeout(async () => {
    console.log('Updating routes without restart...')

    // Add a new route
    router.get('/api/version', () => {
      return Response.json({ version: '2.0.0', updatedAt: new Date().toISOString() })
    })

    // Update existing route
    router.get('/api/status', () => new Response('OK - Updated'))

    // Apply changes without restarting
    await router.reload()

    console.log('Routes updated!')
  }, 5000)
}

startServer().catch(console.error)

// Export the router instance for potential use elsewhere
export default router
