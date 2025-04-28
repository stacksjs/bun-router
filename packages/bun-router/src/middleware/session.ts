import type { EnhancedRequest, NextFunction } from '../types'
import { config } from '../config'

export default class Session {
  // Simple in-memory session store
  private static sessions: Map<string, any> = new Map()

  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    const sessionConfig = config.server?.security?.auth?.session

    // Skip if sessions are disabled
    if (!sessionConfig || !sessionConfig.enabled) {
      return next()
    }

    // Get session ID from cookie if it exists
    const cookies = this.parseCookies(req)
    let sessionId = cookies[sessionConfig.name || 'session']
    let session: any = {}

    // If there's a session ID, retrieve the session data
    if (sessionId && Session.sessions.has(sessionId)) {
      session = Session.sessions.get(sessionId)
    }
    else {
      // Create a new session ID
      sessionId = this.generateSessionId()
    }

    // Attach session to request
    Object.defineProperty(req, 'session', {
      value: session,
      writable: true,
      enumerable: true,
      configurable: true,
    })

    // Continue to next middleware
    const response = await next()

    // Store session data
    Session.sessions.set(sessionId, req.session)

    // Set session cookie
    const cookieOptions = []
    const maxAge = sessionConfig.cookie?.maxAge || 86400000

    cookieOptions.push(`${sessionConfig.name || 'session'}=${sessionId}`)
    cookieOptions.push(`Max-Age=${Math.floor(maxAge / 1000)}`)
    cookieOptions.push(`Path=${sessionConfig.cookie?.path || '/'}`)

    if (sessionConfig.cookie?.httpOnly) {
      cookieOptions.push('HttpOnly')
    }

    if (sessionConfig.cookie?.secure) {
      cookieOptions.push('Secure')
    }

    if (sessionConfig.cookie?.sameSite) {
      cookieOptions.push(`SameSite=${sessionConfig.cookie.sameSite}`)
    }

    // Add cookie to response headers
    const newHeaders = new Headers(response.headers)
    newHeaders.append('Set-Cookie', cookieOptions.join('; '))

    // Return response with session cookie
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  }

  private parseCookies(req: Request): Record<string, string> {
    const cookieHeader = req.headers.get('cookie')
    if (!cookieHeader)
      return {}

    return cookieHeader.split(';').reduce((cookies, cookie) => {
      const [name, value] = cookie.trim().split('=')
      cookies[name] = value
      return cookies
    }, {} as Record<string, string>)
  }

  private generateSessionId(): string {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)).join('')
  }
}
