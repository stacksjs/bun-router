# CSRF Protection

Cross-Site Request Forgery (CSRF) is a type of attack that forces users to execute unwanted actions on a web application in which they're currently authenticated. `bun-router` provides built-in protection against CSRF attacks.

## Understanding CSRF Attacks

CSRF attacks exploit the trust a website has in a user's browser. When a user is authenticated to a site, their cookies (including session cookies) are automatically sent with every request to that site, regardless of where the request originates.

A typical CSRF attack works like this:

1. A user logs into a legitimate website (e.g., your banking site)
2. The user then visits a malicious site (or clicks a malicious link)
3. The malicious site includes code that automatically sends a request to the legitimate site
4. Because the user's browser automatically includes cookies with the request, the legitimate site processes it as if the user intentionally made the request

## Basic CSRF Protection

bun-router provides CSRF protection through the `csrfProtection` middleware. Here's how to use it:

```typescript
import { Router, csrfProtection } from 'bun-router'

const router = new Router()

// Apply CSRF protection to all routes
router.use(csrfProtection())

// Or apply it to specific routes/methods
router.post('/update-profile', csrfProtection(), (req) => {
  // This route is protected from CSRF attacks
  // ...process the request
})
```

## How It Works

The CSRF protection middleware works using a double submit cookie pattern:

1. A CSRF token is generated and stored in both a cookie and the server-side session
2. For state-changing requests (POST, PUT, DELETE, etc.), this token must be included in the request
3. The middleware validates that the token in the request matches the one stored in the session/cookie

## Configuration Options

The CSRF middleware can be configured with various options:

```typescript
router.use(csrfProtection({
  // The name of the cookie to use for CSRF tokens
  cookie: {
    key: 'csrf-token',

    // Cookie options
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  },

  // Where to check for the token in the request
  tokenLookup: {
    body: '_csrf', // Check in request body
    header: 'csrf-token', // Check in headers
    query: '_csrf', // Check in query parameters
  },

  // Function to handle CSRF validation failures
  onFailure: (req) => {
    return new Response('CSRF token validation failed', { status: 403 })
  }
}))
```

## Including CSRF Tokens in Forms

For forms, you need to include the CSRF token as a hidden field:

```typescript
router.get('/profile-edit', (req) => {
  // Get the CSRF token from the request
  const csrfToken = req.csrfToken()

  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Edit Profile</h1>
        <form method="POST" action="/update-profile">
          <!-- Include the CSRF token as a hidden field -->
          <input type="hidden" name="_csrf" value="${csrfToken}">

          <label for="name">Name:</label>
          <input type="text" id="name" name="name">

          <button type="submit">Update</button>
        </form>
      </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
})
```

## Including CSRF Tokens in AJAX Requests

For AJAX/fetch requests, you can include the CSRF token in the headers:

```html
<script>
  // Get the CSRF token from the meta tag or from a JavaScript variable
  const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content')

  // Include the token in the fetch request headers
  fetch('/api/update-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'csrf-token': csrfToken
    },
    body: JSON.stringify({
      name: 'New Name'
    })
  })
</script>
```

On the server, make sure to expose the CSRF token to your frontend code:

```typescript
router.get('/', (req) => {
  const csrfToken = req.csrfToken()

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="csrf-token" content="${csrfToken}">
      </head>
      <body>
        <!-- Your content here -->

        <script>
          // Make the token available to your JavaScript
          window.csrfToken = "${csrfToken}"
        </script>
      </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
})
```

## Excluding Routes from CSRF Protection

Some routes may not need CSRF protection, such as API endpoints that use their own authentication (like JWT tokens) or public read-only endpoints:

```typescript
const router = new Router()

// Apply CSRF protection globally
router.use(csrfProtection())

// Exclude specific routes using the `excludePath` option
router.use(csrfProtection({
  excludePath: [
    '/api/webhook', // Webhook callbacks
    '/public/info', // Public information endpoint
    /^\/api\/v1\/auth/ // Auth endpoints (using regex)
  ]
}))

// Or apply CSRF protection selectively to routes that need it
router.post('/update-profile', csrfProtection(), (req) => {
  // Protected route
})

router.post('/api/webhook', (req) => {
  // Unprotected webhook endpoint
})
```

## CSRF Protection with APIs

If you're building an API, there are a few different approaches for CSRF protection:

### 1. Token-based Authentication

If your API uses token-based authentication (like JWT) rather than cookies, CSRF protection may not be necessary:

```typescript
// API routes using JWT authentication
router.use('/api', jwtAuthMiddleware)

// CSRF protection only for cookie-based routes
router.use('/', csrfProtection())
```

### 2. Double Submit Cookie for APIs

For APIs that do use cookies, you can implement CSRF protection:

```typescript
// API routes with CSRF protection
router.use('/api', csrfProtection({
  tokenLookup: {
    header: 'X-CSRF-Token' // Look for token in a custom header
  }
}))

// API endpoint to get a CSRF token
router.get('/api/csrf-token', (req) => {
  return Response.json({
    token: req.csrfToken()
  })
})
```

The client would then include this token in subsequent requests:

```javascript
// Client-side code
async function getCsrfToken() {
  const response = await fetch('/api/csrf-token')
  const data = await response.json()
  return data.token
}

async function makeApiRequest() {
  const csrfToken = await getCsrfToken()

  return fetch('/api/update-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ /* data */ })
  })
}
```

## CSRF and Same-Site Cookies

Modern browsers support the `SameSite` cookie attribute, which provides some protection against CSRF attacks. bun-router's CSRF middleware works in conjunction with this attribute:

```typescript
router.use(csrfProtection({
  cookie: {
    // 'strict' - Cookies sent only in first-party context
    // 'lax' - Cookies sent in first-party context and some cross-site navigations
    // 'none' - Cookies sent in all contexts (requires secure: true)
    sameSite: 'lax'
  }
}))
```

Recommended settings:

- Use `SameSite: 'lax'` for most web applications
- Use `SameSite: 'strict'` for highly sensitive applications (banking, etc.)
- Use `SameSite: 'none'` (with `secure: true`) only if cross-origin cookies are required

## Testing CSRF Protection

When writing tests for routes that use CSRF protection, you'll need to include valid CSRF tokens:

```typescript
import { expect, test } from 'bun:test'
import { Router, csrfProtection } from 'bun-router'

test('protected route should reject requests without CSRF token', async () => {
  const router = new Router()

  router.use(csrfProtection())

  router.post('/update', (req) => {
    return new Response('Updated successfully')
  })

  // Request without CSRF token
  const request = new Request('http://localhost/update', {
    method: 'POST'
  })

  const response = await router.handle(request)

  // Should be rejected
  expect(response.status).toBe(403)
})

test('protected route should accept requests with valid CSRF token', async () => {
  const router = new Router()

  // Mock session middleware to store CSRF token
  router.use((req, next) => {
    req.session = { csrfSecret: 'test-csrf-secret' }
    return next(req)
  })

  router.use(csrfProtection())

  router.post('/update', (req) => {
    return new Response('Updated successfully')
  })

  // Request with CSRF token
  const request = new Request('http://localhost/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'csrf-token': 'test-csrf-secret' // Valid token
    }
  })

  const response = await router.handle(request)

  // Should be accepted
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('Updated successfully')
})
```

## Advanced: Custom Token Generation

You can customize how CSRF tokens are generated:

```typescript
router.use(csrfProtection({
  // Custom token generation function
  tokenGenerator: () => {
    // Generate a random token (example uses crypto module)
    return crypto.randomUUID()
  }
}))
```

## Best Practices

1. **Apply CSRF protection to all state-changing routes** (POST, PUT, DELETE, etc.)
2. **Use both CSRF tokens and SameSite cookies** for enhanced protection
3. **Set the `secure` flag to `true` in production** to only send cookies over HTTPS
4. **Set `httpOnly` to `true`** to prevent JavaScript access to the CSRF cookie
5. **Use a strong, random CSRF token** (the default generator uses cryptographically secure random values)
6. **Regenerate CSRF tokens after authentication** to prevent session fixation

## Troubleshooting

### Token Validation Fails

Common reasons for CSRF token validation failures:

1. **Token missing in request**: Ensure the token is included in the form or AJAX request
2. **Token expired**: If using time-based tokens, they may have expired
3. **Session expired**: If the token is stored in the session, session expiration will invalidate tokens
4. **Misconfigured token lookup**: Verify that the middleware is looking for the token in the right place (query, body, headers)

### CSRF Errors in Development

When developing locally, you might encounter CSRF errors when testing with tools like Postman or curl. For development environments, you can:

1. **Disable CSRF in development** (not recommended for production):

```typescript
if (process.env.NODE_ENV !== 'development') {
  router.use(csrfProtection())
}
```

2. **Add an exclusion for API testing tools**:

```typescript
router.use(csrfProtection({
  excludePath: process.env.NODE_ENV === 'development'
    ? ['/api/*']
    : []
}))
```

## Next Steps

Now that you understand CSRF protection in bun-router, check out these related topics:

- [Cookie Handling](/features/cookie-handling) - Learn more about cookies in bun-router
- [Session Management](/features/session-management) - Understand how to manage sessions
- [Authentication](/features/authentication) - Implement user authentication
- [Security Best Practices](/features/security) - Additional security measures for your application
