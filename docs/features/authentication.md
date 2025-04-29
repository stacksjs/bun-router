# Authentication

bun-router provides flexible tools for implementing authentication in your web applications. This guide covers common authentication strategies and implementation patterns.

## Basic Authentication

The simplest form of authentication verifies credentials against a database or other source:

```typescript
import { Router, session } from 'bun-router'

const router = new Router()

// Add session middleware
router.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}))

// Login route
router.post('/login', async (req) => {
  const { email, password } = await req.json()

  try {
    // Find user (example function)
    const user = await findUserByEmail(email)

    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify password using Bun's built-in password verification
    const passwordValid = await Bun.password.verify(password, user.passwordHash)

    if (!passwordValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Store user in session
    req.session.userId = user.id

    // Respond with success
    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  }
  catch (error) {
    console.error('Login error:', error)
    return Response.json({ error: 'Authentication failed' }, { status: 500 })
  }
})

// Logout route
router.post('/logout', (req) => {
  // Clear the session
  req.session = {}

  return new Response('Logged out successfully')
})
```

## Authentication Helper

bun-router provides a comprehensive authentication helper that makes it easy to implement various authentication methods in your application. The authentication helper supports:

- Basic Authentication
- Bearer Token Authentication
- JWT Authentication
- API Key Authentication
- OAuth2 Authentication

Here's how to use each method:

### Basic Authentication

```typescript
import { Router, basicAuth } from 'bun-router'

const router = new Router()

// Basic auth middleware
const auth = basicAuth(async (credentials, req) => {
  // Verify credentials against your user database
  if (credentials.username === 'admin' && credentials.password === 'secret') {
    return true
  }
  return false
}, { realm: 'Protected Area' })

// Apply to a route
router.get('/admin', auth, (req) => {
  return new Response('Welcome to the admin area!')
})

// Apply to a group of routes
router.group({
  middleware: [auth]
}, () => {
  router.get('/dashboard', (req) => {
    return new Response('Dashboard')
  })

  router.get('/settings', (req) => {
    return new Response('Settings')
  })
})
```

### Bearer Token Authentication

```typescript
import { Router, bearerAuth } from 'bun-router'

const router = new Router()

// Bearer auth middleware
const auth = bearerAuth(async (token, req) => {
  // Verify the token against your token storage
  const validTokens = ['valid-token-123', 'another-valid-token']
  return validTokens.includes(token)
})

router.get('/api/protected', auth, (req) => {
  return Response.json({ message: 'Protected data' })
})
```

### JWT Authentication

```typescript
import { Router, jwtAuth, Auth } from 'bun-router'

const router = new Router()
const JWT_SECRET = 'your-jwt-secret'

// Create a JWT instance for signing tokens
const jwt = new Auth.JWT(JWT_SECRET)

// JWT auth middleware
const auth = jwtAuth(async (token, req) => {
  try {
    // Verify the token
    const payload = jwt.verify(token, {
      issuer: 'your-app',
      audience: 'your-api'
    })

    if (payload) {
      // Attach the payload to the request
      (req as any).user = payload
      return true
    }

    return false
  } catch (error) {
    return false
  }
})

// Login and token generation
router.post('/api/login', async (req) => {
  const { username, password } = await req.json()

  // Authenticate user (example)
  const user = await authenticateUser(username, password)

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Generate JWT
  const token = jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles
    },
    {
      expiresIn: '1h',
      issuer: 'your-app',
      audience: 'your-api'
    }
  )

  return Response.json({ token })
})

// Protected route
router.get('/api/user', auth, (req) => {
  // User payload is attached to req.user by the middleware
  return Response.json({ user: (req as any).user })
})
```

### API Key Authentication

