# Route Groups

Route groups allow you to organize related routes together and apply shared attributes such as prefixes, middleware, or domain constraints to multiple routes at once. This helps keep your routing code clean, maintainable, and DRY (Don't Repeat Yourself).

## Basic Route Groups

To create a route group, use the `group` method:

```typescript
import { BunRouter } from 'bun-router'

const router = new BunRouter()

router.group({
  // Group options go here
}, () => {
  // Define routes within the group
  router.get('/users', getUsersHandler)
  router.post('/users', createUserHandler)
  router.get('/users/{id}', getUserHandler)
  // ...more routes
})
```

## Group with Prefix

One of the most common uses of route groups is to apply a URL prefix to multiple routes:

```typescript
router.group({
  prefix: '/api',
}, () => {
  // These routes will be prefixed with '/api'
  router.get('/users', getUsersHandler) // /api/users
  router.post('/users', createUserHandler) // /api/users
  router.get('/users/{id}', getUserHandler) // /api/users/{id}
  router.put('/users/{id}', updateUserHandler) // /api/users/{id}
})
```

This is much cleaner than repeating `/api` in every route definition.

## Group with Middleware

You can apply middleware to all routes within a group:

```typescript
import { auth, BunRouter, jsonBody } from 'bun-router'

const router = new BunRouter()

router.group({
  middleware: [jsonBody(), auth()],
}, () => {
  // All routes in this group will use the jsonBody and auth middleware
  router.post('/login', loginHandler)
  router.post('/register', registerHandler)
})
```

## Combining Prefix and Middleware

You can combine multiple options for more flexibility:

```typescript
router.group({
  prefix: '/api',
  middleware: [jsonBody(), auth()],
}, () => {
  // Routes with both prefix and middleware
  router.get('/profile', getProfileHandler) // /api/profile with middleware
  router.put('/profile', updateProfileHandler) // /api/profile with middleware
})
```

## Nested Groups

Route groups can be nested to create hierarchical route structures:

```typescript
router.group({
  prefix: '/api',
  middleware: [apiAuthMiddleware()],
}, () => {
  // API routes
  router.get('/status', getApiStatusHandler) // /api/status

  // Admin subgroup
  router.group({
    prefix: '/admin',
    middleware: [adminAuthMiddleware()],
  }, () => {
    // Admin routes (inherit parent group's prefix and middleware)
    router.get('/dashboard', getDashboardHandler) // /api/admin/dashboard
    router.get('/users', getAdminUsersHandler) // /api/admin/users
  })

  // Public subgroup
  router.group({
    prefix: '/public',
  }, () => {
    // Public routes (inherit parent group's prefix only)
    router.get('/docs', getDocsHandler) // /api/public/docs
  })
})
```

In this example, routes in the `/api/admin` group get both the API authentication and admin authentication middleware, while routes in the `/api/public` group only get the API authentication middleware.

## Domain-Specific Groups

You can restrict a group of routes to a specific domain or subdomain:

```typescript
router.group({
  domain: 'api.example.com',
}, () => {
  // These routes are only accessible via the api.example.com domain
  router.get('/users', getUsersHandler)
  router.post('/users', createUserHandler)
})

router.group({
  domain: 'admin.example.com',
}, () => {
  // These routes are only accessible via the admin.example.com domain
  router.get('/dashboard', getDashboardHandler)
  router.get('/settings', getSettingsHandler)
})
```

## Capturing Subdomain Parameters

You can capture dynamic subdomains using the same parameter syntax as in route paths:

```typescript
router.group({
  domain: '{tenant}.example.com',
}, () => {
  router.get('/dashboard', (req) => {
    // Access the tenant subdomain
    const tenant = req.params.tenant
    return new Response(`Dashboard for ${tenant}`)
  })
})
```

## Route Groups for API Versioning

Route groups are perfect for API versioning:

```typescript
// API v1
router.group({
  prefix: '/api/v1',
}, () => {
  router.get('/users', getUsersV1Handler)
  router.get('/products', getProductsV1Handler)
})

// API v2
router.group({
  prefix: '/api/v2',
}, () => {
  router.get('/users', getUsersV2Handler)
  router.get('/products', getProductsV2Handler)
})
```

## Named Route Groups

You can even define a name prefix for all routes within a group:

```typescript
router.group({
  prefix: '/admin',
  as: 'admin.',
}, () => {
  // These routes will be named with the 'admin.' prefix
  router.get('/dashboard', getDashboardHandler, 'dashboard') // Named 'admin.dashboard'
  router.get('/users', getUsersHandler, 'users') // Named 'admin.users'
})

// Generate URLs using the named routes
const dashboardUrl = router.route('admin.dashboard') // '/admin/dashboard'
const usersUrl = router.route('admin.users') // '/admin/users'
```

## Practical Example: Blog API

Here's a more complete example of how route groups can organize a blog API:

```typescript
import { auth, BunRouter, cors, jsonBody } from 'bun-router'

const router = new BunRouter()

// Apply global middleware
router.use(cors())

// Public routes
router.group({
  prefix: '/api',
}, () => {
  // No authentication required
  router.get('/posts', getPostsHandler)
  router.get('/posts/{id}', getPostHandler)
  router.get('/categories', getCategoriesHandler)

  // Authentication required
  router.group({
    middleware: [auth()],
  }, () => {
    // Author routes
    router.group({
      prefix: '/author',
      middleware: [authorRoleMiddleware()],
    }, () => {
      router.post('/posts', createPostHandler)
      router.put('/posts/{id}', updatePostHandler)
      router.delete('/posts/{id}', deletePostHandler)
    })

    // Admin routes
    router.group({
      prefix: '/admin',
      middleware: [adminRoleMiddleware()],
    }, () => {
      router.get('/users', getUsersHandler)
      router.post('/users', createUserHandler)
      router.delete('/users/{id}', deleteUserHandler)
      router.get('/statistics', getStatsHandler)
    })

    // User profile (any authenticated user)
    router.group({
      prefix: '/profile',
    }, () => {
      router.get('/', getProfileHandler)
      router.put('/', updateProfileHandler)
      router.put('/password', changePasswordHandler)
    })
  })
})

// Start the server
router.serve({ port: 3000 })
```

## Best Practices

When using route groups, keep these tips in mind:

1. **Organize by Function**: Group routes by their function or resource type (e.g., admin routes, user routes).

2. **Middleware Efficiency**: Apply middleware at the most specific level needed to avoid unnecessary processing.

3. **Avoid Deep Nesting**: While nesting groups is powerful, too many levels can make code harder to follow.

4. **Use Consistent Naming**: If using named routes, establish a consistent naming pattern.

5. **Document Group Boundaries**: Add comments to indicate where groups begin and end in large files.

## Next Steps

Now that you understand route groups, check out related topics:

- [Middleware](/features/middleware) - Learn more about middleware that you can apply to groups
- [Named Routes](/features/named-routes) - See how to name and reference routes
- [Domain Routing](/features/domain-routing) - More information on domain-specific routing
