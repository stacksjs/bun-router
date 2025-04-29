import { Router } from '../../src/router'
import { LoggerMiddleware } from './LoggerMiddleware'
import { ExampleMiddleware } from './ExampleMiddleware'

/**
 * Example demonstrating Laravel-style middleware for Bun Router
 */
async function main() {
  // Create a new router instance
  const router = new Router()

  // Create middleware instances
  const logger = new LoggerMiddleware()
  const example = new ExampleMiddleware()

  // Method 1: Laravel-style middleware passed as parameter
  // This is similar to how Laravel allows middleware to be added directly to routes
  await router.get('/with-middleware', (req) => {
    return new Response('Route with middleware parameter')
  }, 'web', 'with.middleware', [logger.handle])

  // Method 2: Fluid middleware API
  // This is similar to Laravel's fluent API
  const fluidRoute = await router.get('/fluid-middleware', (req) => {
    return new Response('Route with fluid middleware API')
  })
  fluidRoute.middleware(example.handle)

  // Method 3: Multiple middleware with combined approaches
  const route = await router.post('/multiple-middleware', (req) => {
    return new Response('Route with multiple middleware')
  }, 'api')

  // Add multiple middleware using the fluid API
  route.middleware(
    logger.handle,
    example.handle
  )

  // Example with Route Group middleware + route-specific middleware
  await router.group({
    prefix: '/admin',
    middleware: [logger.handle]
  }, async () => {
    // Group middleware applies to all routes in this group

    // You can still add route-specific middleware
    await router.get('/settings', (req) => {
      return new Response('Admin settings')
    }, 'web', 'admin.settings', [example.handle])

    // Or use the fluid API within the group
    const dashboardRoute = await router.get('/dashboard', (req) => {
      return new Response('Admin dashboard')
    })
    dashboardRoute.middleware(example.handle)
  })

  // Start the server
  console.log('Starting server with middleware examples...')
  console.log('Available routes:')
  console.log('  - GET /with-middleware (Laravel-style middleware parameter)')
  console.log('  - GET /fluid-middleware (Fluid middleware API)')
  console.log('  - POST /multiple-middleware (Multiple middleware)')
  console.log('  - GET /admin/settings (Group + route-specific middleware)')
  console.log('  - GET /admin/dashboard (Group + fluid middleware)')

  await router.serve({ port: 3000 })
  console.log('Server started on http://localhost:3000')
}

// Run the example
main().catch(console.error)