```typescript
import { Router, apiKeyAuth, Auth } from 'bun-router'

const router = new Router()

// Create an API key manager
const apiKeyManager = new Auth.ApiKeyManager({
  source: 'header', // Can be 'header', 'query', or 'cookie'
  keyName: 'X-API-Key'
})

// Generate some API keys
const userKey = apiKeyManager.generateKey('user1', ['read'])
const adminKey = apiKeyManager.generateKey('admin', ['read', 'write', 'admin'])

console.log('User API Key:', userKey)
console.log('Admin API Key:', adminKey)

// API key middleware
const auth = apiKeyAuth(async (key, req) => {
  return apiKeyManager.validateKey(key)
}, { source: 'header', key: 'X-API-Key' })

// Middleware for checking specific scopes
const requireScope = (scope: string) => {
  return async (req: any, next: Function) => {
    const apiKey = apiKeyManager.extractFromRequest(req)

    if (!apiKey) {
      return new Response('Unauthorized', { status: 401 })
    }

    const keyInfo = apiKeyManager.getKeyInfo(apiKey)

    if (!keyInfo || !keyInfo.scopes.includes(scope)) {
      return new Response('Forbidden', { status: 403 })
    }

    return next()
  }
}

// Public endpoint that requires authentication
router.get('/api/data', auth, (req) => {
  return Response.json({ message: 'Data accessed successfully' })
})

// Admin endpoint that requires specific permission
router.group({
  middleware: [auth, requireScope('admin')]
}, () => {
  router.get('/api/admin', (req) => {
    return Response.json({ message: 'Admin access granted' })
  })
})
```

### OAuth2 Authentication

```typescript
import { Router, oauth2Auth, Auth } from 'bun-router'

const router = new Router()

// Create OAuth2 helper
const oauth = new Auth.OAuth2Helper({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  authorizeUrl: 'https://provider.com/oauth/authorize',
  tokenUrl: 'https://provider.com/oauth/token',
  redirectUri: 'http://localhost:3000/auth/callback',
  scope: 'email profile'
})

// Start OAuth flow
router.get('/auth/login', (req) => {
  // Generate state for CSRF protection
  const state = crypto.randomUUID()

  // Store state in session or other storage
  // req.session.oauthState = state

  // Get authorization URL
  const authUrl = oauth.getAuthorizationUrl({
    state,
    prompt: 'consent'
  })

  // Redirect user to authorization page
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl
    }
  })
})

// Handle OAuth callback
router.get('/auth/callback', async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // Verify state parameter
  // const sessionState = req.session.oauthState
  // if (!state || state !== sessionState) {
  //   return new Response('Invalid state', { status: 400 })
  // }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 })
  }

  try {
    // Exchange code for token
    const tokenResponse = await oauth.exchangeCodeForToken(code)

    // Extract tokens
    const accessToken = tokenResponse.access_token
    const refreshToken = tokenResponse.refresh_token

    // TODO: Store tokens and authenticate user

    return Response.json({
      message: 'Authentication successful',
      tokenInfo: tokenResponse
    })
  } catch (error) {
    return Response.json({
      error: 'Failed to exchange code for token',
      details: error.message
    }, { status: 400 })
  }
})

// OAuth token verification middleware
const auth = oauth2Auth(async (token, req) => {
  // Verify token with provider
  try {
    const response = await fetch('https://provider.com/api/tokeninfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (response.ok) {
      // Attach user info to request
      const userData = await response.json()
      (req as any).user = userData
      return true
    }

    return false
  } catch (error) {
    return false
  }
})

// Protected route
router.get('/api/profile', auth, (req) => {
  return Response.json({ user: (req as any).user })
})
```

## User Registration

When registering new users, you'll need to hash passwords before storing them:

