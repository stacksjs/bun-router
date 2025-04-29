import { Router } from '../../src'
import type { RouteDefinition, EnhancedRequest } from '../../src/types'

// Create a router instance
const router: Router = new Router()

// Add the blog route
router.view('/blog-example', {
  title: "Bun Router Blog",
  posts: [
    {
      title: "Getting Started with Bun Router",
      slug: "getting-started-with-bun-router",
      date: "May 15, 2023",
      author: "Bun Team",
      excerpt: "Learn how to set up and use Bun Router in your web applications with this comprehensive guide.",
      tags: ["Tutorial", "Beginners"]
    },
    {
      title: "Advanced Routing Techniques",
      slug: "advanced-routing-techniques",
      date: "June 2, 2023",
      author: "Jane Developer",
      excerpt: "Discover advanced routing patterns and optimization strategies for your Bun applications.",
      tags: ["Advanced", "Performance"]
    },
    {
      title: "Working with Middleware",
      slug: "working-with-middleware",
      date: "June 18, 2023",
      author: "Alex Coder",
      excerpt: "Learn how to create and integrate middleware functions to enhance your routing capabilities.",
      tags: ["Middleware", "Tutorial"]
    },
    {
      title: "Template Rendering in Bun Router",
      slug: "template-rendering-in-bun-router",
      date: "July 5, 2023",
      author: "Sam Designer",
      excerpt: "Explore the different template options available in Bun Router and how to use them effectively.",
      tags: ["Templates", "Frontend"]
    }
  ]
})

export default router
