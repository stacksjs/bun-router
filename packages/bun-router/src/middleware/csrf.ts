import type { EnhancedRequest, NextFunction, SecurityConfig } from '../types'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { config } from '../config'

/** Maximum number of issued tokens kept for verification (oldest evicted first). */
const MAX_TOKENS = 10_000

/** Token lifetime in milliseconds. */
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

export default class Csrf {
  // Issued tokens with their issue timestamp. Bounded (LRU by insertion
  // order) and TTL'd — the previous implementation grew without limit.
  private static tokens = new Map<string, number>()

  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    const csrfConfig: Partial<SecurityConfig['csrf']> = config.server?.security?.csrf ?? {}

    const method = req.method.toUpperCase()
    const ignoredMethods = ['GET', 'HEAD', 'OPTIONS', ...(csrfConfig?.ignoreMethods || [])]

    if (ignoredMethods.includes(method)) {
      // Safe methods don't need verification, but the response carries a
      // fresh token cookie so the client has something to submit later
      const token = this.generateToken(csrfConfig?.secret || 'csrf-secret')

      // Continue to next middleware
      const response = await next()
      if (!response) {
        return new Response('Not Found', { status: 404 })
      }

      // Add CSRF token cookie to response
      const cookieName = csrfConfig?.cookie?.name || 'csrf-token'
      const cookieOptions = []

      cookieOptions.push(`${cookieName}=${token}`)
      cookieOptions.push('Path=/')

      if (csrfConfig?.cookie?.options?.httpOnly) {
        cookieOptions.push('HttpOnly')
      }

      if (csrfConfig?.cookie?.options?.secure) {
        cookieOptions.push('Secure')
      }

      if (csrfConfig?.cookie?.options?.sameSite) {
        cookieOptions.push(`SameSite=${csrfConfig.cookie.options.sameSite}`)
      }

      const newHeaders = new Headers(response.headers)
      newHeaders.append('Set-Cookie', cookieOptions.join('; '))

      // Store token for verification (bounded + TTL)
      Csrf.storeToken(token)

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    }

    // Bearer-authed requests can't be CSRF'd — the token doesn't
    // ride on cookies, so a hostile origin can't trick a browser into
    // sending it. Mirrors Laravel Sanctum / Django REST framework /
    // express-csurf semantics. Filed against stacksjs/stacks#1922.
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')
    if (authHeader && /^Bearer\s+\S/i.test(authHeader)) {
      const response = await next()
      return response || new Response('Not Found', { status: 404 })
    }

    // For unsafe methods, verify the CSRF token
    // Check for token in headers or in the request body
    const rawToken = req.headers.get('X-CSRF-TOKEN')
      || req.jsonBody?.csrf_token
      || req.jsonBody?._token
      || null
    const token = typeof rawToken === 'string' ? rawToken : null

    // Get token from cookies for comparison
    const cookies = this.parseCookies(req)
    const cookieToken = cookies[csrfConfig?.cookie?.name || 'csrf-token']

    // Verify the token: double-submit value must match the cookie
    // (constant-time comparison) and must have been issued by us
    if (!token || !cookieToken
      || !Csrf.safeCompare(token, cookieToken)
      || !Csrf.isTokenValid(token)) {
      return new Response(
        JSON.stringify({ error: 'CSRF token validation failed' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Continue to next middleware if token is valid
    const response = await next()
    return response || new Response('Not Found', { status: 404 })
  }

  /**
   * Constant-time string comparison — a plain `!==` leaks how many leading
   * characters of the token were correct through response timing.
   */
  private static safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
      return false
    }
    return timingSafeEqual(bufA, bufB)
  }

  private static storeToken(token: string): void {
    if (Csrf.tokens.size >= MAX_TOKENS) {
      // Evict the oldest issued token (Map preserves insertion order)
      const oldest = Csrf.tokens.keys().next().value
      if (oldest !== undefined) {
        Csrf.tokens.delete(oldest)
      }
    }
    Csrf.tokens.set(token, Date.now())
  }

  private static isTokenValid(token: string): boolean {
    const issuedAt = Csrf.tokens.get(token)
    if (issuedAt === undefined) {
      return false
    }
    if (Date.now() - issuedAt > TOKEN_TTL_MS) {
      Csrf.tokens.delete(token)
      return false
    }
    return true
  }

  private generateToken(secret: string): string {
    const randomString = randomBytes(16).toString('hex')
    return createHash('sha256')
      .update(`${randomString}${secret}`)
      .digest('hex')
  }

  private parseCookies(req: Request): Record<string, string> {
    const cookieHeader = req.headers.get('cookie')
    if (!cookieHeader)
      return {}

    const cookies: Record<string, string> = {}
    for (const cookie of cookieHeader.split(';')) {
      const eqIndex = cookie.indexOf('=')
      if (eqIndex === -1)
        continue
      const name = cookie.slice(0, eqIndex).trim()
      if (!name)
        continue
      cookies[name] = cookie.slice(eqIndex + 1).trim()
    }
    return cookies
  }
}