```typescript
router.post('/register', async (req) => {
  const { name, email, password } = await req.json()

  try {
    // Check if user already exists
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return Response.json({ error: 'Email already in use' }, { status: 400 })
    }

    // Hash the password using Bun's built-in password hashing
    // Default is argon2id, but you can specify bcrypt if preferred
    const passwordHash = await Bun.password.hash(password, {
      algorithm: 'argon2id', // Or 'bcrypt' if preferred
      // For bcrypt, you can specify cost: 10 (or another value)
      // For argon2id, you can specify memoryCost, timeCost, etc.
    })

    // Create user in database
    const user = await createUser({
      name,
      email,
      passwordHash
    })

    // Log the user in by setting session
    req.session.userId = user.id

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  }
  catch (error) {
    console.error('Registration error:', error)
    return Response.json({ error: 'Registration failed' }, { status: 500 })
  }
})

## Authentication Middleware

Create a middleware to protect routes that require authentication:

```typescript
function requireAuth(req, next) {
  // Check if user is authenticated
  if (!req.session?.userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Continue to the route handler
  return next(req)
}

// Apply to individual routes
router.get('/profile', requireAuth, (req) => {
  return new Response('Profile page')
})

// Or apply to groups of routes
router.group({
  middleware: [requireAuth]
}, () => {
  router.get('/dashboard', (req) => {
    return new Response('Dashboard')
  })

  router.get('/settings', (req) => {
    return new Response('Settings')
  })
})
```

## User Information Middleware

For convenience, you can create middleware that fetches the current user:

```typescript
async function fetchUser(req, next) {
  // Skip if no user is logged in
  if (!req.session?.userId) {
    return next(req)
  }

  try {
    // Fetch user from database
    const user = await getUserById(req.session.userId)

    if (user) {
      // Attach user to request
      req.user = user
    }
    else {
      // User not found, clear session
      req.session = {}
    }
  }
  catch (error) {
    console.error('Error fetching user:', error)
  }

  return next(req)
}

// Apply middleware globally
router.use(fetchUser)

// Now all routes have access to req.user
router.get('/welcome', (req) => {
  const name = req.user?.name || 'Guest'
  return new Response(`Welcome, ${name}!`)
})
```

## Role-Based Authorization

Implement role-based access control to restrict access based on user roles:

```typescript
// Middleware to check user roles
function requireRole(role) {
  return (req, next) => {
    // First check if user is authenticated
    if (!req.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Then check if user has the required role
    if (!req.user.roles.includes(role)) {
      return new Response('Forbidden', { status: 403 })
    }

    return next(req)
  }
}

// Apply to routes
router.get('/admin', requireRole('admin'), (req) => {
  return new Response('Admin Dashboard')
})

router.get('/moderator', requireRole('moderator'), (req) => {
  return new Response('Moderator Dashboard')
})

// Check multiple roles
function requireAnyRole(roles) {
  return (req, next) => {
    if (!req.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const hasRequiredRole = roles.some(role => req.user.roles.includes(role))

    if (!hasRequiredRole) {
      return new Response('Forbidden', { status: 403 })
    }

    return next(req)
  }
}

router.get('/reports', requireAnyRole(['admin', 'analyst']), (req) => {
  return new Response('Reports')
})
```

## JWT Authentication

For stateless APIs, JSON Web Tokens (JWT) provide a popular authentication mechanism:

```typescript
import { Router } from 'bun-router'
import { sign, verify } from 'jsonwebtoken'

const router = new Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'

// Login and generate token
router.post('/api/login', async (req) => {
  const { email, password } = await req.json()

  // Authenticate user (example)
  const user = await authenticateUser(email, password)

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Generate JWT
  const token = sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  return Response.json({ token })
})

// JWT verification middleware
function verifyJWT(req, next) {
  // Get token from Authorization header
  const authHeader = req.headers.get('Authorization')
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return Response.json({ error: 'No token provided' }, { status: 401 })
  }

  try {
    // Verify token
    const decoded = verify(token, JWT_SECRET)

    // Attach decoded token to request
    req.user = decoded

    return next(req)
  }
  catch (error) {
    return Response.json({ error: 'Invalid token' }, { status: 403 })
  }
}

// Protected API routes
router.get('/api/profile', verifyJWT, (req) => {
  return Response.json({
    id: req.user.sub,
    email: req.user.email
  })
})
```

## Combining Session and JWT Authentication

For applications that serve both browser clients and API consumers, you can combine approaches:

```typescript
import { Router, session } from 'bun-router'
import { sign, verify } from 'jsonwebtoken'

const router = new Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'

// Add session middleware for browser clients
router.use(session({
  secret: process.env.SESSION_SECRET || 'session-secret',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}))

// Authentication middleware that checks both session and JWT
function authenticate(req, next) {
  // First, check for session authentication
  if (req.session?.userId) {
    // Set user info from session
    req.user = { id: req.session.userId }
    return next(req)
  }

  // If no session, check for JWT
  const authHeader = req.headers.get('Authorization')
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (token) {
    try {
      const decoded = verify(token, JWT_SECRET)
      req.user = {
        id: decoded.sub,
        roles: decoded.roles
      }
      return next(req)
    }
    catch (error) {
      // JWT verification failed, but we'll continue
      // to allow unauthenticated access if the route permits it
    }
  }

  // No authentication found, but proceed anyway
  // (protected routes will check req.user)
  return next(req)
}

// Apply authentication middleware globally
router.use(authenticate)

// Protected route middleware
function requireAuth(req, next) {
  if (!req.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  return next(req)
}

// Routes
router.get('/profile', requireAuth, (req) => {
  return Response.json({ userId: req.user.id })
})

router.get('/public', (req) => {
  return new Response('Public content')
})
```

## OAuth Authentication

For third-party authentication (Google, GitHub, etc.), implement OAuth flows:

```typescript
import { Router, session } from 'bun-router'

const router = new Router()
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3000/auth/github/callback'

router.use(session({
  secret: process.env.SESSION_SECRET
}))

// Initiate GitHub OAuth flow
router.get('/auth/github', (req) => {
  const authUrl = new URL('https://github.com/login/oauth/authorize')
  authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('scope', 'user:email')

  // Generate and store a state parameter to prevent CSRF
  const state = crypto.randomUUID()
  req.session.oauthState = state
  authUrl.searchParams.set('state', state)

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString()
    }
  })
})

