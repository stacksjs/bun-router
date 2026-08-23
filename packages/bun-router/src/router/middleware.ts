import type { EnhancedRequest, MiddlewareHandler, MiddlewareReference, NextFunction, Route } from '../types'
import type { Router } from './router'
import { resolveHandler as resolveHandlerUtil, wrapResponse } from './handler-resolver'

/**
 * Middleware handling extension for Router class
 */
export function registerMiddlewareHandling(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Add middleware to the router
     */
    use: {
      value(...middleware: (MiddlewareReference | MiddlewareHandler)[]): Router {
        for (const mw of middleware) {
          const resolvedMiddleware = this.resolveMiddleware(mw)
          if (resolvedMiddleware) {
            this.globalMiddleware.push(resolvedMiddleware)
          }
        }
        // Invalidate per-route compiled middleware chains — they bake in
        // the global middleware stack as of build time
        this._mwEpoch = (this._mwEpoch || 0) + 1
        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Resolve a middleware string or function to a middleware handler.
     * Returns synchronously — for string-based middleware not found in the
     * named registry, a lazy wrapper is returned that imports the module on
     * first invocation and caches it for subsequent calls.
     */
    resolveMiddleware: {
      value(middleware: string | MiddlewareHandler): MiddlewareHandler | null {
        if (typeof middleware === 'function') {
          return middleware
        }

        // Class instance with handle() method (e.g. new JsonBody())
        if (typeof middleware === 'object' && middleware !== null && 'handle' in middleware && typeof (middleware as any).handle === 'function') {
          return (req: EnhancedRequest, next: NextFunction) => {
            return (middleware as any).handle(req, next)
          }
        }

        if (typeof middleware === 'string') {
          // Check named middleware registry first (synchronous)
          const [name, params] = middleware.split(':')
          const factory = (this as any).namedMiddleware?.get(name)
          if (factory) {
            return factory(params)
          }

          // Create a lazy wrapper that imports on first request, then caches
          let cached: MiddlewareHandler | null = null
          const middlewareName = middleware
          return async (req: EnhancedRequest, next: NextFunction) => {
            if (!cached) {
              try {
                const importedMiddleware = await import(`../middleware/${middlewareName}.ts`)
                if (importedMiddleware.default && typeof importedMiddleware.default === 'function') {
                  cached = importedMiddleware.default
                }
                else if (importedMiddleware.default && typeof importedMiddleware.default.handle === 'function') {
                  cached = (r: EnhancedRequest, n: NextFunction) => importedMiddleware.default.handle(r, n)
                }
              }
              catch (error) {
                console.error(`Failed to load middleware "${middlewareName}":`, error)
              }
            }
            if (cached) {
              return cached(req, next)
            }
            return next()
          }
        }

        return null
      },
      writable: true,
      configurable: true,
    },

    /**
     * Build an optimized middleware chain
     */
    buildMiddlewareChain: {
      value(middlewares: MiddlewareHandler[]): (req: EnhancedRequest) => Promise<Response | null> {
        if (middlewares.length === 0) {
          return async (_req: EnhancedRequest) => null
        }

        // Build the chain from the end to start for better performance
        let chain = async (_req: EnhancedRequest): Promise<Response | null> => null

        for (let i = middlewares.length - 1; i >= 0; i--) {
          const middleware = middlewares[i]
          const nextChain = chain
          chain = async (req: EnhancedRequest): Promise<Response | null> => {
            const next = async (): Promise<Response> => {
              const result = await nextChain(req)
              return result || new Response(null, { status: 200 })
            }
            return middleware(req, next)
          }
        }

        return chain
      },
      writable: true,
      configurable: true,
    },

    /**
     * Run middleware stack for a request
     */
    runMiddleware: {
      async value(req: EnhancedRequest, middlewareStack: MiddlewareHandler[]): Promise<Response | null> {
        if (middlewareStack.length === 0) {
          return null // No middleware to run
        }

        try {
          // Build and execute optimized middleware chain
          const chain = this.buildMiddlewareChain(middlewareStack)
          return await chain(req)
        }
        catch (error) {
          if (this.errorHandler) {
            return this.errorHandler(error as Error)
          }
          throw error
        }
      },
      writable: true,
      configurable: true,
    },

    /**
     * Add middleware to a route group
     */
    middleware: {
      value(...middleware: (MiddlewareReference | MiddlewareHandler)[]): Router {
        // Validate string middleware names against the named middleware registry
        for (const mw of middleware) {
          if (typeof mw === 'string') {
            const [name] = mw.split(':')
            if (!this.namedMiddleware.has(name)) {
              throw new Error(`Unknown middleware: ${name}`)
            }
          }
        }

        if (this.currentGroup) {
          if (!this.currentGroup.middleware) {
            this.currentGroup.middleware = []
          }
          this.currentGroup.middleware.push(...middleware)
        }
        else {
          // Apply to the most recently added route
          const lastRoute = this.routes[this.routes.length - 1]
          if (lastRoute) {
            this.applyMiddlewareToRoute(lastRoute, middleware)
          }
        }

        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply middleware to a specific route
     */
    applyMiddlewareToRoute: {
      value(route: Route, middleware: (MiddlewareReference | MiddlewareHandler)[]): void {
        for (const mw of middleware) {
          const resolvedMiddleware = this.resolveMiddleware(mw)
          if (resolvedMiddleware) {
            route.middleware.push(resolvedMiddleware)
          }
        }
      },
      writable: true,
      configurable: true,
    },

    /**
     * Resolve an action handler
     *
     * Supports:
     * - Functions returning Response or any value (auto-wrapped)
     * - String file paths like 'UserAction.ts', './actions/UserAction'
     * - Controller@method patterns like 'UserController@index'
     * - Class constructors with handle() method
     * - Class instances with handle() method
     */
    resolveHandler: {
      async value(handler: any, req: EnhancedRequest): Promise<Response> {
        return resolveHandlerUtil(handler, req, this.config)
      },
      writable: true,
      configurable: true,
    },

    /**
     * Wrap a value in a Response object
     * Useful for handlers that return non-Response values
     */
    wrapResponse: {
      value: wrapResponse,
      writable: true,
      configurable: true,
    },

    /**
     * Register an error handler
     */
    onError: {
      value(handler: (error: Error) => Response | Promise<Response>): Router {
        this.errorHandler = handler
        return this
      },
      writable: true,
      configurable: true,
    },
  })
}
