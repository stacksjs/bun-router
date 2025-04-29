# Extending the Router

bun-router allows you to extend the Router class with custom methods, enabling you to create reusable routing patterns and custom functionality tailored to your application's needs.

## Basic Extension

Use the `extend()` method to add custom methods to your router instance:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Extend the router with custom methods
router.extend({
  // Custom method for creating admin routes
  adminRoute(path, handler) {
    return this.get(`/admin${path}`, handler)
      .where({ admin: 'true' }) // Add a constraint
  },

  // Another custom method
  apiResource(name, controller) {
    // Create a RESTful API resource with specific naming
    this.get(`/api/${name}`, `${controller}/getAll`, 'api', `api.${name}.index`)
    this.post(`/api/${name}`, `${controller}/create`, 'api', `api.${name}.create`)
    this.get(`/api/${name}/{id}`, `${controller}/getOne`, 'api', `api.${name}.show`)
    this.put(`/api/${name}/{id}`, `${controller}/update`, 'api', `api.${name}.update`)
    this.delete(`/api/${name}/{id}`, `${controller}/delete`, 'api', `api.${name}.delete`)

    return this
  }
})

// Now use your custom methods
router.adminRoute('/dashboard', showAdminDashboard)
router.apiResource('users', 'UserController')
```

## When to Extend the Router

You should consider extending the router when:

1. **You have repetitive routing patterns** that you use across your application
2. **You want to create domain-specific methods** that match your application's terminology
3. **You need custom behavior** that builds on the core router functionality
4. **You're building a plugin or shared library** that adds functionality to bun-router

## Creating Chainable Methods

To make your custom methods chainable (like the built-in router methods), make sure they return `this`:

```typescript
router.extend({
  prefix(prefix) {
    this._currentPrefix = prefix
    return this // Return this for chaining
  },

  withPrefix(path, handler) {
    const fullPath = `${this._currentPrefix || ''}${path}`
    return this.get(fullPath, handler) // Already returns this
  }
})

// Now you can chain methods
router
  .prefix('/dashboard')
  .withPrefix('/stats', showStats)
  .withPrefix('/users', showUsers)
```

## Practical Extension Examples

### Authentication Routes

Create a method for defining authentication-related routes:

```typescript
router.extend({
  auth(options = {}) {
    const { loginPath = '/login', registerPath = '/register', logoutPath = '/logout' } = options

    this.get(loginPath, 'Auth/ShowLoginForm', 'web', 'auth.login')
    this.post(loginPath, 'Auth/Login', 'web')
    this.get(registerPath, 'Auth/ShowRegisterForm', 'web', 'auth.register')
    this.post(registerPath, 'Auth/Register', 'web')
    this.post(logoutPath, 'Auth/Logout', 'web', 'auth.logout')

    return this
  }
})

// Use the custom auth method
router.auth({ loginPath: '/signin', logoutPath: '/signout' })
```

### Versioned API Routes

Create a method for managing versioned API endpoints:

```typescript
router.extend({
  // Method to handle API versioning
  v(version, callback) {
    const previousPrefix = this._apiVersionPrefix || ''
    this._apiVersionPrefix = `/v${version}`

    // Create a group with the version prefix
    this.group({
      prefix: this._apiVersionPrefix
    }, callback)

    this._apiVersionPrefix = previousPrefix
    return this
  },

  // Method to create a route with the current API version
  apiRoute(method, path, handler, name) {
    const versionedPath = `${this._apiVersionPrefix || ''}${path}`

    // Use the appropriate HTTP method
    if (method === 'GET') return this.get(versionedPath, handler, 'api', name)
    if (method === 'POST') return this.post(versionedPath, handler, 'api', name)
    if (method === 'PUT') return this.put(versionedPath, handler, 'api', name)
    if (method === 'DELETE') return this.delete(versionedPath, handler, 'api', name)
    if (method === 'PATCH') return this.patch(versionedPath, handler, 'api', name)

    return this
  }
})

// Use the versioning methods
router.v(1, () => {
  router.apiRoute('GET', '/users', 'API/V1/Users/Index', 'api.v1.users.index')
  router.apiRoute('POST', '/users', 'API/V1/Users/Store', 'api.v1.users.store')
})

