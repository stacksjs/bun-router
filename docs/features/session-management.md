# Session Management

bun-router provides a robust session management system to maintain state across multiple requests from the same client. This is essential for features like user authentication, shopping carts, and other stateful interactions.

## Basic Session Usage

To use sessions in your application, first add the session middleware:

```typescript
import { Router, session } from 'bun-router'

const router = new Router()

// Add session middleware
router.use(session({
  secret: 'your-secure-session-secret',
  // Other options...
}))

// Now all route handlers will have access to session data
router.get('/', (req) => {
  // Get session data
  const visits = (req.session.visits || 0) + 1

  // Store data in the session
  req.session.visits = visits

  return new Response(`You have visited this page ${visits} times.`)
})
```

## Session Configuration Options

The session middleware accepts various configuration options:

```typescript
router.use(session({
  // Required: Secret used to sign session cookies
  secret: 'your-secure-session-secret',

  // Name of the session cookie (default: 'bun_session')
  name: 'my_app_session',

  // Session lifetime in milliseconds (default: 1 day)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week

  // Cookie options
  cookie: {
    // Restrict cookie to HTTPS connections
    secure: true,

    // Prevent client-side access to cookie
    httpOnly: true,

    // Controls when cookies are sent in cross-site requests
    sameSite: 'lax', // 'strict', 'lax', or 'none'

    // Cookie domain (default: current domain)
    domain: 'example.com',

    // Cookie path (default: '/')
    path: '/',
  },

  // Session storage mechanism (default: 'memory')
  store: 'memory', // or a custom store implementation

  // Auto-commit session changes (default: true)
  autoCommit: true,

  // Rolling session expiration (default: false)
  rolling: true,

  // Renew session ID periodically (default: false)
  renew: false,

  // Session ID generation function (custom implementation)
  genid: () => crypto.randomUUID()
}))
```

## Working with Session Data

Once the session middleware is added, you can access and modify session data in your route handlers:

```typescript
// Read from session
router.get('/profile', (req) => {
  const user = req.session.user

  if (!user) {
    return new Response('Please log in', {
      status: 401
    })
  }

  return Response.json({
    username: user.username,
    email: user.email,
    lastActive: user.lastActive
  })
})

// Write to session
router.post('/login', async (req) => {
  const { username, password } = await req.json()

  // Validate credentials (example)
  const user = await authenticateUser(username, password)

  if (!user) {
    return new Response('Invalid credentials', {
      status: 401
    })
  }

  // Store user info in session
  req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    lastActive: new Date()
  }

  return Response.json({ success: true })
})

// Delete from session
router.post('/logout', (req) => {
  // Remove user from session
  delete req.session.user

  // Or clear the entire session
  req.session = {}

  return new Response('Logged out successfully')
})
```

## Session Storage Options

bun-router supports multiple storage mechanisms for session data:

### Memory Store (Default)

The memory store keeps all session data in server memory. This is simple but not suitable for production environments with multiple server instances:

```typescript
router.use(session({
  secret: 'your-secret',
  store: 'memory' // This is the default
}))
```

### File Store

The file store persists sessions to the filesystem:

```typescript
import { fileStore } from 'bun-router'

router.use(session({
  secret: 'your-secret',
  store: fileStore({
    path: './sessions', // Directory to store session files
    encoding: 'utf8',
    fileExtension: '.sess'
  })
}))
```

### Redis Store

For production applications, Redis is recommended for session storage. `bun-router` integrates with Bun's native Redis client for optimal performance:

```typescript
import { redis } from 'bun'
import { redisStore } from 'bun-router'

// Bun's built-in Redis client is used by default
// It reads from process.env.REDIS_URL or defaults to "redis://localhost:6379"
router.use(session({
  secret: 'your-secret',
  store: redisStore({
    // Optional prefix for Redis keys
    prefix: 'sess:',
    // Session TTL in seconds (1 day)
    ttl: 86400
  })
}))
```

For custom Redis configuration:

```typescript
import { RedisClient } from 'bun'
import { redisStore } from 'bun-router'

// Create a custom Redis client
const client = new RedisClient('redis://username:password@redis-server:6379', {
  // Connection timeout in milliseconds
  connectionTimeout: 5000,
  // Whether to automatically reconnect on disconnection
  autoReconnect: true,
  // TLS options
  tls: process.env.NODE_ENV === 'production'
})

router.use(session({
  secret: 'your-secret',
  store: redisStore({
    client,
    prefix: 'app:sess:',
    ttl: 86400
  })
}))
```

Bun's Redis client automatically handles connection pooling, reconnections, and pipelining for optimal performance.

### Custom Store

You can implement a custom session store by creating a class that implements the `SessionStore` interface:

```typescript
import { SessionStore } from 'bun-router'

class MyCustomStore implements SessionStore {
  async get(sid: string): Promise<Record<string, any> | null> {
    // Retrieve session data for the given session ID
    // Return null if no session exists
  }

  async set(sid: string, session: Record<string, any>, ttl?: number): Promise<void> {
    // Store session data with the given session ID
    // Use ttl if provided (in seconds)
  }

  async destroy(sid: string): Promise<void> {
    // Delete the session with the given ID
  }

  async touch(sid: string, ttl: number): Promise<void> {
    // Update the expiration for the given session ID
  }
}

router.use(session({
  secret: 'your-secret',
  store: new MyCustomStore()
}))
```

## Flash Messages

Flash messages are temporary session data that persist only until the next request, useful for passing success/error messages between redirects:

```typescript
// Set a flash message
router.post('/articles', async (req) => {
  // Save the article...

  // Set flash message
  req.flash('success', 'Article created successfully!')

  // Redirect to article list
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/articles'
    }
  })
})

// Read flash messages
router.get('/articles', (req) => {
  // Get all flash messages and clear them
  const messages = req.flash()

  // Or get specific type of flash messages
  const successMessages = req.flash('success')
  const errorMessages = req.flash('error')

  // Generate HTML with flash messages
  const flashHTML = generateFlashHTML(messages)

  // Return response with flash messages
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        ${flashHTML}
        <h1>Articles</h1>
        <!-- Article list -->
      </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
})
```

## Session Expiration and Renewal

You can control how sessions expire and renew:

### Rolling Sessions

Rolling sessions extend the expiration time on each request:

```typescript
router.use(session({
  secret: 'your-secret',
  maxAge: 30 * 60 * 1000, // 30 minutes
  rolling: true // Extend session expiration on each request
}))
```

### Session Renewal

For security, you can periodically regenerate the session ID while preserving session data:

```typescript
router.use(session({
  secret: 'your-secret',
  renew: true, // Periodically regenerate session ID
  renewAfter: 60 * 60 * 1000 // Renew after 1 hour of activity
}))
```

### Manual Session Management

For more control, you can manually regenerate or destroy sessions:

```typescript
// Regenerate session ID (keeps data)
router.post('/password/change', async (req) => {
  // Verify current password and update to new password

  // Generate a new session ID (helps prevent session fixation attacks)
  await req.regenerateSession()

  return Response.json({ success: true })
})

// Destroy session entirely
router.post('/account/delete', async (req) => {
  // Delete user account

  // Completely destroy the session
  await req.destroySession()

  return new Response('Account deleted', {
    status: 302,
    headers: {
      Location: '/'
    }
  })
})
```

## Session Security

Follow these best practices to secure your sessions:

1. **Use Strong Secrets**: Generate a strong, unique secret for signing session cookies.

```typescript
// Generate a strong random secret
const secret = crypto.randomBytes(32).toString('hex')

router.use(session({
  secret,
  // Other options...
}))
```

2. **HTTPS Only**: In production, set `secure: true` to restrict cookies to HTTPS connections.

3. **Set httpOnly**: Always use `httpOnly: true` to prevent JavaScript access to session cookies.

4. **Use SameSite Policy**: Set `sameSite: 'lax'` or `sameSite: 'strict'` to mitigate CSRF attacks.

5. **Session ID Regeneration**: Regenerate session IDs after authentication state changes.

6. **Session Timeouts**: Set appropriate `maxAge` values based on sensitivity of the data.

## Session with Authentication

Here's a complete example of using sessions for user authentication:

```typescript
import { compare } from 'bcrypt'
import { Router, session } from 'bun-router'
import { db } from './database'

const router = new Router()

// Add session middleware
router.use(session({
  secret: process.env.SESSION_SECRET || 'your-secure-secret',
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}))

// Authentication middleware
function requireAuth(req, next) {
  if (!req.session.userId) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        Location: '/login'
      }
    })
  }
  return next(req)
}

// Login route
router.post('/login', async (req) => {
  const { email, password } = await req.json()

  // Find user by email
  const user = await db.users.findUnique({ where: { email } })

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Verify password
  const passwordValid = await compare(password, user.passwordHash)

  if (!passwordValid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Regenerate session to prevent session fixation
  await req.regenerateSession()

  // Store user ID in session
  req.session.userId = user.id
  req.session.lastActive = new Date()

  return Response.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  })
})

// Get current user route
router.get('/me', requireAuth, async (req) => {
  // Get user from database
  const user = await db.users.findUnique({
    where: { id: req.session.userId }
  })

  if (!user) {
    // User was deleted, clear session
    await req.destroySession()
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // Update last active timestamp
  req.session.lastActive = new Date()

  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name
  })
})

// Logout route
router.post('/logout', async (req) => {
  // Destroy the session
  await req.destroySession()

  return new Response('Logged out', {
    status: 302,
    headers: {
      Location: '/'
    }
  })
})
```

