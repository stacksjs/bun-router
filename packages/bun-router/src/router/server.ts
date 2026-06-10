import type { Server } from 'bun'
import type { EnhancedRequest, HTTPMethod, Route, ServerOptions } from '../types'
import type { Router } from './router'
import { RequestWithMacros } from '../request/macros'
import { runWithRequest, setCurrentRequest } from '../request/context'

// Helpers that frameworks layered on bun-router treat as guaranteed but
// that aren't shaped as built-in macros. Registered once at module load —
// they ride the shared macro prototype instead of being closure-assigned
// per request. (`cookie` is already a built-in macro.)
if (!RequestWithMacros.hasMacro('getParam')) {
  RequestWithMacros.macro('getParam', function (this: EnhancedRequest, name: string, defaultValue?: unknown) {
    const value = this.params?.[name]
    return value !== undefined ? value : defaultValue
  })
}
// `get(key)` — read query params (and only query params; the full input
// merge with body etc. is provided by the `input` macro). Only registered
// when no macro already claimed the name.
if (!RequestWithMacros.hasMacro('get')) {
  RequestWithMacros.macro('get', function (this: EnhancedRequest, key: string, defaultValue?: unknown) {
    const value = new URL(this.url).searchParams.get(key)
    return value !== null && value !== undefined ? value : defaultValue
  })
}

/**
 * Server handling extension for Router class
 */
