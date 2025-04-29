/* eslint-disable no-console */
import type { Server } from 'bun'
import type { EnhancedRequest, HTTPMethod, Route, ServerOptions } from '../types'
import type { Router } from './core'

/**
 * Server handling extension for Router class
 */
export function registerServerHandling(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Start the HTTP server
     */
    serve: {
      async value(options: ServerOptions = {}): Promise<Server> {
        // Create server options
        const serverOptions: any = {
          ...options,
          fetch: this.handleRequest.bind(this),
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
          console.log(`🚀 Server running at http://${hostname}:${port}`)

          // Show routes in verbose mode
          console.log('\nRoutes:')
          const routesByMethod: Record<string, Route[]> = {}

          for (const route of this.routes) {
            if (!routesByMethod[route.method]) {
              routesByMethod[route.method] = []
            }
            routesByMethod[route.method].push(route)
          }

          for (const [method, routes] of Object.entries(routesByMethod)) {
            console.log(`\n${method}:`)
            for (const route of routes) {
              console.log(`  ${route.path}${route.name ? ` (${route.name})` : ''}`)
            }
          }

          console.log('\n')
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
        try {
          // Create URL for route matching
          const url = new URL(req.url)

          // Get domain from the host header
          const hostname = url.hostname || req.headers.get('host')?.split(':')[0] || 'localhost'

          // Find a matching route
          const match = this.matchRoute(url.pathname, req.method as HTTPMethod, hostname)

          // Enhance the request with params and other utilities
          const enhancedReq = this.enhanceRequest(req, match?.params || {})

          if (match) {
            // Add the matched route to the request
            enhancedReq.route = match.route

            // Collect all middleware to run
            const middlewareStack = [...this.globalMiddleware]

            // Add route-specific middleware
            if (match.route.middleware && match.route.middleware.length > 0) {
              middlewareStack.push(...match.route.middleware)
            }

            // Run middleware stack
            const middlewareResponse = await this.runMiddleware(enhancedReq, middlewareStack)

            // If middleware produced a response, return it
            if (middlewareResponse) {
              return this.applyModifiedCookies(middlewareResponse, enhancedReq)
            }

            // If no middleware response, execute the route handler
            const response = await this.resolveHandler(match.route.handler, enhancedReq)

            // Apply any modified cookies to the response
            return this.applyModifiedCookies(response, enhancedReq)
          }

          // No route found, try the fallback handler
          if (this.fallbackHandler) {
            const response = await this.resolveHandler(this.fallbackHandler, enhancedReq)
            return this.applyModifiedCookies(response, enhancedReq)
          }

          // No fallback handler, return a 404
          return new Response('Not Found', { status: 404 })
        }
        catch (error) {
          console.error('Error handling request:', error)

          // Use custom error handler if available
          if (this.errorHandler) {
            return this.errorHandler(error as Error)
          }

          // Default error response
          return new Response('Internal Server Error', { status: 500 })
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
        // Parse cookies from the request
        const cookieHeader = req.headers.get('cookie') || ''
        const cookieMap: Record<string, string> = {}

        // Parse cookie string
        cookieHeader.split(';').forEach((cookie) => {
          const parts = cookie.trim().split('=')
          if (parts.length >= 2) {
            const name = parts[0].trim()
            const value = parts.slice(1).join('=').trim()
            cookieMap[name] = decodeURIComponent(value)
          }
        })

        // Create cookie utilities
        const cookies = {
          get: (name: string) => cookieMap[name],
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
          getAll: () => ({ ...cookieMap }),
        }

        // Create enhanced request
        return Object.assign(req, {
          params,
          cookies,
          _cookiesToSet: [],
          _cookiesToDelete: [],
        }) as EnhancedRequest
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply modified cookies to a response
     */
    applyModifiedCookies: {
      value(response: Response, req: EnhancedRequest): Response {
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

        if (options.maxAge) {
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