// Handle OAuth callback
router.get('/auth/github/callback', async (req) => {
  const params = new URL(req.url).searchParams
  const code = params.get('code')
  const state = params.get('state')

  // Verify state parameter to prevent CSRF
  if (!state || state !== req.session.oauthState) {
    return new Response('Invalid state parameter', { status: 400 })
  }

  // Clear the state from session
  delete req.session.oauthState

  if (!code) {
    return new Response('Authorization code required', { status: 400 })
  }

  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    })
  })

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token

  if (!accessToken) {
    return new Response('Failed to get access token', { status: 400 })
  }

  // Get user info from GitHub
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  })

  const userData = await userResponse.json()

  // Create or update user in database
  const user = await findOrCreateUser({
    providerId: userData.id,
    provider: 'github',
    username: userData.login,
    name: userData.name,
    email: userData.email,
    avatar: userData.avatar_url
  })

  // Log the user in
  req.session.userId = user.id

  // Redirect to dashboard
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/dashboard'
    }
  })
})
```

## Magic Link Authentication

Implement passwordless authentication with email magic links:

```typescript
import { Router, session } from 'bun-router'

const router = new Router()
const EMAIL_SECRET = process.env.EMAIL_SECRET || 'email-token-secret'

router.use(session({
  secret: process.env.SESSION_SECRET
}))

// Request a magic link
router.post('/auth/email', async (req) => {
  const { email } = await req.json()

  // Find or create user
  const user = await findOrCreateUserByEmail(email)

  // Generate a token
  const token = sign(
    { sub: user.id, email },
    EMAIL_SECRET,
    { expiresIn: '15m' }
  )

  // Create magic link
  const magicLink = `http://localhost:3000/auth/email/verify?token=${token}`

  // Send email with magic link (example)
  await sendEmail({
    to: email,
    subject: 'Your Login Link',
    text: `Click this link to log in: ${magicLink}`
  })

  return Response.json({
    message: 'Magic link sent to your email'
  })
})

