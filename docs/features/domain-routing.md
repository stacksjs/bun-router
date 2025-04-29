# Domain Routing

Domain routing in bun-router allows you to route requests based on the domain or subdomain of the incoming request. This is particularly useful for multi-tenant applications, subdomains for different services, or serving separate content for different domains using the same application.

## Basic Domain Routing

To define routes for specific domains, use the domain option when defining routes:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Route for the main domain
router.get('/', (req) => {
  return new Response('Welcome to the main site!')
})

// Route for a specific domain
router.get('/', {
  domain: 'admin.example.com'
}, (req) => {
  return new Response('Welcome to the admin panel!')
})

// Route for another domain
router.get('/', {
  domain: 'api.example.com'
}, (req) => {
  return new Response('API documentation')
})
```

With this configuration:

- Requests to `example.com/` will return "Welcome to the main site!"
- Requests to `admin.example.com/` will return "Welcome to the admin panel!"
- Requests to `api.example.com/` will return "API documentation"

## Domain Groups

You can group routes under specific domains using the `group` method with a domain option:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Main domain routes
router.get('/', (req) => {
  return new Response('Main site home page')
})

// Admin domain routes
router.group({
  domain: 'admin.example.com'
}, () => {
  router.get('/', (req) => {
    return new Response('Admin dashboard')
  })

  router.get('/users', (req) => {
    return new Response('User management')
  })

  router.get('/settings', (req) => {
    return new Response('Admin settings')
  })
})

// API domain routes
router.group({
  domain: 'api.example.com'
}, () => {
  router.get('/', (req) => {
    return new Response('API documentation')
  })

  router.get('/v1/users', (req) => {
    return new Response('Users API v1')
  })

  router.get('/v1/products', (req) => {
    return new Response('Products API v1')
  })
})
```

## Subdomain Parameters

bun-router allows you to capture dynamic subdomains as parameters, making it possible to create multi-tenant applications:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Main site
router.get('/', (req) => {
  return new Response('Main site')
})

// Tenant subdomains
router.get('/', {
  domain: '{tenant}.example.com'
}, (req) => {
  const { tenant } = req.params
  return new Response(`Welcome to ${tenant}'s dashboard!`)
})

// Specific paths for tenant subdomains
router.get('/settings', {
  domain: '{tenant}.example.com'
}, (req) => {
  const { tenant } = req.params
  return new Response(`Settings for ${tenant}`)
})
```

With this configuration:

- Requests to `example.com/` will return "Main site"
- Requests to `acme.example.com/` will return "Welcome to acme's dashboard!"
- Requests to `widget.example.com/` will return "Welcome to widget's dashboard!"
- Requests to `acme.example.com/settings` will return "Settings for acme"

## Domain Parameter Constraints

You can add constraints to subdomain parameters to ensure they match specific patterns:

```typescript
router.get('/', {
  domain: '{tenant}.example.com'
}, (req) => {
  const { tenant } = req.params
  return new Response(`Welcome to ${tenant}'s dashboard!`)
}).whereAlphaNumeric('tenant')
```

This will ensure that the `tenant` parameter can only contain alphanumeric characters.

## Domain Wildcards

You can use wildcards to match any subdomain:

```typescript
// Match any subdomain of example.com
router.get('/', {
  domain: '*.example.com'
}, (req) => {
  // Get the actual subdomain from request
  const host = req.headers.get('host')
  const subdomain = host.split('.')[0]

  return new Response(`Subdomain: ${subdomain}`)
})
```

## Multiple Domains for the Same Route

You can specify multiple domains for the same route:

```typescript
// Serve the same content for multiple domains
router.get('/', {
  domain: ['example.com', 'example.org', 'example.net']
}, (req) => {
  return new Response('Welcome to our site!')
})
```

## Checking the Domain in Middleware

You can create middleware that checks the domain:

```typescript
function domainMiddleware(domains) {
  return (req, next) => {
    const host = req.headers.get('host')

    // Remove port if present
    const domain = host.split(':')[0]

    if (domains.includes(domain)) {
      return next(req)
    }

    return new Response('Unauthorized domain', { status: 403 })
  }
}