router.v(2, () => {
  router.apiRoute('GET', '/users', 'API/V2/Users/Index', 'api.v2.users.index')
  router.apiRoute('POST', '/users', 'API/V2/Users/Store', 'api.v2.users.store')
})
```

### CRUD Operations

Simplify CRUD operations for your entities:

```typescript
router.extend({
  crud(entity, options = {}) {
    const {
      basePath = `/${entity.toLowerCase()}`,
      controller = `${entity}Controller`,
      middleware = [],
      except = []
    } = options

    const routes = {
      index: { method: 'GET', path: basePath, action: 'index' },
      create: { method: 'GET', path: `${basePath}/create`, action: 'create' },
      store: { method: 'POST', path: basePath, action: 'store' },
      show: { method: 'GET', path: `${basePath}/{id}`, action: 'show' },
      edit: { method: 'GET', path: `${basePath}/{id}/edit`, action: 'edit' },
      update: { method: 'PUT', path: `${basePath}/{id}`, action: 'update' },
      destroy: { method: 'DELETE', path: `${basePath}/{id}`, action: 'destroy' }
    }

    // Register all routes that aren't in the except array
    for (const [routeName, route] of Object.entries(routes)) {
      if (except.includes(routeName)) continue

      const handler = `${controller}@${route.action}`

      if (route.method === 'GET') this.get(route.path, handler, 'web', `${entity.toLowerCase()}.${routeName}`)
      if (route.method === 'POST') this.post(route.path, handler, 'web', `${entity.toLowerCase()}.${routeName}`)
      if (route.method === 'PUT') this.put(route.path, handler, 'web', `${entity.toLowerCase()}.${routeName}`)
      if (route.method === 'DELETE') this.delete(route.path, handler, 'web', `${entity.toLowerCase()}.${routeName}`)
    }

    return this
  }
})

// Use the CRUD generator
router.crud('Post', { except: ['create', 'edit'] }) // Skip create and edit forms for API
router.crud('User', { middleware: [authMiddleware] }) // Add auth middleware
```

## Extension with TypeScript

To get proper TypeScript support for your extended methods, you can use declaration merging:

```typescript
import { Router } from 'bun-router'

// Extend the Router interface
declare module 'bun-router' {
  interface Router {
    apiResource(name: string, controller: string): Router;
    adminRoute(path: string, handler: ActionHandler): Router;
    // Add more custom method signatures here
  }
}

const router = new Router()

// Now TypeScript will recognize these methods
router.extend({
  apiResource(name, controller) {
    // Implementation
    return this
  },
  adminRoute(path, handler) {
    // Implementation
    return this
  }
})
```

## Best Practices

When extending the router, follow these best practices:

1. **Return the router instance** from your methods to support chaining
2. **Document your custom methods** with JSDoc comments
3. **Use strong typing** with TypeScript
4. **Don't override built-in methods** unless you fully understand the implications
5. **Group related functionality** into logical extensions
6. **Keep your extensions focused** on a specific concern
7. **Maintain predictable naming** for your custom methods

## Sharing Extensions as Plugins

You can create shareable router extensions as plugins:

```typescript
// myRouterPlugin.ts
export function installMyRouterPlugin(router) {
  return router.extend({
    // Custom methods...
    specialRoute(path, handler) {
      // Implementation
      return this
    }
  })
}

// Using the plugin
import { Router } from 'bun-router'
import { installMyRouterPlugin } from './myRouterPlugin'

const router = new Router()
installMyRouterPlugin(router)

// Now you can use the plugin's methods
router.specialRoute('/example', exampleHandler)
```

## Advanced Example: Multi-tenant Routing

Here's an advanced example implementing multi-tenant routing:

```typescript
router.extend({
  // Set the current tenant
  tenant(tenantId) {
    this._currentTenant = tenantId
    return this
  },

  // Create a tenant-specific route
  tenantRoute(method, path, handler, name) {
    if (!this._currentTenant) {
      throw new Error('No tenant set. Call tenant() first.')
    }

    const tenantPath = `/tenants/${this._currentTenant}${path}`
    const tenantName = name ? `tenant.${this._currentTenant}.${name}` : undefined

    // Use the appropriate HTTP method
    if (method === 'GET') return this.get(tenantPath, handler, 'web', tenantName)
    if (method === 'POST') return this.post(tenantPath, handler, 'web', tenantName)
    if (method === 'PUT') return this.put(tenantPath, handler, 'web', tenantName)
    if (method === 'DELETE') return this.delete(tenantPath, handler, 'web', tenantName)
    if (method === 'PATCH') return this.patch(tenantPath, handler, 'web', tenantName)

    return this
  },

  // Create tenant-specific routes in a group
  tenantGroup(tenantId, callback) {
    const previousTenant = this._currentTenant
    this._currentTenant = tenantId

    // Execute the callback with the tenant set
    callback()

    // Restore the previous tenant
    this._currentTenant = previousTenant
    return this
  }
})

// Using the multi-tenant routing
router.tenantGroup('acme', () => {
  router.tenantRoute('GET', '/dashboard', 'Tenant/Dashboard', 'dashboard')
  router.tenantRoute('GET', '/profile', 'Tenant/Profile', 'profile')
})

router.tenantGroup('megacorp', () => {
  router.tenantRoute('GET', '/dashboard', 'Tenant/Dashboard', 'dashboard')
  router.tenantRoute('GET', '/profile', 'Tenant/Profile', 'profile')
})
```

## Next Steps

Now that you understand how to extend the router, check out related topics:

- [Advanced Middleware](/advanced/custom-middleware)
- [Error Handling](/advanced/error-handling)
- [WebSocket Patterns](/advanced/websocket-patterns)
- [Route Groups](/features/route-groups)