// Verify magic link
router.get('/auth/email/verify', async (req) => {
  const token = new URL(req.url).searchParams.get('token')

  if (!token) {
    return new Response('Invalid or missing token', { status: 400 })
  }

  try {
    // Verify the token
    const decoded = verify(token, EMAIL_SECRET)

    // Log the user in
    req.session.userId = decoded.sub

    // Redirect to dashboard
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/dashboard'
      }
    })
  }
  catch (error) {
    return new Response('Invalid or expired token', { status: 400 })
  }
})
```

## Multi-Factor Authentication (MFA)

Implement MFA using TOTP (Time-based One-Time Password):

```typescript
import { Router, session } from 'bun-router'
import { authenticator } from 'otplib'
import { toDataURL } from 'qrcode'

const router = new Router()

router.use(session({
  secret: process.env.SESSION_SECRET
}))

// Generate TOTP secret and QR code
router.post('/mfa/setup', requireAuth, async (req) => {
  // Generate a secret
  const secret = authenticator.generateSecret()

  // Store secret temporarily in session
  req.session.tempMfaSecret = secret

  // Create otpauth URL
  const otpauthUrl = authenticator.keyuri(
    req.user.email,
    'YourAppName',
    secret
  )

  // Generate QR code
  const qrCodeUrl = await toDataURL(otpauthUrl)

  return Response.json({
    secret,
    qrCodeUrl
  })
})

// Verify and activate MFA
router.post('/mfa/verify', requireAuth, async (req) => {
  const { token } = await req.json()
  const secret = req.session.tempMfaSecret

  if (!secret) {
    return Response.json({ error: 'Setup process not initiated' }, { status: 400 })
  }

  // Verify token
  const isValid = authenticator.verify({
    token,
    secret
  })

  if (!isValid) {
    return Response.json({ error: 'Invalid verification code' }, { status: 400 })
  }

  // Save the verified secret to the user's profile
  await updateUser(req.user.id, {
    mfaEnabled: true,
    mfaSecret: secret
  })

  // Clear temporary secret
  delete req.session.tempMfaSecret

  return Response.json({
    success: true,
    message: 'MFA activated successfully'
  })
})

// Login with MFA
router.post('/login', async (req) => {
  const { email, password } = await req.json()

  // Authenticate user
  const user = await authenticateUser(email, password)

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Check if MFA is enabled
  if (user.mfaEnabled) {
    // Store partial authentication in session
    req.session.pendingMfaUser = user.id

    return Response.json({
      success: true,
      requiresMfa: true,
      message: 'MFA verification required'
    })
  }

  // No MFA, complete authentication
  req.session.userId = user.id
  delete req.session.pendingMfaUser

  return Response.json({
    success: true,
    user: {
      id: user.id,
      email: user.email
    }
  })
})

// Verify MFA during login
router.post('/mfa/login', async (req) => {
  const { token } = await req.json()
  const userId = req.session.pendingMfaUser

  if (!userId) {
    return Response.json({ error: 'No pending MFA authentication' }, { status: 400 })
  }

  // Get user with MFA secret
  const user = await getUserById(userId)

  // Verify token
  const isValid = authenticator.verify({
    token,
    secret: user.mfaSecret
  })

  if (!isValid) {
    return Response.json({ error: 'Invalid verification code' }, { status: 401 })
  }

  // Complete authentication
  req.session.userId = user.id
  delete req.session.pendingMfaUser

  return Response.json({
    success: true,
    user: {
      id: user.id,
      email: user.email
    }
  })
})
```

## Remember Me Functionality

Implement "Remember Me" for longer-lived sessions:

```typescript
import { Router, session } from 'bun-router'

const router = new Router()

router.use(session({
  secret: process.env.SESSION_SECRET,
  // Default session lifetime: 1 day
  maxAge: 24 * 60 * 60 * 1000
}))

