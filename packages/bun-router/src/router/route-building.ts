import type { Route, RouteDefinition } from '../types'
import type { Router } from './core'
import { matchPath } from '../utils'

// Extend the Router interface with route building methods
declare module './core' {
  interface Router {
    buildBunServeRoutes: () => Record<string, any>
    loadRoutes: () => Promise<void>
    registerRoute: (route: RouteDefinition, type: 'api' | 'web') => Promise<void>
    get: (path: string, handler: any, type?: 'api' | 'web', name?: string, middleware?: any[]) => Promise<Router>
    post: (path: string, handler: any, type?: 'api' | 'web', name?: string, middleware?: any[]) => Promise<Router>
    put: (path: string, handler: any, type?: 'api' | 'web', name?: string, middleware?: any[]) => Promise<Router>
    patch: (path: string, handler: any, type?: 'api' | 'web', name?: string, middleware?: any[]) => Promise<Router>
    delete: (path: string, handler: any, type?: 'api' | 'web', name?: string, middleware?: any[]) => Promise<Router>
    options: (path: string, handler: any, type?: 'api' | 'web', name?: string, middleware?: any[]) => Promise<Router>
  }
}

/**
 * Route building extension for Router class
 */
export function registerRouteBuilding(RouterClass: typeof Router): void {
  /**
   * Convert existing routes to the Bun.serve routes format
   */
  RouterClass.prototype.buildBunServeRoutes = function (): Record<string, any> {
    const bunRoutes: Record<string, any> = {}

    // Group routes by path to build method-specific handlers
    const routesByPath = new Map<string, Route[]>()

    for (const route of this.routes) {
      if (!routesByPath.has(route.path)) {
        routesByPath.set(route.path, [])
      }
      routesByPath.get(route.path)!.push(route)
    }

    // Build route handlers
    for (const [path, routes] of routesByPath.entries()) {
      if (routes.length === 1) {
        // Single route handler
        const route = routes[0]

        // For static responses like health checks, use direct Response objects
        if (
          typeof route.handler === 'function'
          && route.handler.toString().includes('new Response')
          && !route.handler.toString().includes('await')
          && route.middleware.length === 0
        ) {
          try {
            // Create an enhanced request with empty params and cookie support
            const mockReq = this.enhanceRequest(new Request('https://example.com'), {})
            const testResult = (route.handler as any)(mockReq)

            // If it returns a Response directly, use it as a static route
            if (testResult instanceof Response) {
              bunRoutes[path] = testResult
              continue
            }
          }
          catch {
            // If there's an error, fall back to the dynamic handler
          }
        }

        // Dynamic route handler
        bunRoutes[path] = async (req: Request) => {
          // Create enhanced request with params
          const url = new URL(req.url)
          const params: Record<string, string> = {}
          matchPath(path, url.pathname, params)
          const enhancedReq = this.enhanceRequest(req, params)

          // Run middleware
          const middlewareResult = await this.runMiddleware(
            enhancedReq,
            [...this.globalMiddleware, ...route.middleware],
          )
          if (middlewareResult) {
            return this.applyModifiedCookies(middlewareResult, enhancedReq)
          }

          // Run route handler
          const response = await this.resolveHandler(route.handler, enhancedReq)
          return this.applyModifiedCookies(response, enhancedReq)
        }
      }
      else {
        // Multiple routes for same path (method-specific)
        const methodHandlers: Record<string, any> = {}

        for (const route of routes) {
          const method = route.method

          methodHandlers[method] = async (req: Request) => {
            // Create enhanced request with params
            const url = new URL(req.url)
            const params: Record<string, string> = {}
            matchPath(path, url.pathname, params)
            const enhancedReq = this.enhanceRequest(req, params)

            // Run middleware
            const middlewareResult = await this.runMiddleware(
              enhancedReq,
              [...this.globalMiddleware, ...route.middleware],
            )
            if (middlewareResult) {
              return this.applyModifiedCookies(middlewareResult, enhancedReq)
            }

            // Run route handler
            const response = await this.resolveHandler(route.handler, enhancedReq)
            return this.applyModifiedCookies(response, enhancedReq)
          }
        }

        bunRoutes[path] = methodHandlers
      }
    }

    return bunRoutes
  }

  /**
   * Load routes from files
   */
  RouterClass.prototype.loadRoutes = async function (): Promise<void> {
    if (!this.config.routesPath) {
      return
    }

    try {
      // Try to import API routes if configured
      if (this.config.apiRoutesPath) {
        try {
          const apiRoutes = await import(this.config.apiRoutesPath)
          if (apiRoutes.default && Array.isArray(apiRoutes.default)) {
            // Register each route
            for (const route of apiRoutes.default) {
              await this.registerRoute(route, 'api')
            }
          }
        }
        catch (error) {
          if (this.config.verbose) {
            console.warn(`Failed to load API routes: ${error}`)
          }
        }
      }

      // Try to import Web routes if configured
      if (this.config.webRoutesPath) {
        try {
          const webRoutes = await import(this.config.webRoutesPath)
          if (webRoutes.default && Array.isArray(webRoutes.default)) {
            // Register each route
            for (const route of webRoutes.default) {
              await this.registerRoute(route, 'web')
            }
          }
        }
        catch (error) {
          if (this.config.verbose) {
            console.warn(`Failed to load Web routes: ${error}`)
          }
        }
      }
    }
    catch (error) {
      console.error('Error loading routes:', error)
    }
  }

  /**
   * Register a route definition
   */
  RouterClass.prototype.registerRoute = async function (route: RouteDefinition, type: 'api' | 'web'): Promise<void> {
    const { path, method, handler, middleware = [], name } = route

    // Map HTTP method to Router method
    switch (method) {
      case 'GET':
        await this.get(path, handler, type, name, middleware)
        break
      case 'POST':
        await this.post(path, handler, type, name, middleware)
        break
      case 'PUT':
        await this.put(path, handler, type, name, middleware)
        break
      case 'DELETE':
        await this.delete(path, handler, type, name, middleware)
        break
      case 'PATCH':
        await this.patch(path, handler, type, name, middleware)
        break
      case 'OPTIONS':
        await this.options(path, handler, type, name, middleware)
        break
      default:
        console.warn(`Unsupported HTTP method: ${method}`)
    }
  }
}
