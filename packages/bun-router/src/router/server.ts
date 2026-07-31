import type { Server } from 'bun'
import type { EnhancedRequest, HTTPMethod, Route, ServerOptions } from '../types'
import type { Router } from './router'
import { getParsedCookies, getParsedURL, RequestWithMacros } from '../request/macros'
import { runWithRequest, setCurrentRequest } from '../request/context'
import { createHandlerInvoker } from './handler-resolver'

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
if (!RequestWithMacros.hasMacro('getParamAsInt')) {
  RequestWithMacros.macro('getParamAsInt', function (this: EnhancedRequest, name: string) {
    const value = this.params?.[name]
    if (value === undefined || value.trim() === '')
      return null

    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : null
  })
}
// `get(key)` — read query params (and only query params; the full input
// merge with body etc. is provided by the `input` macro). Only registered
// when no macro already claimed the name.
if (!RequestWithMacros.hasMacro('get')) {
  RequestWithMacros.macro('get', function (this: EnhancedRequest, key: string, defaultValue?: unknown) {
    const value = getParsedURL(this).searchParams.get(key)
    return value !== null && value !== undefined ? value : defaultValue
  })
}
// `cookies` — dual-shape, mirroring the response macros (#1857): callable
// as `req.cookies()` (the legacy built-in macro form, returns the parsed
// map) while also carrying the name→value entries for direct access and
// the get/set/delete/getAll utility methods `EnhancedRequest` declares.
// Installed as a shared-prototype accessor: the hybrid materializes on
// first access and is cached as an own property, so requests that never
// touch cookies do zero cookie work.
RequestWithMacros.macroAccessor('cookies', function (this: EnhancedRequest) {
  const req = this
  const cookies = (): Record<string, string> => ({ ...getParsedCookies(req) })

  // Direct map access (req.cookies.session). defineProperty instead of
  // Object.assign — a cookie literally named `name` or `length` would
  // collide with the function's own non-writable properties.
  for (const [key, value] of Object.entries(getParsedCookies(req))) {
    Object.defineProperty(cookies, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }

  cookies.get = (name: string) => getParsedCookies(req)[name]
  cookies.set = (name: string, value: string, options: any = {}) => {
    if (!req._cookiesToSet) {
      req._cookiesToSet = []
    }
    req._cookiesToSet.push({ name, value, options })
  }
  cookies.delete = (name: string, options: any = {}) => {
    if (!req._cookiesToDelete) {
      req._cookiesToDelete = []
    }
    req._cookiesToDelete.push({ name, options })
  }
  cookies.getAll = () => ({ ...getParsedCookies(req) })

  Object.defineProperty(req, 'cookies', {
    value: cookies,
    writable: true,
    configurable: true,
    enumerable: true,
  })
  return cookies
})

/**
 * Server handling extension for Router class
 */
// eslint-disable-next-line pickier/no-unused-vars -- false positive: used on the next line
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

        // Opt-in: hand compatible routes to Bun's native router so they
        // skip the fetch handler's URL parsing and matching entirely.
        // Incompatible routes and 404/405/HEAD/preflight semantics keep
        // flowing through the fetch fallback unchanged.
        this._nativeRoutesEnabled = options.nativeRoutes === true
        if (this._nativeRoutesEnabled) {
          const nativeRoutes = this._buildNativeRoutes()
          if (nativeRoutes) {
            serverOptions.routes = nativeRoutes
          }
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

        // Start a new server with the same configuration. The native
        // route table is rebuilt so routes registered since serve()
        // join it.
        const reloadOptions: any = {
          port,
          hostname,
          fetch: this.handleRequest.bind(this),
          websocket: this.wsConfig || undefined,
        }
        if (this._nativeRoutesEnabled) {
          const nativeRoutes = this._buildNativeRoutes()
          if (nativeRoutes) {
            reloadOptions.routes = nativeRoutes
          }
        }
        this.serverInstance = Bun.serve(reloadOptions)

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
     * Internal: dispatch a matched route — enhance the request, run the
     * cached middleware chain (global + route middleware + handler) and
     * apply queued cookies. Shared by the fetch handler and the native
     * Bun route wrappers.
     */
    _dispatchMatchedRoute: {
      async value(matchedRoute: Route, req: Request, params: Record<string, string>): Promise<Response> {
        const enhancedReq = this.enhanceRequest(req, params)
        setCurrentRequest(enhancedReq)

        // Add the matched route to the request
        enhancedReq.route = matchedRoute

        // Resolve the middleware chain for this route. The composed
        // chain is cached on the route and only rebuilt when `use()`
        // registers new global middleware or the route's own stack
        // changes — building the closure chain per request was a
        // hot-path cost.
        const route = matchedRoute as Route & {
          _compiledChain?: (req: EnhancedRequest) => Promise<Response | null>
          _chainEpoch?: number
          _chainMwLen?: number
        }
        const epoch: number = this._mwEpoch || 0
        const routeMwLen = route.middleware ? route.middleware.length : 0

        let chain = route._compiledChain
        if (!chain || route._chainEpoch !== epoch || route._chainMwLen !== routeMwLen) {
          // The handler's dispatch branch (function vs class vs string
          // action) is resolved once here instead of per request
          const invoke = createHandlerInvoker(route.handler, this.config)

          if (routeMwLen === 0 && this.globalMiddleware.length === 0) {
            // No middleware: the chain is the bare invoker — no
            // closure tower, no next() allocations per request
            chain = invoke
          }
          else {
            const middlewareStack = routeMwLen > 0
              ? [...this.globalMiddleware, ...route.middleware]
              : [...this.globalMiddleware]
            middlewareStack.push((handlerReq: EnhancedRequest, _next: any) => invoke(handlerReq))
            chain = this.buildMiddlewareChain(middlewareStack)!
          }
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
      },
      writable: true,
      configurable: true,
    },

    /**
     * Internal: build Bun.serve's native `routes` table from compatible
     * registered routes (see `ServerOptions.nativeRoutes`). Returns null
     * when nothing qualifies.
     */
    _buildNativeRoutes: {
      value(): Record<string, Record<string, (req: Request) => Promise<Response>>> | null {
        const NATIVE_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])

        // Convert `{param}` paths to Bun's `:param` syntax. Returns null
        // for shapes the native router can't express with our semantics:
        // optional params, constraints, mixed segments like `user-{id}`,
        // and non-trailing wildcards.
        const convertPath = (path: string): string | null => {
          if (path === '*') {
            return '/*'
          }
          const segments = path.split('/')
          const converted: string[] = []
          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]
            if (segment === '') {
              converted.push(segment)
              continue
            }
            if (segment === '*') {
              // Wildcards only in the trailing position
              return i === segments.length - 1 ? [...converted, '*'].join('/') : null
            }
            const paramMatch = segment.match(/^\{([A-Z_$][\w$]*)\}$/i)
            if (paramMatch) {
              converted.push(`:${paramMatch[1]}`)
              continue
            }
            if (segment.includes('{') || segment.includes(':') || segment.includes('*')) {
              return null
            }
            converted.push(segment)
          }
          return converted.join('/')
        }

        // Wrap a route in the same context/error envelope the fetch
        // handler provides, so handlers can't tell which router matched
        const self = this
        const wrapRoute = (route: Route, isWildcard: boolean) => {
          return (req: Request & { params?: Record<string, string> }) => {
            return runWithRequest(req as EnhancedRequest, async () => {
              try {
                let params: Record<string, string> = req.params ?? {}
                if (isWildcard) {
                  // Bun doesn't expose the wildcard remainder as a param;
                  // mirror the fetch matcher's `wildcard` key
                  const pathname = new URL(req.url).pathname
                  const basePath = route.path === '*' ? '/' : route.path.slice(0, -1)
                  params = { ...params, wildcard: pathname.slice(basePath.length) }
                }
                return await self._dispatchMatchedRoute(route, req, params)
              }
              catch (error) {
                console.error('Error handling request:', error)
                if (self.errorHandler) {
                  return self.errorHandler(error as Error)
                }
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
            })
          }
        }

        const natives: Record<string, Record<string, (req: Request) => Promise<Response>>> = {}
        // Bun resolves same-shape patterns by specificity, not by our
        // registration order — only the first registration of a given
        // shape goes native; later ones would silently shadow it
        const claimedShapes = new Map<string, string>()

        for (const route of this.routes as Route[]) {
          if (!NATIVE_METHODS.has(route.method)) {
            continue
          }
          // Explicit per-route opt-out (router.withoutNativeDispatch())
          if (route.nativeDispatch === false) {
            continue
          }
          // Constrained params need our matcher
          if (route.constraints && Object.keys(route.constraints).length > 0) {
            continue
          }
          // Response-handler routes are already served via Bun's static map
          if (route.handler instanceof Response) {
            continue
          }
          const bunPath = convertPath(route.path)
          if (!bunPath) {
            continue
          }

          const shape = bunPath.replace(/:[^/]+/g, ':p')
          const claimedBy = claimedShapes.get(shape)
          if (claimedBy && claimedBy !== bunPath) {
            continue
          }
          claimedShapes.set(shape, bunPath)

          const entry = (natives[bunPath] ??= {})
          if (entry[route.method]) {
            continue // first registration wins, matching the fetch matcher
          }
          entry[route.method] = wrapRoute(route, route.path.endsWith('*'))
        }

        // GET routes answer HEAD automatically (mirrors the fetch
        // matcher's HEAD→GET fallback, but stays on the native fast path)
        for (const entry of Object.values(natives)) {
          if (entry.GET && !entry.HEAD) {
            entry.HEAD = entry.GET
          }
        }

        return Object.keys(natives).length > 0 ? natives : null
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
          // Create URL for route matching, and share it with the request
          // macros (path()/root()/get()/fingerprint() reuse it instead of
          // reparsing req.url)
          const url = new URL(req.url)
          ;(req as any)._parsedURL = url

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

          if (match) {
            return await this._dispatchMatchedRoute(match.route, req, match.params)
          }

          // Enhance the request with params and other utilities (the
          // matched-route path enhances inside _dispatchMatchedRoute)
          const enhancedReq = this.enhanceRequest(req, {})
          setCurrentRequest(enhancedReq)

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
     * Enhance a request with params and other utilities.
     *
     * Per-request work is intentionally minimal: assign `params` and
     * insert the shared macro prototype. Everything else (cookies,
     * input helpers, URL parsing) lives on the prototype and
     * materializes lazily on first access.
     */
    enhanceRequest: {
      value(req: Request, params: Record<string, string> = {}): EnhancedRequest {
        const enhancedReq = req as unknown as EnhancedRequest
        if ('params' in req) {
          // Bun's native-route requests expose `params` as a readonly
          // prototype getter — plain assignment throws. An own property
          // shadows it (and carries our augmentations, e.g. `wildcard`).
          Object.defineProperty(enhancedReq, 'params', {
            value: params,
            writable: true,
            configurable: true,
            enumerable: true,
          })
        }
        else {
          enhancedReq.params = params
        }
        RequestWithMacros.applyMacros(enhancedReq)
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