router.post('/login', async (req) => {
  const { email, password, rememberMe } = await req.json()

  // Authenticate user
  const user = await authenticateUser(email, password)

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Store user in session
  req.session.userId = user.id

  // If "Remember Me" is checked, extend session lifetime
  if (rememberMe) {
    // Set a long session lifetime (30 days)
    req.session.cookie = {
      ...req.session.cookie,
      maxAge: 30 * 24 * 60 * 60 * 1000
    }
  }

  return Response.json({ success: true })
})
```

## Account Lockout Protection

Implement account lockout after multiple failed login attempts:

```typescript
import { redis } from 'bun'
import { Router, session } from 'bun-router'

const router = new Router()
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 // 15 minutes (in seconds)

router.use(session({
  secret: process.env.SESSION_SECRET
}))

router.post('/login', async (req) => {
  const { email, password } = await req.json()

  // Check if account is locked
  const lockKey = `login:lock:${email}`
  const isLocked = await redis.exists(lockKey)

  if (isLocked) {
    const ttl = await redis.ttl(lockKey)
    return Response.json({
      error: 'Account temporarily locked',
      lockTimeRemaining: ttl
    }, { status: 429 })
  }

  // Get failed attempts
  const attemptsKey = `login:attempts:${email}`
  const attempts = Number.parseInt(await redis.get(attemptsKey) || '0')

  // Authenticate user
  const user = await findUserByEmail(email)

  if (!user || !(await Bun.password.verify(password, user.passwordHash))) {
    // Increment failed attempts
    const newAttempts = attempts + 1
    await redis.set(attemptsKey, newAttempts)

    // Set expiry on attempts key if not already set
    if (newAttempts === 1) {
      await redis.expire(attemptsKey, 24 * 60 * 60) // 24 hours
    }

    // Lock account if max attempts reached
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      await redis.set(lockKey, '1')
      await redis.expire(lockKey, LOCKOUT_TIME)

      // Reset attempts counter
      await redis.del(attemptsKey)

      return Response.json({
        error: 'Account locked due to too many failed attempts',
        lockTimeRemaining: LOCKOUT_TIME
      }, { status: 429 })
    }

    return Response.json({
      error: 'Invalid credentials',
      attemptsRemaining: MAX_FAILED_ATTEMPTS - newAttempts
    }, { status: 401 })
  }

  // Successful login, clear failed attempts
  await redis.del(attemptsKey)

  // Set user in session
  req.session.userId = user.id

  return Response.json({
    success: true,
    user: {
      id: user.id,
      email: user.email
    }
  })
})
```

## Security Best Practices

When implementing authentication, follow these security best practices:

1. **Use HTTPS**: Always serve authentication-related pages over HTTPS.

2. **Secure Passwords**: Use Bun's built-in password hashing with argon2id (default) or bcrypt.

   ```typescript
   // Generating a secure password hash
   const passwordHash = await Bun.password.hash(password)

   // Verifying the password
   const isValid = await Bun.password.verify(password, passwordHash)
   ```

3. **Rate Limiting**: Implement rate limiting for login attempts.

4. **CSRF Protection**: Use bun-router's CSRF protection for forms.

5. **HTTP-Only Cookies**: Always set the `httpOnly` flag for session cookies.

6. **Secure Cookie Flag**: Set the `secure` flag in production.

7. **SameSite Cookie Attribute**: Use `sameSite: 'lax'` or `sameSite: 'strict'`.

8. **Content Security Policy**: Implement CSP headers to prevent XSS attacks.

9. **Regenerate Session IDs**: Generate new session IDs after authentication changes.

10. **Validate Inputs**: Always validate and sanitize user inputs.

## Next Steps

Now that you understand authentication in bun-router, check out these related topics:

- [Session Management](/features/session-management) - Learn more about session handling
- [CSRF Protection](/features/csrf-protection) - Understand how to protect against CSRF attacks
- [Route Groups](/features/route-groups) - Organize routes with shared authentication
- [Middleware](/features/middleware) - Create custom authentication middleware
