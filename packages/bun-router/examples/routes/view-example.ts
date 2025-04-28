import { BunRouter } from '../../src'

// Create a router
const router: BunRouter = new BunRouter({
  // Configure view system
  views: {
    viewsPath: 'resources/views',
    extensions: ['.html', '.stx'],
    defaultLayout: 'layouts/main',
    cache: false,
    engine: 'auto'
  }
})

// Set up routes

// Basic view rendering
router.view('/', 'home', {
  title: 'Home Page',
  description: 'Welcome to the home page',
  features: [
    { name: 'Fast Routing', description: 'High-performance routing system' },
    { name: 'Template Support', description: 'Built-in HTML and STX template support' },
    { name: 'WebSocket Support', description: 'Seamless WebSocket integration' }
  ]
})

// View with custom layout
router.view('/about', 'about', {
  title: 'About Us',
  team: [
    { name: 'Alice', role: 'Developer' },
    { name: 'Bob', role: 'Designer' },
    { name: 'Charlie', role: 'Project Manager' }
  ]
}, { layout: 'layouts/alternate' })

// View with custom status and headers
router.view('/status', 'status', {
  status: 'operational',
  services: {
    api: 'online',
    database: 'online',
    cache: 'degraded'
  }
}, {
  status: 202,
  headers: {
    'X-Custom-Header': 'CustomValue',
    'Cache-Control': 'no-store'
  }
})

// Dynamic view with parameters
router.get('/blog/{post}', async (req) => {
  const postId = req.params.post

  // In a real app, you would fetch the post from a database
  const post = {
    id: postId,
    title: `Blog Post ${postId}`,
    content: 'This is a sample blog post content.',
    author: 'John Doe',
    date: new Date().toLocaleDateString()
  }

  try {
    // Render a view with layout
    const content = await router.renderView('blog-post', post, { layout: 'layouts/blog' })

    return new Response(content, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error) {
    console.error('Error rendering blog post:', error)
    return new Response('Post not found', { status: 404 })
  }
})

// Error handling example
router.view('/error', 'non-existent-view', {})

// STX template example
router.view('/stx-example', 'stx-example', {
  user: {
    name: 'Alice Johnson',
    admin: true,
    permissions: [
      { name: 'Read', enabled: true },
      { name: 'Write', enabled: true },
      { name: 'Delete', enabled: false },
      { name: 'Admin', enabled: true }
    ]
  }
})

// Start the server
async function startServer() {
  console.log('Starting view example server...')

  const server = await router.serve({
    port: 3003,
    development: true
  })

  console.log(`View example server running at ${server.url}`)
}

startServer().catch(console.error)

export default router