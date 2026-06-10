import type { EnhancedRequest, NextFunction } from '../types'
import { config } from '../config'

// Default CORS headers.
//
// IMPORTANT: when credentials are NOT enabled it is safe to allow any origin
// with `*`. The default config below deliberately keeps credentials disabled.
// The `*` + `Allow-Credentials: true` combination is forbidden by the CORS
// spec and is dangerous (it lets any site read credentialed responses), so the
// logic in `getCorsHeaders` guarantees that combination can never be emitted.
const DEFAULT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Access-Control-Max-Age': '86400',
}

export default class Cors {
  /**
   * Resolve the `Access-Control-Allow-Origin` value for a request.
   *
   * Supports a string origin (`'*'` or an explicit origin) or an array of
   * allowed origins. For an allowlist, the request `Origin` is reflected back
   * only when it is present in the list. When credentials are enabled a literal
   * `*` is never returned (it would be both spec-violating and dangerous).
   */
  private resolveAllowOrigin(
    configuredOrigin: string | string[] | undefined,
    credentials: boolean,
    requestOrigin: string | null,
  ): { value: string | null, vary: boolean } {
    // Explicit allowlist: only reflect the request origin when it matches.
    if (Array.isArray(configuredOrigin)) {
      if (requestOrigin && configuredOrigin.includes(requestOrigin)) {
        return { value: requestOrigin, vary: true }
      }
      // Origin not allowed: do not emit an Allow-Origin header at all.
      return { value: null, vary: true }
    }

    const origin = configuredOrigin || '*'

    if (origin === '*') {
      // The `*` wildcard cannot be combined with credentials. When credentials
      // are enabled, reflect the specific request origin instead (which is the
      // only spec-compliant way to support credentialed cross-origin requests).
      if (credentials) {
        if (requestOrigin) {
          return { value: requestOrigin, vary: true }
        }
        // No request origin to reflect — omit the header rather than send `*`.
        return { value: null, vary: true }
      }
      return { value: '*', vary: false }
    }

    // A single explicit origin was configured.
    return { value: origin, vary: false }
  }

  private getCorsHeaders(req: EnhancedRequest): Record<string, string> {
    const corsConfig = (config.server as any)?.cors
    const requestOrigin = req.headers.get('origin')

    if (corsConfig && corsConfig.enabled) {
      const credentials = Boolean(corsConfig.credentials)
      const { value: allowOrigin, vary } = this.resolveAllowOrigin(corsConfig.origin, credentials, requestOrigin)

      const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': Array.isArray(corsConfig.methods) ? corsConfig.methods.join(', ') : DEFAULT_CORS_HEADERS['Access-Control-Allow-Methods'],
        'Access-Control-Allow-Headers': Array.isArray(corsConfig.allowedHeaders) ? corsConfig.allowedHeaders.join(', ') : DEFAULT_CORS_HEADERS['Access-Control-Allow-Headers'],
        'Access-Control-Max-Age': String(corsConfig.maxAge || 86400),
      }

      if (allowOrigin !== null) {
        headers['Access-Control-Allow-Origin'] = allowOrigin
      }

      // Only advertise credentials when an origin is actually allowed. Never
      // pair credentials with a `*` wildcard.
      if (credentials && allowOrigin !== null && allowOrigin !== '*') {
        headers['Access-Control-Allow-Credentials'] = 'true'
      }

      if (vary) {
        headers.Vary = 'Origin'
      }

      return headers
    }

    // No CORS config: fall back to the permissive (but credential-free) defaults.
    return { ...DEFAULT_CORS_HEADERS }
  }

  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    const corsHeaders = this.getCorsHeaders(req)

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Helper to add CORS headers to any response
    const addCorsHeaders = (response: Response): Response => {
      const newHeaders = new Headers(response.headers)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value)
      })
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    }

    try {
      // For non-OPTIONS requests, add CORS headers to the response
      const response = await next()
      if (!response) {
        return new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Add CORS headers to the response
      return addCorsHeaders(response)
    }
    catch (error) {
      // Error occurred - return error response WITH CORS headers
      console.error('[CORS] Error in middleware chain:', error)
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }
}