export function registerServerHandling(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Start the HTTP server
     */
    serve: {
      async value(options: ServerOptions = {}): Promise<Server<any>> {
        // Initialize automatic file-based routing (discovers views from src/views, views, etc.)
        if (this._initFileRoutes) {
          await this._initFileRoutes()
        }

        // Initialize automatic API route discovery (from routes/ directory)
        if (this._initApiRoutes) {
          await this._initApiRoutes()
        }

        // Invalidate route cache before starting server
        this.invalidateCache()

        // Create server options
        const serverOptions: any = {
          idleTimeout: 255, // Max allowed timeout (255 seconds)
          ...options,
          fetch: this.handleRequest.bind(this),
        }

        // Build Bun's static option from registered static Response routes.
        // Static responses use Bun's native zero-allocation dispatch (~15% faster).
        const staticRouteMap: Record<string, Response> = {}
        if (this.staticResponses && this.staticResponses.size > 0) {
          for (const [path, response] of this.staticResponses) {
            staticRouteMap[path] = response
          }
        }
        // Merge with user-provided static routes (user options take precedence)
        if (options.static) {
          Object.assign(staticRouteMap, options.static)
        }
        if (Object.keys(staticRouteMap).length > 0) {
          serverOptions.static = staticRouteMap
        }

        // Forward development options for HMR and console streaming
        if (options.development !== undefined) {
          serverOptions.development = options.development
        }

        // Apply WebSocket configuration if provided
        if (this.wsConfig) {
          serverOptions.websocket = this.wsConfig
        }

        // Start the server
        this.serverInstance = Bun.serve(serverOptions)

        if (this.config.verbose) {
          const port = this.serverInstance.port
          const hostname = this.serverInstance.hostname
          console.log(`\n🚀 Server running at http://${hostname}:${port}\n`)
        }

        return this.serverInstance
      },
      writable: true,
      configurable: true,
    },

    /**
     * Reload the HTTP server
     */
    reload: {
      async value(): Promise<void> {
        if (!this.serverInstance) {
          throw new Error('Server not started, cannot reload')
        }

        // Invalidate route cache before reloading
        this.invalidateCache()

        // Save the current server port and hostname
        const port = this.serverInstance.port
        const hostname = this.serverInstance.hostname

        // Close the current server
        this.serverInstance.stop()

        // Start a new server with the same configuration
        this.serverInstance = Bun.serve({
          port,
          hostname,
          fetch: this.handleRequest.bind(this),
          websocket: this.wsConfig || undefined,
        })

        if (this.config.verbose) {
          console.log(`🔄 Server reloaded at http://${hostname}:${port}`)
        }
      },
      writable: true,
      configurable: true,
    },

    /**
     * Handle HTTP requests
     */
    handleRequest: {
      async value(req: Request): Promise<Response> {
        // The prototype is mutated via defineProperties; the static type doesn't see
        // handleRequestImpl as a public method, so we cast through unknown.
        const self = this as unknown as { handleRequestImpl: (r: Request) => Promise<Response> }
        return runWithRequest(req as EnhancedRequest, () => self.handleRequestImpl(req))
      },
      writable: true,
      configurable: true,
    },

    /**
     * Internal: actual request handling, executed inside the request context scope.
     */
    handleRequestImpl: {
      async value(req: Request): Promise<Response> {
        try {
          // Create URL for route matching
          const url = new URL(req.url)

          // Get domain from the host header
          const hostname = url.hostname || req.headers.get('host')?.split(':')[0] || 'localhost'

          // Find a matching route
          const match = this.matchRoute(url.pathname, req.method as HTTPMethod, hostname)

          // CORS preflight: when no explicit OPTIONS route is registered,
          // answer with a generic preflight response. A request with an
          // Origin header gets that origin reflected (plus Vary: Origin)
          // so credentials stay usable — `Access-Control-Allow-Credentials`
          // combined with a wildcard origin is rejected by browsers.
          if (req.method === 'OPTIONS' && !match) {
            const origin = req.headers.get('origin')
            const preflightHeaders: Record<string, string> = {
              'Access-Control-Allow-Origin': origin || '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
              'Access-Control-Max-Age': '86400',
            }
            if (origin) {
              preflightHeaders['Access-Control-Allow-Credentials'] = 'true'
              preflightHeaders.Vary = 'Origin'
            }
            return new Response(null, { status: 204, headers: preflightHeaders })
          }

          // Enhance the request with params and other utilities
          const enhancedReq = this.enhanceRequest(req, match?.params || {})
          setCurrentRequest(enhancedReq)

          if (match) {
            // Add the matched route to the request
            enhancedReq.route = match.route

            // Resolve the middleware chain for this route. The composed
            // chain (global middleware + route middleware + handler) is
            // cached on the route and only rebuilt when `use()` registers
            // new global middleware or the route's own stack changes —
            // building the closure chain per request was a hot-path cost.
            const route = match.route as Route & {
              _compiledChain?: (req: EnhancedRequest) => Promise<Response | null>
              _chainEpoch?: number
              _chainMwLen?: number
            }
            const epoch: number = this._mwEpoch || 0
            const routeMwLen = route.middleware ? route.middleware.length : 0

            let chain = route._compiledChain
            if (!chain || route._chainEpoch !== epoch || route._chainMwLen !== routeMwLen) {
              const middlewareStack = routeMwLen > 0
                ? [...this.globalMiddleware, ...route.middleware]
                : [...this.globalMiddleware]
              middlewareStack.push(async (handlerReq: EnhancedRequest, _next: any) => {
                return await this.resolveHandler(route.handler, handlerReq)
              })
              chain = this.buildMiddlewareChain(middlewareStack)!
              route._compiledChain = chain
              route._chainEpoch = epoch
              route._chainMwLen = routeMwLen
            }

            let response: Response | null
            try {
              response = await chain!(enhancedReq)
            }
            catch (error) {
              if (this.errorHandler) {
                response = await this.errorHandler(error as Error)
              }
              else {
                throw error
              }
            }

            // Apply modified cookies to the response
            if (response) {
              return this.applyModifiedCookies(response, enhancedReq)
            }

            // This should not happen since we're always returning a response now
            return new Response('No response from middleware chain', { status: 500 })
          }

          // No route found - check if the path exists with a different method (405 vs 404).
          // The 404/405 responses below now (a) include path + method in the body so client
          // debugging is one grep away, and (b) flow through globalMiddleware so cross-cutting
          // concerns (X-Request-ID, Server-Timing, audit logging, custom CORS) can observe
          // them. Previously these paths short-circuited entirely.
          const allowedMethods = this.getAllowedMethods(url.pathname, hostname)
          const corsHeaders = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          }

          if (allowedMethods.length > 0) {
            const methodNotAllowedHandler = async (_req: EnhancedRequest, _next: any) => {
              return new Response(JSON.stringify({
                success: false,
                message: 'Method Not Allowed',
                path: url.pathname,
                method: req.method,
                allowed: allowedMethods,
              }), {
                status: 405,
                headers: { ...corsHeaders, Allow: allowedMethods.join(', ') },
              })
            }
            if (this.globalMiddleware.length > 0) {
              const stack = [...this.globalMiddleware, methodNotAllowedHandler]
              const response = await this.runMiddleware(enhancedReq, stack)
              if (response) return this.applyModifiedCookies(response, enhancedReq)
            }
            return await methodNotAllowedHandler(enhancedReq, async () => null as any)
          }

          // No route found, try the fallback handler
          if (this.fallbackHandler) {
            const response = await this.resolveHandler(this.fallbackHandler, enhancedReq)
            return this.applyModifiedCookies(response, enhancedReq)
          }

          // No fallback — emit a 404 enriched with path + method, also through
          // globalMiddleware so user middleware sees it.
          const notFoundHandler = async (_req: EnhancedRequest, _next: any) => {
            return new Response(JSON.stringify({
              success: false,
              message: 'Not Found',
              path: url.pathname,
              method: req.method,
            }), { status: 404, headers: corsHeaders })
          }
          if (this.globalMiddleware.length > 0) {
            const stack = [...this.globalMiddleware, notFoundHandler]
            const response = await this.runMiddleware(enhancedReq, stack)
            if (response) return this.applyModifiedCookies(response, enhancedReq)
          }
          return await notFoundHandler(enhancedReq, async () => null as any)
        }
        catch (error) {
          console.error('Error handling request:', error)

          // Use custom error handler if available
          if (this.errorHandler) {
            return this.errorHandler(error as Error)
          }

          // Default error response with CORS headers
          return new Response(JSON.stringify({
            success: false,
            message: 'Internal Server Error',
            error: error instanceof Error ? error.message : String(error),
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
            },
          })
        }
      },
      writable: true,
      configurable: true,
    },

    /**
     * Enhance a request with params and other utilities
     */
    enhanceRequest: {
      value(req: Request, params: Record<string, string> = {}): EnhancedRequest {
        // Lazy cookie parsing — most requests never read a cookie, so the
        // header is only parsed (and decoded) on first access. Malformed
        // percent-encoding falls back to the raw value instead of throwing.
        let parsedCookies: Record<string, string> | null = null

        const getCookies = () => {
          if (parsedCookies === null) {
            parsedCookies = {}
            const cookieHeader = req.headers.get('cookie')
            if (cookieHeader) {
              for (const cookie of cookieHeader.split(';')) {
                const eqIndex = cookie.indexOf('=')
                if (eqIndex === -1)
                  continue
                const name = cookie.slice(0, eqIndex).trim()
                if (!name)
                  continue
                const value = cookie.slice(eqIndex + 1).trim()
                try {
                  parsedCookies[name] = decodeURIComponent(value)
                }
                catch {
                  parsedCookies[name] = value
                }
              }
            }
          }
          return parsedCookies
        }

        // Cookie utility methods (get/set/delete/getAll)
        const cookieMethods = {
          get: (name: string) => getCookies()[name],
          set: (name: string, value: string, options: any = {}) => {
            const enhancedRequest = req as EnhancedRequest
            if (!enhancedRequest._cookiesToSet) {
              enhancedRequest._cookiesToSet = []
            }
            enhancedRequest._cookiesToSet.push({ name, value, options })
          },
          delete: (name: string, options: any = {}) => {
            const enhancedRequest = req as EnhancedRequest
            if (!enhancedRequest._cookiesToDelete) {
              enhancedRequest._cookiesToDelete = []
            }
            enhancedRequest._cookiesToDelete.push({ name, options })
          },
          getAll: () => ({ ...getCookies() }),
        }

        // Create enhanced request. `_cookiesToSet`/`_cookiesToDelete` are
        // created lazily by the cookie methods — most requests never set
        // a cookie, so the empty arrays were wasted allocations.
        const enhancedReq = Object.assign(req, { params }) as unknown as EnhancedRequest

        // Attach registered request macros (input, has, bearerToken, cookie,
        // getParam, get, etc.) via the shared macro prototype — one
        // setPrototypeOf instead of per-request closure assignment.
        RequestWithMacros.applyMacros(enhancedReq)

        // `cookies` is both a plain name→value map (direct access) and the
        // get/set/delete/getAll utility. The merged object is materialized
        // lazily on first access so requests that never touch cookies skip
        // header parsing entirely. Defined as an own property so it shadows
        // the `cookies` macro on the prototype.
        // Name→value map merged with the get/set/delete/getAll helpers; the
        // function-valued keys make a strict Record<string, string> impossible
        let cookiesObject: Record<string, unknown> | null = null
        Object.defineProperty(enhancedReq, 'cookies', {
          get() {
            if (cookiesObject === null) {
              cookiesObject = { ...getCookies(), ...cookieMethods }
            }
            return cookiesObject
          },
          configurable: true,
          enumerable: true,
        })

        return enhancedReq
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply modified cookies to a response
     */
    applyModifiedCookies: {
      value(response: Response, req: EnhancedRequest): Response {
        // Fast path: nothing to apply — return the response untouched
        // instead of paying for a clone on every request
        const hasSet = req._cookiesToSet && req._cookiesToSet.length > 0
        const hasDelete = req._cookiesToDelete && req._cookiesToDelete.length > 0
        if (!hasSet && !hasDelete) {
          return response
        }

        // Clone the response to modify headers
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })

        // Apply cookies to set
        if (req._cookiesToSet && req._cookiesToSet.length > 0) {
          for (const { name, value, options } of req._cookiesToSet) {
            const cookieString = this.serializeCookie(name, value, options)
            newResponse.headers.append('Set-Cookie', cookieString)
          }
        }

        // Apply cookies to delete
        if (req._cookiesToDelete && req._cookiesToDelete.length > 0) {
          for (const { name, options } of req._cookiesToDelete) {
            const deletionOptions = {
              ...options,
              expires: new Date(0), // Set expiration to past date
              maxAge: 0,
            }
            const cookieString = this.serializeCookie(name, '', deletionOptions)
            newResponse.headers.append('Set-Cookie', cookieString)
          }
        }

        return newResponse
      },
      writable: true,
      configurable: true,
    },

    /**
     * Serialize a cookie for the Set-Cookie header
     */
    serializeCookie: {
      value(name: string, value: string, options: any = {}): string {
        let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

        if (options.maxAge !== undefined) {
          cookie += `; Max-Age=${options.maxAge}`
        }

        if (options.expires && options.expires instanceof Date) {
          cookie += `; Expires=${options.expires.toUTCString()}`
        }

        if (options.path) {
          cookie += `; Path=${options.path}`
        }
        else {
          cookie += '; Path=/'
        }

        if (options.domain) {
          cookie += `; Domain=${options.domain}`
        }

        if (options.secure) {
          cookie += '; Secure'
        }

        if (options.httpOnly) {
          cookie += '; HttpOnly'
        }

        if (options.sameSite) {
          const sameSite = options.sameSite.toLowerCase()
          cookie += `; SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`
        }

        return cookie
      },
      writable: true,
      configurable: true,
    },
  })
}
