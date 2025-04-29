import type { EnhancedRequest, MiddlewareHandler, NextFunction, Route } from '../types'
import type { Router } from './core'
import { isRouteHandler } from '../utils'

/**
 * Middleware handling extension for Router class
 */
export function registerMiddlewareHandling(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Add middleware to the router
     */
    use: {
      async value(...middleware: (string | MiddlewareHandler)[]): Promise<Router> {
        for (const mw of middleware) {
          const resolvedMiddleware = await this.resolveMiddleware(mw)
          if (resolvedMiddleware) {
            this.globalMiddleware.push(resolvedMiddleware)
          }
        }
        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Resolve a middleware string or function to a middleware handler
     */
    resolveMiddleware: {
      async value(middleware: string | MiddlewareHandler): Promise<MiddlewareHandler | null> {
        if (typeof middleware === 'function') {
          return middleware
        }

        if (typeof middleware === 'string') {
          try {
            // Try to import from project middleware directory
            const importedMiddleware = await import(`../middleware/${middleware}.ts`)
            if (importedMiddleware.default && typeof importedMiddleware.default === 'function') {
              return importedMiddleware.default
            }

            // If it's a class with a handle method, instantiate it
            if (importedMiddleware.default && typeof importedMiddleware.default.handle === 'function') {
              return (req: EnhancedRequest, next: NextFunction) => {
                return importedMiddleware.default.handle(req, next)
              }
            }
          }
          catch (error) {
            console.error(`Failed to load middleware "${middleware}":`, error)
          }
        }

        return null
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

        const executeMiddleware = async (i: number): Promise<Response | null> => {
          // If we've gone through all middleware without a response, return null
          if (i >= middlewareStack.length) {
            return null
          }

          const currentMiddleware = middlewareStack[i]

          // Create the next function for this middleware
          const next = async (): Promise<Response> => {
            // Run the next middleware in the stack
            const result = await executeMiddleware(i + 1)

            // If there's no result, create a default response for middleware to modify
            if (!result) {
              return new Response(null, {
                status: 200,
                statusText: 'OK',
                headers: new Headers(),
              })
            }

            return result
          }

          // Run the current middleware with the next function
          const result = await currentMiddleware(req, next)
          return result
        }

        try {
          // Start executing the middleware chain
          return await executeMiddleware(0)
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
      value(...middleware: (string | MiddlewareHandler)[]): Router {
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
      async value(route: Route, middleware: (string | MiddlewareHandler)[]): Promise<void> {
        for (const mw of middleware) {
          const resolvedMiddleware = await this.resolveMiddleware(mw)
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
     */
    resolveHandler: {
      async value(handler: any, req: EnhancedRequest): Promise<Response> {
        if (isRouteHandler(handler)) {
          // If it's a function, call it with the request
          return await handler(req)
        }

        if (typeof handler === 'string') {
          try {
            // Try to import from actions directory
            const importedHandler = await import(`../actions/${handler}`)

            if (importedHandler.default) {
              if (typeof importedHandler.default === 'function') {
                // If it's a function, call it directly
                if (importedHandler.default.prototype && typeof importedHandler.default.prototype.handle === 'function') {
                  // If it's a class with a handle method, instantiate it
                  const HandlerClass = importedHandler.default
                  const handlerInstance = new HandlerClass()
                  return await handlerInstance.handle(req)
                }
                // Regular function handler
                return await importedHandler.default(req)
              }

              // If it's an object with a handle method
              if (typeof importedHandler.default.handle === 'function') {
                return await importedHandler.default.handle(req)
              }
            }
          }
          catch (error) {
            console.error(`Failed to load action handler "${handler}":`, error)
            throw new Error(`Failed to load action handler "${handler}"`)
          }
        }

        // If it's a class constructor, instantiate it and call handle
        if (typeof handler === 'function' && handler.prototype && typeof handler.prototype.handle === 'function') {
          const HandlerClass = handler
          const handlerInstance = new HandlerClass()
          return await handlerInstance.handle(req)
        }

        // If it's an object with a handle method
        if (handler && typeof handler.handle === 'function') {
          return await handler.handle(req)
        }

        throw new Error(`Invalid action handler: ${typeof handler}`)
      },
      writable: true,
      configurable: true,
    },

    /**
     * Register an error handler
     */
    onError: {
      async value(handler: (error: Error) => Response | Promise<Response>): Promise<Router> {
        this.errorHandler = handler
        return this
      },
      writable: true,
      configurable: true,
    },
  })
}
