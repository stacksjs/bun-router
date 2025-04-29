# Cookie Handling

bun-router provides a simple yet powerful API for working with HTTP cookies. This guide will show you how to read, write, and manage cookies in your web applications.

## Basic Cookie Usage

### Reading Cookies

To read cookies from an incoming request:

```typescript
import { Router } from 'bun-router'

const router = new Router()

router.get('/', (req) => {
  // Get all cookies as an object
  const cookies = req.cookies

  // Access a specific cookie
  const theme = req.cookies.theme

  return new Response(`Your theme preference is: ${theme}`)
})
```

### Setting Cookies

To set cookies in your response:

```typescript
router.get('/set-theme', (req) => {
  const { theme } = req.query

  // Create a response
  const response = new Response(`Theme set to: ${theme}`)

  // Set a simple cookie
  response.cookie('theme', theme)

  return response
})
```

### Setting Cookies with Options

You can set various cookie options:

```typescript
router.get('/login', (req) => {
  // Create a response
  const response = new Response('You are logged in')

  // Set a cookie with options
  response.cookie('session', 'abc123', {
    // Cookie lifespan in milliseconds (1 day)
    maxAge: 24 * 60 * 60 * 1000,

    // Or use an exact expiration date
    // expires: new Date(Date.now() + 24 * 60 * 60 * 1000),

    // Restrict cookie to HTTPS connections
    secure: true,

    // Prevent client-side access to cookie
    httpOnly: true,

    // Controls when cookies are sent in cross-site requests
    sameSite: 'lax', // 'strict', 'lax', or 'none'

    // Cookie domain (defaults to current domain)
    domain: 'example.com',

    // Cookie path (defaults to '/')
    path: '/',

    // Priority hint (Chrome-specific)
    priority: 'high' // 'low', 'medium', or 'high'
  })

  return response
})
```

### Deleting Cookies

To delete an existing cookie:

```typescript
router.get('/logout', (req) => {
  const response = new Response('You are logged out')

  // Clear a cookie
  response.clearCookie('session')

  return response
})
```

You can also specify the same options as when setting the cookie to ensure it's properly removed:

```typescript
router.get('/logout', (req) => {
  const response = new Response('You are logged out')

  // Clear a cookie with the same path and domain as when it was set
  response.clearCookie('session', {
    path: '/',
    domain: 'example.com'
  })

  return response
})
```

## Cookie Middleware

For more advanced cookie handling, `bun-router` provides a cookie parser middleware:

```typescript
import { Router, cookieParser } from 'bun-router'

const router = new Router()

// Add cookie parser middleware with options
router.use(cookieParser({
  // Secret for signed cookies (optional)
  secret: 'your-secret-key',

  // Parser options
  decode: decodeURIComponent
}))

// Now you can access cookies in all route handlers
router.get('/profile', (req) => {
  // Regular cookies
  const theme = req.cookies.theme

  // Signed cookies (if secret was provided)
  const userId = req.signedCookies.userId

  if (!userId) {
    return new Response('Please log in', { status: 401 })
  }

  return new Response(`User ${userId} is using theme: ${theme}`)
})
```

## Signed Cookies

Signed cookies help verify that a cookie hasn't been tampered with by the client:

```typescript
import { Router, cookieParser } from 'bun-router'

const router = new Router()

// Add cookie parser middleware with secret
router.use(cookieParser({
  secret: 'your-strong-secret-key'
}))

// Setting a signed cookie
router.post('/login', async (req) => {
  const { username, password } = await req.json()

  // Validate user (example)
  const user = await validateUser(username, password)

  if (!user) {
    return new Response('Invalid credentials', { status: 401 })
  }

  const response = new Response('Logged in successfully')

  // Set a signed cookie
  response.signedCookie('userId', user.id.toString(), {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    secure: process.env.NODE_ENV === 'production'
  })

  return response
})

// Reading a signed cookie
router.get('/profile', (req) => {
  // Access signed cookie
  const userId = req.signedCookies.userId

  if (!userId) {
    return new Response('Please log in', { status: 401 })
  }

  return new Response(`User profile for ID: ${userId}`)
})
```