## Session Stores in Clustered Environments

When running `bun-router` in a clustered or distributed environment (multiple server instances), you must use a shared session store to ensure session data is consistent across instances:

```typescript
import { redis, RedisClient } from 'bun'
import { redisStore, Router, session } from 'bun-router'

const router = new Router()

// Use Bun's built-in Redis client
// It automatically reads from process.env.REDIS_URL or defaults to localhost:6379
router.use(session({
  secret: process.env.SESSION_SECRET,
  store: redisStore({
    prefix: 'app:sess:',
    ttl: 86400 // 1 day in seconds
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}))

// Alternatively, create a custom Redis client with specific options
// const client = new RedisClient(process.env.REDIS_URL || "redis://localhost:6379", {
//   connectionTimeout: 5000,
//   autoReconnect: true,
//   maxRetries: 10
// })
//
// router.use(session({
//   secret: process.env.SESSION_SECRET,
//   store: redisStore({ client, prefix: 'app:sess:', ttl: 86400 }),
//   // ... cookie options
// }))
```

This ensures that users can be routed to any server instance while maintaining their session state.

## Working with JSON Web Tokens (JWT) and Sessions

You can combine sessions with JWT for enhanced security and flexibility:

```typescript
import { Router, session } from 'bun-router'
import { sign, verify } from 'jsonwebtoken'

const router = new Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'

router.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret'
}))

// Login and generate both session and JWT
router.post('/login', async (req) => {
  const { username, password } = await req.json()

  // Authenticate user (example)
  const user = await authenticateUser(username, password)

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Store minimal data in session
  req.session.userId = user.id

  // Generate JWT with user data
  const token = sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  return Response.json({
    token,
    user: {
      id: user.id,
      username: user.username
    }
  })
})

// API routes with JWT authentication
router.get('/api/protected', (req) => {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return Response.json({ error: 'No token provided' }, { status: 401 })
  }

  try {
    const decoded = verify(token, JWT_SECRET)
    return Response.json({
      message: 'Protected data',
      user: decoded
    })
  }
  catch (err) {
    return Response.json({ error: 'Invalid token' }, { status: 403 })
  }
})

// Web routes with session authentication
router.get('/dashboard', (req) => {
  if (!req.session.userId) {
    return new Response('Redirect to login page', {
      status: 302,
      headers: {
        Location: '/login'
      }
    })
  }

  return new Response('Dashboard content')
})
```

This approach gives you:

- Sessions for traditional web routes (with cookies)
- JWTs for API/mobile clients that may not support cookies
- Reduced session payload size (storing only IDs in the session)

## Testing Sessions

When writing tests for code that uses sessions, you'll need to set up the session middleware and mock session data:

```typescript
import { expect, test } from 'bun:test'
import { Router, session } from 'bun-router'

test('authenticated route should return user data', async () => {
  const router = new Router()

  // Setup session middleware with test secret
  router.use((req, next) => {
    // Mock session data for testing
    req.session = {
      userId: 123,
      username: 'testuser'
    }
    return next(req)
  })

  router.get('/profile', (req) => {
    if (!req.session.userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    return Response.json({
      userId: req.session.userId,
      username: req.session.username
    })
  })

  // Create a test request
  const request = new Request('http://localhost/profile')

  // Process the request
  const response = await router.handle(request)

  // Verify the response
  expect(response.status).toBe(200)

  const data = await response.json()
  expect(data).toEqual({
    userId: 123,
    username: 'testuser'
  })
})

test('unauthenticated route should return 401', async () => {
  const router = new Router()

  // Setup session middleware with empty session
  router.use((req, next) => {
    req.session = {}
    return next(req)
  })

  router.get('/profile', (req) => {
    if (!req.session.userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    return Response.json({
      userId: req.session.userId,
      username: req.session.username
    })
  })

  // Create a test request
  const request = new Request('http://localhost/profile')

  // Process the request
  const response = await router.handle(request)

  // Verify the response
  expect(response.status).toBe(401)
})
```

## Performance Considerations

Sessions can impact performance, especially with many concurrent users. Follow these tips:

1. **Minimize Session Data**: Store only necessary data in the session
2. **Use Efficient Stores**: For high-traffic sites, use Redis or a similar in-memory store
3. **Consider Session Cache**: Cache frequently accessed session data when appropriate
4. **Monitor Session Size**: Large sessions consume more bandwidth and processing time
5. **Session Cleanup**: Implement regular cleanup for expired sessions

## Next Steps

Now that you understand session management in bun-router, check out these related topics:

- [Authentication](/features/authentication) - Implement user authentication with sessions
- [CSRF Protection](/features/csrf-protection) - Protect against cross-site request forgery
- [Cookie Handling](/features/cookie-handling) - Learn more about cookies and how they relate to sessions
- [Middleware](/features/middleware) - Create custom middleware for session handling
