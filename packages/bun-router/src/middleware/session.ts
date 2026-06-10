import type { CookieOptions, EnhancedRequest, NextFunction } from '../types'
import type { SessionStore, SessionData } from '../types/core'
import { config } from '../config'
import { MemorySessionStore } from '../session/memory-store'
import { SessionManager, generateSessionId } from '../session/index'

/**
 * Session middleware with pluggable store support.
 *
 * By default uses an in-memory store. Configure with a different store
 * for persistent sessions (file, redis, database).
 *
 * @example
 * // Use default memory store
 * const session = new Session()
 *
 * // Use a custom store
 * import { RedisSessionStore } from 'bun-router/session'
 * const session = new Session({ store: new RedisSessionStore(redisClient) })
 */
export default class Session {
  private store: SessionStore<SessionData>

  constructor(options?: { store?: SessionStore<SessionData> }) {
    this.store = options?.store || new MemorySessionStore()
  }

  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    const sessionConfig = config.server?.security?.auth?.session

    const cookieName = sessionConfig?.name || 'session'

    // Get session ID from cookie or generate a new one
    let sessionId = req.cookies?.get(cookieName) || ''
    let isNewSession = false

    if (!sessionId) {
      sessionId = generateSessionId()
      isNewSession = true
    }

    // Load session data from store
    let sessionData = isNewSession ? null : await this.store.get(sessionId)

    if (!sessionData) {
      sessionData = { id: sessionId }
      isNewSession = true
    }

    // Create session manager and attach to request
    const manager = new SessionManager(sessionId, sessionData, this.store)
    req.session = manager

    // Continue to next middleware/handler
    const response = await next()

    // Save session after the response
    await manager.save()

    // Set session cookie on the response
    const cookieOptions: CookieOptions = {
      maxAge: sessionConfig?.cookie?.maxAge || 86400000,
      path: sessionConfig?.cookie?.path || '/',
    }

    if (sessionConfig?.cookie?.httpOnly !== false) {
      cookieOptions.httpOnly = true
    }

    if (sessionConfig?.cookie?.secure) {
      cookieOptions.secure = true
    }

    if (sessionConfig?.cookie?.sameSite) {
      cookieOptions.sameSite = sessionConfig.cookie.sameSite
    }

    // Add cookie to response via _cookiesToSet array
    if (!req._cookiesToSet) {
      req._cookiesToSet = []
    }

    req._cookiesToSet.push({
      name: cookieName,
      value: manager.id,
      options: cookieOptions,
    })

    return response || new Response('Not Found', { status: 404 })
  }
}