// Apply domain middleware to a route
router.get('/protected', domainMiddleware(['example.com', 'admin.example.com']), (req) => {
  return new Response('Protected content')
})
```

## Testing Domain Routes

When testing domain routes, you need to set the `Host` header in your requests:

```typescript
import { expect, test } from 'bun:test'
import { Router } from 'bun-router'

test('domain routing should work', async () => {
  const router = new Router()

  router.get('/', {
    domain: 'example.com'
  }, (req) => {
    return new Response('Main site')
  })

  router.get('/', {
    domain: 'admin.example.com'
  }, (req) => {
    return new Response('Admin site')
  })

  // Test main domain
  const mainRequest = new Request('http://example.com/', {
    headers: {
      Host: 'example.com'
    }
  })

  const mainResponse = await router.handle(mainRequest)
  expect(await mainResponse.text()).toBe('Main site')

  // Test admin domain
  const adminRequest = new Request('http://admin.example.com/', {
    headers: {
      Host: 'admin.example.com'
    }
  })

  const adminResponse = await router.handle(adminRequest)
  expect(await adminResponse.text()).toBe('Admin site')
})
```

## Practical Examples

### Multi-tenant SaaS Application

```typescript
import { Router, session } from 'bun-router'

const router = new Router()

// Main marketing site
router.group({
  domain: 'example.com'
}, () => {
  router.get('/', (req) => {
    return new Response('Welcome to our SaaS app!')
  })

  router.get('/pricing', (req) => {
    return new Response('Our pricing plans')
  })

  router.get('/signup', (req) => {
    return new Response('Sign up for an account')
  })
})

// App routes for tenant subdomains
router.group({
  domain: '{tenant}.example.com',
  middleware: [session(), requireAuth()]
}, () => {
  router.get('/', (req) => {
    const { tenant } = req.params
    return new Response(`${tenant}'s Dashboard`)
  })

  router.get('/projects', (req) => {
    const { tenant } = req.params
    return new Response(`${tenant}'s Projects`)
  })

  router.get('/settings', (req) => {
    const { tenant } = req.params
    return new Response(`${tenant}'s Settings`)
  })
})

// Admin dashboard for managing tenants
router.group({
  domain: 'admin.example.com',
  middleware: [session(), requireAdmin()]
}, () => {
  router.get('/', (req) => {
    return new Response('Admin Dashboard')
  })

  router.get('/tenants', (req) => {
    return new Response('Tenant Management')
  })

  router.get('/billing', (req) => {
    return new Response('Billing Management')
  })
})
```

### Localized Content Based on Country Domains

```typescript
import { Router } from 'bun-router'

const router = new Router()

// US site
router.group({
  domain: 'example.com'
}, () => {
  router.get('/', (req) => {
    return new Response('US Website - English')
  })

  router.get('/products', (req) => {
    return new Response('US Products with USD pricing')
  })
})

// UK site
router.group({
  domain: 'example.co.uk'
}, () => {
  router.get('/', (req) => {
    return new Response('UK Website - English (UK)')
  })

  router.get('/products', (req) => {
    return new Response('UK Products with GBP pricing')
  })
})

// German site
router.group({
  domain: 'example.de'
}, () => {
  router.get('/', (req) => {
    return new Response('Deutsche Website - Deutsch')
  })

  router.get('/produkte', (req) => {
    return new Response('Deutsche Produkte mit EUR Preisen')
  })
})
```

## Next Steps

Now that you understand domain routing in bun-router, check out these related topics:

- [Route Groups](/features/route-groups) - Group related routes together
- [Named Routes](/features/named-routes) - Name your routes for URL generation
- [Middleware](/features/middleware) - Apply middleware to domain-specific routes