## Cookie Security

To ensure cookie security, follow these best practices:

### 1. Use HttpOnly for Sensitive Cookies

Set `httpOnly: true` to prevent JavaScript access to sensitive cookies:

```typescript
response.cookie('session', token, {
  httpOnly: true
})
```

### 2. Set Secure Flag in Production

Restrict cookies to HTTPS connections in production:

```typescript
response.cookie('session', token, {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true
})
```

### 3. Use Appropriate SameSite Setting

Set `sameSite` attribute to prevent CSRF attacks:

```typescript
// Most restrictive - cookie sent only for same-site requests
response.cookie('session', token, {
  sameSite: 'strict',
  httpOnly: true
})

// Balanced approach - cookie sent for same-site and top-level navigation
response.cookie('session', token, {
  sameSite: 'lax', // Default in modern browsers
  httpOnly: true
})

// Least restrictive - allows cross-site requests (requires Secure)
response.cookie('session', token, {
  sameSite: 'none',
  secure: true,
  httpOnly: true
})
```

### 4. Set Proper Expiration

Set appropriate expiration times based on the sensitivity of the data:

```typescript
// Session cookie (expires when browser closes)
response.cookie('preference', value)

// Short-lived authentication
response.cookie('session', token, {
  maxAge: 30 * 60 * 1000 // 30 minutes
})

// Longer-lived preferences
response.cookie('theme', theme, {
  maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
})
```

### 5. Use Cookie Prefixes

Modern browsers support cookie prefixes that enforce security constraints:

```typescript
// Requires Secure attribute
response.cookie('__Secure-Session', token, {
  secure: true,
  httpOnly: true
})

// Requires Secure, HttpOnly, and same-site origin
response.cookie('__Host-Session', token, {
  secure: true,
  httpOnly: true,
  path: '/',
  sameSite: 'strict'
})
```

## Working with JSON Data in Cookies

For complex data, you can store JSON strings in cookies:

```typescript
// Storing object data
router.get('/preferences', (req) => {
  const userPrefs = {
    theme: 'dark',
    fontSize: 'large',
    notifications: true
  }

  const response = new Response('Preferences saved')

  // Serialize the object to JSON string
  response.cookie('preferences', JSON.stringify(userPrefs), {
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  })

  return response
})

// Reading object data
router.get('/theme', (req) => {
  try {
    // Parse the JSON string back to an object
    const preferences = JSON.parse(req.cookies.preferences || '{}')

    return new Response(`Your theme is: ${preferences.theme || 'default'}`)
  }
  catch (error) {
    // Handle invalid JSON
    return new Response('Invalid preferences data', { status: 400 })
  }
})
```

## Cookie Size Limitations

Browsers impose limits on cookie size (usually 4KB per cookie). For larger data, consider:

1. **Split data across multiple cookies**
2. **Store only an identifier in the cookie and keep the data server-side** (e.g., in a session)
3. **Use client-side storage alternatives for non-sensitive data** (e.g., localStorage)

```typescript
// Better approach for large data
router.get('/save-data', (req) => {
  const largeUserData = { /* ... large object ... */ }

  // Generate a unique ID
  const dataId = crypto.randomUUID()

  // Store data server-side (example)
  dataStore.set(dataId, largeUserData)

  const response = new Response('Data saved')

  // Store only the reference in the cookie
  response.cookie('dataRef', dataId, {
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  })

  return response
})
```

## Third-Party Cookies and Tracking

Modern browsers place restrictions on third-party cookies. Be aware of these limitations when developing cross-domain applications:

```typescript
// This cookie won't work in cross-site contexts in modern browsers
response.cookie('tracking', 'value', {
  domain: 'analytics.example.com'
})

// For legitimate cross-site cases, you need:
response.cookie('tracking', 'value', {
  domain: 'analytics.example.com',
  sameSite: 'none', // Required for cross-site
  secure: true // Required with sameSite=none
})
```

## Handling Cookies in Middleware

You can create custom middleware to process cookies:

```typescript
function authCookieMiddleware(req, next) {
  const authToken = req.cookies.authToken

  if (!authToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Verify the token (example)
    const user = verifyAuthToken(authToken)

    // Attach user info to request for downstream handlers
    req.user = user

    return next(req)
  }
  catch (error) {
    // Invalid token
    const response = new Response('Invalid authentication', { status: 401 })

    // Clear the invalid cookie
    response.clearCookie('authToken')

    return response
  }
}

// Use the middleware on specific routes
router.get('/dashboard', authCookieMiddleware, (req) => {
  return new Response(`Welcome, ${req.user.name}!`)
})
```

## Testing Cookies

When writing tests for code that uses cookies:

```typescript
import { expect, test } from 'bun:test'
import { Router } from 'bun-router'

test('should set theme cookie', async () => {
  const router = new Router()

  router.get('/set-theme', (req) => {
    const { theme } = req.query
    const response = new Response(`Theme set to: ${theme}`)
    response.cookie('theme', theme)
    return response
  })

  // Create a request with query parameter
  const request = new Request('http://localhost/set-theme?theme=dark')

  // Process the request
  const response = await router.handle(request)

  // Verify response status
  expect(response.status).toBe(200)

  // Verify response text
  expect(await response.text()).toBe('Theme set to: dark')

  // Verify cookie was set
  const setCookieHeader = response.headers.get('Set-Cookie')
  expect(setCookieHeader).toContain('theme=dark')
})

test('should read theme cookie', async () => {
  const router = new Router()

  router.get('/theme', (req) => {
    return new Response(`Theme: ${req.cookies.theme || 'default'}`)
  })

  // Create a request with a cookie
  const request = new Request('http://localhost/theme', {
    headers: {
      Cookie: 'theme=dark'
    }
  })

  // Process the request
  const response = await router.handle(request)

  // Verify response
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('Theme: dark')
})
```

## Cookie Integration with Session Management

Cookies are commonly used with session management. See the [Session Management](/features/session-management) guide for more on this topic.

## Common Cookie Patterns

### Remember Me Functionality

Implement a "Remember Me" feature:

```typescript
router.post('/login', async (req) => {
  const { username, password, rememberMe } = await req.json()

  // Authenticate user (example)
  const user = await authenticateUser(username, password)

  if (!user) {
    return new Response('Invalid credentials', { status: 401 })
  }

  const response = new Response('Logged in successfully')

  // Set session cookie
  response.cookie('sessionId', generateSessionId(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    // If remember me is checked, set a longer expiration
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}) // 30 days if rememberMe
  })

  return response
})
```

### Language/Locale Preference

Store user language preference:

```typescript
router.get('/set-language/:lang', (req) => {
  const { lang } = req.params

  const response = new Response(`Language set to: ${lang}`)

  // Store language preference for 1 year
  response.cookie('language', lang, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  })

  return response
})

// Apply language preference in middleware
function languageMiddleware(req, next) {
  // Set default language
  req.language = 'en'

  // Override with user preference if available
  if (req.cookies.language) {
    req.language = req.cookies.language
  }

  return next(req)
}

router.use(languageMiddleware)
```

### Consent Management

Implement a cookie consent banner:

```typescript
router.get('/', (req) => {
  const consentGiven = req.cookies.cookieConsent === 'true'

  // Generate HTML with or without consent banner
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Welcome to Our Site</h1>
        ${!consentGiven
          ? `
          <div class="cookie-banner">
            <p>We use cookies to improve your experience.</p>
            <button onclick="acceptCookies()">Accept</button>
          </div>
          <script>
            function acceptCookies() {
              document.cookie = 'cookieConsent=true;max-age=31536000;path=/;samesite=lax';
              document.querySelector('.cookie-banner').style.display = 'none';
            }
          </script>
        `
          : ''}
      </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
})
```

## Next Steps

Now that you understand cookie handling in bun-router, check out these related topics:

- [Session Management](/features/session-management) - Learn how to manage user sessions
- [CSRF Protection](/features/csrf-protection) - Understand how to protect against cross-site request forgery
- [Authentication](/features/authentication) - Implement user authentication in your application
