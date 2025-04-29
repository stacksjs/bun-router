import type { HTTPMethod, MatchResult, Route } from '../types'
import type { Router } from './core'

/**
 * Route matching extension for Router class
 */
export function registerRouteMatching(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Match a route based on the path, method, and domain
     */
    matchRoute: {
      value(path: string, method: HTTPMethod, domain?: string): MatchResult | undefined {
        const url = new URL(path, 'http://localhost')

        // Get potential routes - either all routes or domain-specific routes
        const potentialRoutes: Route[] = domain && this.domains[domain]
          ? this.domains[domain]
          : this.routes

        // Filter routes to only those matching the HTTP method
        const methodRoutes = potentialRoutes.filter((route: Route) => route.method === method)

        // First, try to find an exact match
        for (const route of methodRoutes) {
          if (route.path === url.pathname) {
            return {
              route,
              params: {},
            }
          }
        }

        // If no exact match, try matching patterns
        for (const route of methodRoutes) {
          if (route.pattern) {
            const match = route.pattern.exec(url)
            if (match) {
              return {
                route,
                params: match.pathname.groups,
              }
            }
          }
        }

        // If still no match, try domain-specific * (wildcard) routes
        if (domain && this.domains[domain]) {
          const wildcardRoutes = this.domains[domain].filter((route: Route) =>
            route.method === method && route.path.endsWith('*'),
          )

          for (const route of wildcardRoutes) {
            const basePath = route.path.slice(0, -1) // Remove the '*'
            if (url.pathname.startsWith(basePath)) {
              return {
                route,
                params: {
                  wildcard: url.pathname.slice(basePath.length),
                },
              }
            }
          }
        }

        // If no match in domain-specific routes, try global wildcard routes
        const globalWildcardRoutes = this.routes.filter((route: Route) =>
          route.method === method && route.path.endsWith('*') && (!domain || !route.domain),
        )

        for (const route of globalWildcardRoutes) {
          const basePath = route.path.slice(0, -1) // Remove the '*'
          if (url.pathname.startsWith(basePath)) {
            return {
              route,
              params: {
                wildcard: url.pathname.slice(basePath.length),
              },
            }
          }
        }

        // If no match for specific method, try HEAD for GET requests
        if (method === 'HEAD') {
          return this.matchRoute(path, 'GET', domain)
        }

        // Try to match any OPTIONS requests to a generic options handler or to a matching route of another method
        if (method === 'OPTIONS') {
          // Check if we have a specific OPTIONS handler first
          const optionsMatch = potentialRoutes.find((route: Route) =>
            route.method === 'OPTIONS' && route.path === '*',
          )

          if (optionsMatch) {
            return {
              route: optionsMatch,
              params: {},
            }
          }

          // Check if the path matches any route of another method
          for (const otherMethod of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
            const match = this.matchRoute(path, otherMethod as HTTPMethod, domain)
            if (match) {
              // We found a route that matches this path with another method,
              // so this is a valid OPTIONS request
              return {
                route: {
                  ...match.route,
                  method: 'OPTIONS',
                  handler: (_req: Request) => new Response(null, { status: 204 }),
                },
                params: match.params,
              }
            }
          }
        }

        // No matching route found
        return undefined
      },
      writable: true,
      configurable: true,
    },

    /**
     * Match a domain pattern against a hostname
     */
    matchDomain: {
      value(pattern: string, hostname: string): boolean {
        // Exact match
        if (pattern === hostname) {
          return true
        }

        // Wildcard subdomains (*.example.com)
        if (pattern.startsWith('*.')) {
          const domain = pattern.substring(2)
          return hostname === domain || hostname.endsWith(`.${domain}`)
        }

        // Dynamic parameters ({subdomain}.example.com)
        if (pattern.includes('{')) {
          const regex = pattern.replace(/\./g, '\\.').replace(/\{[^}]+\}/g, '([^.]+)')
          return new RegExp(`^${regex}$`).test(hostname)
        }

        return false
      },
      writable: true,
      configurable: true,
    },

    /**
     * Extract domain parameters from a hostname
     */
    extractDomainParams: {
      value(pattern: string, hostname: string): Record<string, string> {
        const params: Record<string, string> = {}

        if (!pattern.includes('{')) {
          return params
        }

        const paramNames = pattern.match(/\{([^}]+)\}/g)?.map(p => p.substring(1, p.length - 1)) || []
        const regex = pattern.replace(/\./g, '\\.').replace(/\{[^}]+\}/g, '([^.]+)')
        const matches = hostname.match(new RegExp(`^${regex}$`))

        if (matches && matches.length > 1) {
          for (let i = 0; i < paramNames.length; i++) {
            params[paramNames[i]] = matches[i + 1]
          }
        }

        return params
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply pattern constraints to routes
     */
    pattern: {
      value(name: string, pattern: string): Router {
        this.patterns.set(name, pattern)
        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply constraints to route parameters
     */
    where: {
      value(params: Record<string, string>): Router {
        // Apply to the most recently added route(s)
        const lastRoute = this.routes[this.routes.length - 1]
        if (lastRoute) {
          lastRoute.constraints = { ...(lastRoute.constraints || {}), ...params }
        }

        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply a numeric constraint to a parameter
     */
    whereNumber: {
      value(param: string): Router {
        return this.where({ [param]: '\\d+' })
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply an alphabetic constraint to a parameter
     */
    whereAlpha: {
      value(param: string): Router {
        return this.where({ [param]: '[A-Za-z]+' })
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply an alphanumeric constraint to a parameter
     */
    whereAlphaNumeric: {
      value(param: string): Router {
        return this.where({ [param]: '[A-Za-z0-9]+' })
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply a UUID constraint to a parameter
     */
    whereUuid: {
      value(param: string): Router {
        return this.where({ [param]: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' })
      },
      writable: true,
      configurable: true,
    },

    /**
     * Apply an "in array" constraint to a parameter
     */
    whereIn: {
      value(param: string, values: string[]): Router {
        return this.where({ [param]: values.join('|') })
      },
      writable: true,
      configurable: true,
    },
  })
}
