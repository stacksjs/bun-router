# Security Best Practices

bun-router provides several built-in security features to help protect your web applications. This guide covers essential security practices and how to implement them using bun-router.

## HTTPS

Always serve your application over HTTPS in production environments. This encrypts data in transit and helps prevent various attacks:

```typescript
import { readFileSync } from 'node:fs'
import { createSecureServer } from 'node:https'
import { Router } from 'bun-router'

const router = new Router()

// Define your routes
router.get('/', (req) => {
  return new Response('Secure home page')
})

// In development, you might use plain HTTP
if (process.env.NODE_ENV === 'development') {
  router.serve({ port: 3000 })
}
// In production, use HTTPS
else {
  const server = createSecureServer({
    key: readFileSync('/path/to/ssl/key.pem'),
    cert: readFileSync('/path/to/ssl/cert.pem')
  }, router.fetch)

  server.listen(443, () => {
    console.log('Secure server running on https://localhost')
  })
}
```

## Secure Cookies

When setting cookies, always use secure options:

```typescript
router.get('/set-cookie', (req) => {
  const response = new Response('Cookie set')

  response.cookie('session', 'value', {
    // Prevent JavaScript access to the cookie
    httpOnly: true,

    // Only send over HTTPS
    secure: process.env.NODE_ENV === 'production',

    // Protect against CSRF attacks
    sameSite: 'lax', // Or 'strict' for maximum security

    // Set an expiration
    maxAge: 3600 * 1000, // 1 hour

    // Limit to specific path
    path: '/'
  })

  return response
})
```

## CORS (Cross-Origin Resource Sharing)

Properly configure CORS to restrict which domains can access your API:

```typescript
import { cors, Router } from 'bun-router'

const router = new Router()

// Basic CORS configuration
router.use(cors({
  // Allow only specific origins
  origin: ['https://trusted-site.com', 'https://admin.trusted-site.com'],

  // Allow specific methods
  methods: ['GET', 'POST'],

  // Allow specific headers
  allowedHeaders: ['Content-Type', 'Authorization'],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Cache preflight requests
  maxAge: 3600 // 1 hour
}))

// Define routes that will use these CORS settings
router.get('/api/data', (req) => {
  return Response.json({ message: 'Protected data' })
})
```

## Content Security Policy (CSP)

Implement Content Security Policy headers to prevent XSS and other code injection attacks:

```typescript
function cspMiddleware(req, next) {
  const response = await next(req)

  response.headers.set('Content-Security-Policy', [
    'default-src \'self\'',
    'script-src \'self\' https://trusted-cdn.com',
    'style-src \'self\' https://trusted-cdn.com',
    'img-src \'self\' https://trusted-cdn.com data:',
    'font-src \'self\' https://trusted-cdn.com',
    'connect-src \'self\' https://api.trusted-site.com',
    'frame-ancestors \'none\'',
    'form-action \'self\'',
    'base-uri \'self\''
  ].join('; '))

  return response
}

router.use(cspMiddleware)
```

## CSRF Protection

Use bun-router's built-in CSRF protection for forms and state-changing requests:

```typescript
import { csrfProtection, Router, session } from 'bun-router'

const router = new Router()

// Add session middleware (required for CSRF protection)
router.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}))

// Add CSRF protection middleware
router.use(csrfProtection())

// Form submission route with CSRF protection
router.get('/form', (req) => {
  const csrfToken = req.csrfToken()

  const html = `
    <form method="POST" action="/submit">
      <input type="hidden" name="_csrf" value="${csrfToken}">
      <input type="text" name="message">
      <button type="submit">Submit</button>
    </form>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
})

router.post('/submit', (req) => {
  // The CSRF middleware automatically validates the token
  // If the token is missing or invalid, it will return a 403 Forbidden response

  return new Response('Form submitted successfully!')
})
```

For a more detailed guide on CSRF protection, see the [CSRF Protection](/features/csrf-protection) documentation.

## Rate Limiting

Implement rate limiting to prevent brute force attacks and abuse:

```typescript
import { redis } from 'bun'
import { Router, session } from 'bun-router'

const router = new Router()

// Rate limiting middleware using Bun's Redis client
function rateLimit({ windowMs = 60 * 1000, maxRequests = 100, message = 'Too many requests' } = {}) {
  return async (req, next) => {
    // Get client IP or a unique identifier
    const identifier = req.headers.get('x-forwarded-for') || 'unknown'
    const key = `ratelimit:${identifier}`

    // Get current count
    const currentCount = Number.parseInt(await redis.get(key) || '0')

    // Check if limit exceeded
    if (currentCount >= maxRequests) {
      return new Response(message, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(windowMs / 1000).toString()
        }
      })
    }

    // Increment count
    await redis.incr(key)

    // Set expiry if this is the first request in the window
    if (currentCount === 0) {
      await redis.expire(key, Math.ceil(windowMs / 1000))
    }

    // Process the request
    const response = await next(req)

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - currentCount - 1).toString())

    return response
  }
}

