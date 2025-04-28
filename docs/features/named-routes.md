# Named Routes

Named routes allow you to reference routes by a name rather than their URL pattern. This is particularly useful for generating URLs in your application, especially when routes contain parameters or have complex path structures.

## Defining Named Routes

To define a named route, add a name parameter when defining the route:

```typescript
import { BunRouter } from 'bun-router'

const router = new BunRouter()

// Define a named route
router.get('/users/{id}', getUserHandler, 'users.show')
```

In this example, `'users.show'` is the name assigned to the route.

## Generating URLs for Named Routes

Once you've defined named routes, you can generate URLs for them using the `route` method:

```typescript
// Generate a URL for the 'users.show' route
const url = router.route('users.show', { id: '123' })
// Result: '/users/123'
```

The second parameter to `route` is an object containing any parameters needed to build the complete URL.

## Benefit of Named Routes

Named routes provide several benefits:

1. **Decouple URL Generation from URL Structure**: If you change the URL pattern of a route, all URL generation still works as long as the route name remains the same.

2. **Centralized URL Management**: By using named routes, you ensure consistent URL generation throughout your application.

3. **Improved Readability**: Route names can make the code more understandable by conveying the purpose of the route.

4. **Less Error-Prone**: No need to remember complex URL patterns or worry about properly encoding parameters.

## Naming Conventions

It's a good practice to adopt a consistent naming convention for your routes:

- Use dot notation to indicate hierarchies (e.g., `users.show`, `users.edit`)
- Use noun-based names for resource routes
- Use verb-action combinations for specific operations

Common naming patterns include:

| Route Purpose | Example Name |
|---------------|--------------|
| List resources | `users.index` |
| Show a resource | `users.show` |
| Create form | `users.create` |
| Store a resource | `users.store` |
| Edit form | `users.edit` |
| Update a resource | `users.update` |
| Delete a resource | `users.destroy` |

## Named Routes with Multiple Parameters

For routes with multiple parameters, provide all necessary parameters when generating the URL:

```typescript
router.get('/posts/{postId}/comments/{commentId}', getCommentHandler, 'comments.show')

// Generate URL with multiple parameters
const url = router.route('comments.show', {
  postId: '42',
  commentId: '7'
})
// Result: '/posts/42/comments/7'
```

## Named Routes with Query Parameters

You can also include query parameters when generating URLs:

```typescript
// Generate URL with route parameters and query parameters
const url = router.route('users.index', {}, {
  page: '2',
  sort: 'name',
  order: 'asc'
})
// Result: '/users?page=2&sort=name&order=asc'

// With both route parameters and query parameters
const url = router.route('users.posts', { userId: '123' }, { recent: 'true' })
// Result: '/users/123/posts?recent=true'
```

## Named Routes in Route Groups

When using route groups, you can prefix route names for all routes in the group:

```typescript
router.group({
  prefix: '/admin',
  as: 'admin.',
}, () => {
  // These routes will be named with the 'admin.' prefix
  router.get('/dashboard', getDashboardHandler, 'dashboard') // Named 'admin.dashboard'
  router.get('/users', getUsersHandler, 'users') // Named 'admin.users'
  router.get('/users/{id}', getUserHandler, 'users.show') // Named 'admin.users.show'
})

// Generate URLs using the prefixed route names
const dashboardUrl = router.route('admin.dashboard') // '/admin/dashboard'
const usersUrl = router.route('admin.users') // '/admin/users'
const userUrl = router.route('admin.users.show', { id: '123' }) // '/admin/users/123'
```

## Absolute URLs

By default, `route` generates relative URLs. To generate absolute URLs, configure a base URL in your router:

```typescript
// During router initialization
const router = new BunRouter({
  baseUrl: 'https://example.com',
})

// Or update it later
router.setBaseUrl('https://example.com')

// Now route() will generate absolute URLs
const url = router.route('users.show', { id: '123' })
// Result: 'https://example.com/users/123'
```

## Practical Example: Blog Application

Here's a more comprehensive example showing how named routes can be used in a blog application:

```typescript
import { BunRouter } from 'bun-router'

const router = new BunRouter()

// Public routes
router.get('/', getHomeHandler, 'home')
router.get('/about', getAboutHandler, 'about')
router.get('/contact', getContactHandler, 'contact')

// Blog routes
router.group({
  prefix: '/blog',
  as: 'blog.',
}, () => {
  router.get('/', getBlogIndexHandler, 'index')
  router.get('/{slug}', getBlogPostHandler, 'show')
  router.get('/category/{category}', getCategoryHandler, 'category')
  router.get('/author/{author}', getAuthorHandler, 'author')
})

// Admin routes
router.group({
  prefix: '/admin',
  as: 'admin.',
  middleware: [authMiddleware()],
}, () => {
  router.get('/dashboard', getDashboardHandler, 'dashboard')

  // Admin blog management
  router.group({
    prefix: '/blog',
    as: 'blog.',
  }, () => {
    router.get('/', getAdminBlogIndexHandler, 'index')
    router.get('/create', getCreatePostHandler, 'create')
    router.post('/store', storePostHandler, 'store')
    router.get('/{id}/edit', getEditPostHandler, 'edit')
    router.put('/{id}', updatePostHandler, 'update')
    router.delete('/{id}', deletePostHandler, 'destroy')
  })
})

// Generate URLs in your application
function generateLinks() {
  return {
    home: router.route('home'),
    about: router.route('about'),
    contact: router.route('contact'),
    blog: router.route('blog.index'),
    recentPost: router.route('blog.show', { slug: 'latest-news' }),
    techCategory: router.route('blog.category', { category: 'technology' }),
    adminDashboard: router.route('admin.dashboard'),
    editPost: router.route('admin.blog.edit', { id: '42' }),
  }
}
```

## Using Named Routes in Templates

Named routes are particularly useful when generating links in HTML templates:

```typescript
// Controller function
async function getBlogIndexHandler(req) {
  const posts = await fetchPosts()

  const html = `
    <h1>Blog Posts</h1>
    <ul>
      ${posts.map(post => `
        <li>
          <a href="${router.route('blog.show', { slug: post.slug })}">
            ${post.title}
          </a>
          <small>By <a href="${router.route('blog.author', { author: post.author })}">
            ${post.authorName}
          </a></small>
        </li>
      `).join('')}
    </ul>
    <a href="${router.route('home')}">Back to Home</a>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
```

## Best Practices

When working with named routes:

1. **Be Consistent**: Establish and follow a naming convention for all routes.

2. **Use Hierarchical Names**: Use dot notation to represent relationships between routes.

3. **Keep Names Meaningful**: Choose names that clearly indicate the route's purpose.

4. **Documentation**: Document your route names for team members to reference.

5. **Avoid Collisions**: Ensure each route has a unique name to prevent unexpected behavior.

## Next Steps

Now that you understand named routes, check out these related topics:

- [Route Groups](/features/route-groups) - Organize routes into groups with shared attributes
- [Resource Routes](/features/resource-routes) - Create RESTful resource routes with predefined names
- [Domain Routing](/features/domain-routing) - Route handling based on domains and subdomains