// Apply rate limiting to specific routes
router.post('/login', rateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 }), async (req) => {
  // Login logic here
})

// Or apply globally with higher limits
router.use(rateLimit({ maxRequests: 100, windowMs: 60 * 1000 }))
```

## Input Validation

Always validate and sanitize user inputs:

```typescript
import { Router } from 'bun-router'
import { z } from 'zod' // Popular validation library

const router = new Router()

// Define validation schema
const userSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  age: z.number().int().min(18).optional()
})

router.post('/register', async (req) => {
  try {
    const data = await req.json()

    // Validate input
    const validatedData = userSchema.parse(data)

    // Process the validated data
    // ...

    return Response.json({ success: true })
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        errors: error.errors
      }, { status: 400 })
    }

    return Response.json({
      success: false,
      error: 'Server error'
    }, { status: 500 })
  }
})
```

## Secure Password Handling

Use Bun's built-in password hashing functions to securely handle passwords:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Register a new user
router.post('/register', async (req) => {
  const { username, password } = await req.json()

  // Generate a secure password hash using argon2id (default) or bcrypt
  const passwordHash = await Bun.password.hash(password, {
    algorithm: 'argon2id', // Options: 'argon2id', 'argon2i', 'argon2d', 'bcrypt'
    // Additional options for argon2
    memoryCost: 65536, // in kibibytes
    timeCost: 3, // iterations
    // For bcrypt you can specify cost: 12 (number between 4-31)
  })

  // Save user to database with hashed password
  await createUser({ username, passwordHash })

  return Response.json({ success: true })
})

// Log in a user
router.post('/login', async (req) => {
  const { username, password } = await req.json()

  // Find user
  const user = await findUserByUsername(username)

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Verify password
  const isValid = await Bun.password.verify(password, user.passwordHash)

  if (!isValid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Authentication successful
  req.session.userId = user.id

  return Response.json({ success: true })
})
```

## Security Headers

Add important security headers to all responses:

```typescript
function securityHeadersMiddleware(req, next) {
  const response = await next(req)

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Enable XSS protection in browsers
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // HTTP Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Permissions Policy (formerly Feature Policy)
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

router.use(securityHeadersMiddleware)
```

## Preventing SQL Injection

When working with databases, always use parameterized queries:

```typescript
import { Database } from 'bun:sqlite'
import { Router } from 'bun-router'

const router = new Router()
const db = new Database('app.db')

router.get('/users/:id', (req) => {
  const { id } = req.params

  // SAFE: Use prepared statements with parameters
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  const user = stmt.get(id)

  if (!user) {
    return new Response('User not found', { status: 404 })
  }

  return Response.json(user)
})

// AVOID: Never do this (vulnerable to SQL injection)
// const query = `SELECT * FROM users WHERE id = ${id}`
// const user = db.query(query).get()
```

## Expiring Idle Sessions

Configure sessions to expire after a period of inactivity:

```typescript
import { Router, session } from 'bun-router'

const router = new Router()

router.use(session({
  secret: process.env.SESSION_SECRET,
  maxAge: 30 * 60 * 1000, // 30 minutes
  rolling: true, // Extend session on activity
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}))

// Update last active timestamp on each request
router.use((req, next) => {
  if (req.session.userId) {
    req.session.lastActive = Date.now()
  }
  return next(req)
})
```

## File Upload Security

When handling file uploads, implement proper validation and restrictions:

```typescript
import { Router } from 'bun-router'

const router = new Router()

router.post('/upload', async (req) => {
  // Parse the multipart form data
  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file uploaded' }, { status: 400 })
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!validTypes.includes(file.type)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // Validate file size
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return Response.json({ error: 'File too large' }, { status: 400 })
  }

  // Generate a safe filename
  const timestamp = Date.now()
  const safeName = `${timestamp}-${file.name.replace(/[^a-z0-9.-]/gi, '_')}`

  // Save the file
  try {
    await Bun.write(`uploads/${safeName}`, file)
    return Response.json({ success: true, filename: safeName })
  }
  catch (error) {
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
})
```

## Conclusion

Implementing these security practices will significantly improve the security posture of your `bun-router` application. Remember to:

1. Always use HTTPS in production
2. Implement proper authentication and session management
3. Use CSRF protection for forms and state-changing requests
4. Validate and sanitize all user inputs
5. Apply security headers to all responses
6. Use secure cookie settings
7. Rate limit sensitive endpoints
8. Use Bun's secure password hashing

For specific security features, be sure to check out the dedicated documentation pages:

- [CSRF Protection](/features/csrf-protection)
- [Session Management](/features/session-management)
- [Cookie Handling](/features/cookie-handling)
- [Authentication](/features/authentication)
