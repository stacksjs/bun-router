import type { BunQueryBuilderModel } from '../model-binding'
import type { RouteCacheConfig } from '../routing/route-caching'
import type { ThrottleConfig } from '../routing/route-throttling'
import type { EnhancedRequest, MiddlewareHandler, NextFunction, RouteHandler, ThrottlePattern } from '../types'
import { createModelBindingMiddleware } from '../model-binding'
import { createRouteCacheMiddleware, RouteCacheFactory } from '../routing/route-caching'
import { createRateLimitMiddleware, parseThrottleString, ThrottleFactory } from '../routing/route-throttling'
import { DomainGroup, DomainMatcher, SubdomainRouter } from '../routing/subdomain-routing'
import { getNamedRoutePath, registerNamedRoute } from '../url'
import { matchPath } from '../utils'

/**
 * A route registered on a {@link FluentRouter}
 */
export interface RegisteredFluentRoute {
  method: string
  path: string
  handler: RouteHandler
  middleware: MiddlewareHandler[]
  name?: string
}

/**
 * Laravel-style resource controller shape accepted by
 * {@link FluentRouter.resource}. Every action is optional — only the
 * actions present (and allowed by `only`/`except`) are registered.
 */
export interface FluentResourceController {
  index?: RouteHandler
  create?: RouteHandler
  store?: RouteHandler
  show?: RouteHandler
  edit?: RouteHandler
  update?: RouteHandler
  destroy?: RouteHandler
}

/**
 * Fluent route builder with chainable API
 */
export class FluentRouteBuilder {
  private middleware: MiddlewareHandler[] = []
  private cacheConfig?: RouteCacheConfig
  private throttleConfig?: ThrottleConfig
  private routeName?: string
  private modelBindings: Record<string, BunQueryBuilderModel> = {}

  constructor(
    private method: string,
    private path: string,
    private handler: RouteHandler,
  ) {}

  /**
   * Add middleware to route
   */
  addMiddleware(middleware: MiddlewareHandler | MiddlewareHandler[]): this {
    if (Array.isArray(middleware)) {
      this.middleware.push(...middleware)
    }
    else {
      this.middleware.push(middleware)
    }
    return this
  }

  /**
   * Add route caching with tags
   */
  cached(tags: string[] = [], config?: Partial<RouteCacheConfig>): this {
    this.cacheConfig = {
      ...RouteCacheFactory.api(tags),
      ...config,
    }
    return this
  }

  /**
   * Add route throttling with narrow type checking
   */
  throttle(limit: ThrottlePattern | ThrottleConfig, _name?: string): this {
    if (typeof limit === 'string') {
      const parsed = parseThrottleString(limit)
      this.throttleConfig = {
        maxAttempts: parsed.maxAttempts ?? 60,
        windowMs: parsed.windowMs,
        keyGenerator: (req: EnhancedRequest) => req.headers.get('x-forwarded-for') || 'anonymous',
      }
    }
    else {
      this.throttleConfig = limit
    }
    return this
  }

  /**
   * Set route name
   */
  name(name: string): this {
    this.routeName = name
    return this
  }

  /**
   * Bind models to route parameters
   */
  model(parameter: string, model: BunQueryBuilderModel): this {
    this.modelBindings[parameter] = model
    return this
  }

  /**
   * Build the final route configuration
   */
  build(): {
    method: string
    path: string
    handler: RouteHandler
    middleware: MiddlewareHandler[]
    name?: string
  } {
    const finalMiddleware: MiddlewareHandler[] = []

    // Add model binding middleware
    if (Object.keys(this.modelBindings).length > 0) {
      const parameters = Object.keys(this.modelBindings).map(name => ({ name }))
      const modelBindingMiddleware = createModelBindingMiddleware(parameters, this.modelBindings)
      // The model-binding middleware's `next` is `() => Promise<Response>`;
      // the fluent executor always provides one, so the adapter is safe
      finalMiddleware.push(modelBindingMiddleware as unknown as MiddlewareHandler)
    }

    // Add throttling middleware
    if (this.throttleConfig) {
      const throttleMiddleware = createRateLimitMiddleware(this.throttleConfig)
      finalMiddleware.push(throttleMiddleware as MiddlewareHandler)
    }

    // Add caching middleware
    if (this.cacheConfig) {
      const cacheMiddleware = createRouteCacheMiddleware(this.cacheConfig)
      finalMiddleware.push(cacheMiddleware as MiddlewareHandler)
    }

    // Add custom middleware
    finalMiddleware.push(...this.middleware)

    return {
      method: this.method,
      path: this.path,
      handler: this.handler,
      middleware: finalMiddleware,
      name: this.routeName,
    }
  }
}

/**
 * Middleware condition function type
 */
export type MiddlewareCondition = (_request: EnhancedRequest) => boolean | Promise<boolean>

/**
 * Conditional middleware wrapper
 */
export interface ConditionalMiddleware {
  condition: MiddlewareCondition
  middleware: MiddlewareHandler[]
}

/**
 * Builder for conditional middleware
 */
export class FluentConditionalBuilder {
  constructor(
    private router: FluentRouter,
    private condition: MiddlewareCondition,
  ) {}

  middleware(middlewareName: string): this {
    const [name, params] = middlewareName.split(':')
    const middlewareFactory = this.router.resolveNamedMiddleware(name)

    if (!middlewareFactory) {
      throw new Error(`Unknown middleware: ${name}`)
    }

    this.router.addConditionalMiddleware({
      condition: this.condition,
      middleware: [middlewareFactory(params)],
    })

    return this
  }
}

/**
 * Builder for middleware with parameters
 */
export class FluentMiddlewareBuilder {
  constructor(
    private router: FluentRouter,
    private middleware: MiddlewareHandler[],
  ) {}

  get(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('GET', path, handler).addMiddleware(this.middleware)
  }

  post(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('POST', path, handler).addMiddleware(this.middleware)
  }

  put(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('PUT', path, handler).addMiddleware(this.middleware)
  }

  delete(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('DELETE', path, handler).addMiddleware(this.middleware)
  }

  patch(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('PATCH', path, handler).addMiddleware(this.middleware)
  }
}

/**
 * Builder for route groups with middleware
 */
export class FluentRouteGroupBuilder {
  constructor(
    private router: FluentRouter,
    private groupMiddleware: MiddlewareHandler[],
  ) {}

  get(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('GET', path, handler).addMiddleware(this.groupMiddleware)
  }

  post(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('POST', path, handler).addMiddleware(this.groupMiddleware)
  }

  put(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('PUT', path, handler).addMiddleware(this.groupMiddleware)
  }

  delete(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('DELETE', path, handler).addMiddleware(this.groupMiddleware)
  }

  patch(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('PATCH', path, handler).addMiddleware(this.groupMiddleware)
  }
}

/**
 * Fluent router with chainable API and advanced features
 */
export class FluentRouter {
  private routes: RegisteredFluentRoute[] = []

  private globalMiddleware: MiddlewareHandler[] = []
  private subdomainRouter = new SubdomainRouter()
  private routeGroups: Array<{
    prefix?: string
    middleware?: MiddlewareHandler[]
    name?: string
    domain?: string
  }> = []

  // Middleware groups registry
  private middlewareGroups = new Map<string, MiddlewareHandler[]>()

  // Named middleware registry with parameter support
  private namedMiddleware = new Map<string, (params?: string) => MiddlewareHandler>()

  // Conditional middleware
  private conditionalMiddleware: ConditionalMiddleware[] = []

  constructor() {
    this.setupDefaultMiddleware()
  }

  /**
   * Setup default named middleware with parameter support
   */
  private setupDefaultMiddleware(): void {
    // Throttle middleware with parameters
    this.namedMiddleware.set('throttle', (params?: string) => {
      const parsed = params ? parseThrottleString(params as ThrottlePattern) : { maxAttempts: 60, windowMs: 60000 }
      const handler = createRateLimitMiddleware({
        maxAttempts: parsed.maxAttempts,
        windowMs: parsed.windowMs,
        keyGenerator: (req: EnhancedRequest) => req.headers.get('x-forwarded-for') || 'anonymous',
      })

      const adapted: MiddlewareHandler = async (req: EnhancedRequest, next: NextFunction) => {
        const adaptedNext = async () => {
          const res = await next()
          return res ?? new Response(null)
        }
        return await handler(req, adaptedNext)
      }

      return adapted
    })

    // Auth middleware
    this.namedMiddleware.set('auth', () => {
      return async (req: EnhancedRequest, next: NextFunction) => {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '')
        if (!token) {
          return new Response('Unauthorized', { status: 401 })
        }
        // Mock JWT verification
        ;(req as any).user = { id: '123', roles: ['user'] }
        return await next()
      }
    })

    // CORS middleware
    this.namedMiddleware.set('cors', () => {
      return async (_req: EnhancedRequest, next: NextFunction) => {
        const response = await next()
        if (response) {
          const headers = new Headers(response.headers)
          headers.set('Access-Control-Allow-Origin', '*')
          headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
          headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          })
        }
        return response
      }
    })
  }

  /**
   * Register a middleware group
   */
  middlewareGroup(name: string, middlewareNames: string[]): this {
    const middlewareHandlers: MiddlewareHandler[] = []

    for (const middlewareName of middlewareNames) {
      const [name, params] = middlewareName.split(':')
      const middlewareFactory = this.namedMiddleware.get(name)
      if (middlewareFactory) {
        middlewareHandlers.push(middlewareFactory(params))
      }
    }

    this.middlewareGroups.set(name, middlewareHandlers)
    return this
  }

  /**
   * Apply middleware group to routes
   */
  middlewareGroupRoutes(name: string): FluentRouteGroupBuilder {
    const middlewareHandlers = this.middlewareGroups.get(name) || []
    return new FluentRouteGroupBuilder(this, middlewareHandlers)
  }

  /**
   * Conditional middleware execution
   */
  when(condition: MiddlewareCondition): FluentConditionalBuilder {
    return new FluentConditionalBuilder(this, condition)
  }

  /**
   * Look up a named middleware factory.
   * @internal Used by the fluent builders — avoids `as any` reach-ins.
   */
  resolveNamedMiddleware(name: string): ((params?: string) => MiddlewareHandler) | undefined {
    return this.namedMiddleware.get(name)
  }

  /**
   * Register conditional middleware, evaluated per request in {@link handle}.
   * @internal Used by the fluent builders.
   */
  addConditionalMiddleware(conditional: ConditionalMiddleware): void {
    this.conditionalMiddleware.push(conditional)
  }

  /**
   * Apply middleware with parameters
   */
  middleware(middlewareName: string): FluentMiddlewareBuilder {
    const [name, params] = middlewareName.split(':')
    const middlewareFactory = this.namedMiddleware.get(name)

    if (!middlewareFactory) {
      throw new Error(`Unknown middleware: ${name}`)
    }

    const middlewareHandler = middlewareFactory(params)
    return new FluentMiddlewareBuilder(this, [middlewareHandler])
  }

  /**
   * Add global middleware
   */
  use(middleware: MiddlewareHandler): this {
    this.globalMiddleware.push(middleware)
    return this
  }

  /**
   * Create a GET route
   */
  get(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('GET', path, handler)
  }

  /**
   * Create a POST route
   */
  post(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('POST', path, handler)
  }

  /**
   * Create a PUT route
   */
  put(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('PUT', path, handler)
  }

  /**
   * Create a DELETE route
   */
  delete(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('DELETE', path, handler)
  }

  /**
   * Create a PATCH route
   */
  patch(path: string, handler: RouteHandler): FluentRouteBuilder {
    return new FluentRouteBuilder('PATCH', path, handler)
  }

  /**
   * Register a built route
   */
  register(builder: FluentRouteBuilder): this {
    const route = builder.build()
    this.routes.push(route)
    if (route.name)
      registerNamedRoute(route.name, route.path)
    return this
  }

  /**
   * Create a cached route
   */
  cached(tags: string[] = [], config?: Partial<RouteCacheConfig>): {
    get: (path: string, handler: RouteHandler) => FluentRouteBuilder
    post: (path: string, handler: RouteHandler) => FluentRouteBuilder
    put: (path: string, handler: RouteHandler) => FluentRouteBuilder
    delete: (path: string, handler: RouteHandler) => FluentRouteBuilder
    patch: (path: string, handler: RouteHandler) => FluentRouteBuilder
  } {
    return {
      get: (path: string, handler: RouteHandler) =>
        this.get(path, handler).cached(tags, config),
      post: (path: string, handler: RouteHandler) =>
        this.post(path, handler).cached(tags, config),
      put: (path: string, handler: RouteHandler) =>
        this.put(path, handler).cached(tags, config),
      delete: (path: string, handler: RouteHandler) =>
        this.delete(path, handler).cached(tags, config),
      patch: (path: string, handler: RouteHandler) =>
        this.patch(path, handler).cached(tags, config),
    }
  }

  /**
   * Create a throttled route
   */
  throttled(limit: ThrottlePattern | ThrottleConfig): {
    get: (path: string, handler: RouteHandler) => FluentRouteBuilder
    post: (path: string, handler: RouteHandler) => FluentRouteBuilder
    put: (path: string, handler: RouteHandler) => FluentRouteBuilder
    delete: (path: string, handler: RouteHandler) => FluentRouteBuilder
    patch: (path: string, handler: RouteHandler) => FluentRouteBuilder
  } {
    return {
      get: (path: string, handler: RouteHandler) =>
        this.get(path, handler).throttle(limit),
      post: (path: string, handler: RouteHandler) =>
        this.post(path, handler).throttle(limit),
      put: (path: string, handler: RouteHandler) =>
        this.put(path, handler).throttle(limit),
      delete: (path: string, handler: RouteHandler) =>
        this.delete(path, handler).throttle(limit),
      patch: (path: string, handler: RouteHandler) =>
        this.patch(path, handler).throttle(limit),
    }
  }

  /**
   * Create route group with shared attributes
   */
  group(
    config: {
      prefix?: string
      middleware?: MiddlewareHandler[]
      name?: string
      domain?: string
    },
    callback: (router: FluentRouter) => void,
  ): this {
    const groupRouter = new FluentRouter()
    callback(groupRouter)

    for (const route of groupRouter.routes) {
      const groupedRoute = {
        ...route,
        path: config.prefix ? `${config.prefix}${route.path}` : route.path,
        middleware: [
          ...(config.middleware || []),
          ...route.middleware,
        ],
        name: config.name && route.name ? `${config.name}.${route.name}` : route.name,
      }

      if (config.domain) {
        const domainPattern = DomainMatcher.parseDomainPattern(config.domain)
        const domainGroup = new DomainGroup(domainPattern, { domain: config.domain })
        domainGroup.addRoute(
          groupedRoute.method,
          groupedRoute.path,
          groupedRoute.handler,
          groupedRoute.middleware,
          groupedRoute.name,
        )
        this.subdomainRouter.addDomainGroup(domainGroup)
      }
      else {
        this.routes.push(groupedRoute)
        if (groupedRoute.name)
          registerNamedRoute(groupedRoute.name, groupedRoute.path)
      }
    }

    return this
  }

  /**
   * Create subdomain routing group
   */
  domain(pattern: string): {
    routes: (callback: (router: FluentRouter) => void) => FluentRouter
  } {
    return {
      routes: (callback: (router: FluentRouter) => void): FluentRouter => {
        const domainRouter = new FluentRouter()
        callback(domainRouter)

        const domainPattern = DomainMatcher.parseDomainPattern(pattern)
        const domainGroup = new DomainGroup(domainPattern, { domain: pattern })
        for (const route of domainRouter.routes) {
          domainGroup.addRoute(
            route.method,
            route.path,
            route.handler,
            route.middleware,
            route.name,
          )
        }
        this.subdomainRouter.addDomainGroup(domainGroup)

        return this
      },
    }
  }

  /**
   * Create resource routes (Laravel-style)
   */
  resource(name: string, controller: FluentResourceController, options: {
    only?: string[]
    except?: string[]
    model?: BunQueryBuilderModel
  } = {}): this {
    const actions = ['index', 'create', 'store', 'show', 'edit', 'update', 'destroy']
    const allowedActions = options.only || actions.filter(action => !options.except?.includes(action))

    const routes = [
      { action: 'index', method: 'GET', path: `/${name}`, handler: controller.index },
      { action: 'create', method: 'GET', path: `/${name}/create`, handler: controller.create },
      { action: 'store', method: 'POST', path: `/${name}`, handler: controller.store },
      { action: 'show', method: 'GET', path: `/${name}/{${name.slice(0, -1)}}`, handler: controller.show },
      { action: 'edit', method: 'GET', path: `/${name}/{${name.slice(0, -1)}}/edit`, handler: controller.edit },
      { action: 'update', method: 'PUT', path: `/${name}/{${name.slice(0, -1)}}`, handler: controller.update },
      { action: 'destroy', method: 'DELETE', path: `/${name}/{${name.slice(0, -1)}}`, handler: controller.destroy },
    ]

    for (const route of routes) {
      if (allowedActions.includes(route.action) && route.handler) {
        const builder = new FluentRouteBuilder(route.method, route.path, route.handler)
          .name(`${name}.${route.action}`)

        if (options.model && ['show', 'edit', 'update', 'destroy'].includes(route.action)) {
          builder.model(name.slice(0, -1), options.model)
        }

        this.register(builder)
      }
    }

    return this
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RegisteredFluentRoute[] {
    return [...this.routes, ...this.subdomainRouter.getAllRoutes()]
  }

  /**
   * Handle incoming request
   */
  async handle(request: EnhancedRequest): Promise<Response | null> {
    const url = new URL(request.url)

    // Try subdomain routing first
    const domain = url.hostname
    const match = this.subdomainRouter.findDomainGroup(domain)
    if (match) {
      // Add domain parameters to request
      const enhancedReq = request as EnhancedRequest & { domainParams?: Record<string, string> }
      enhancedReq.domainParams = match.parameters

      // Find matching route in domain group
      for (const route of match.group.getRoutes()) {
        const params = this.matchRouteParams(route, request.method, url.pathname)
        if (params) {
          return await this.executeRoute(route, enhancedReq, params)
        }
      }
    }

    // Find matching route
    for (const route of this.routes) {
      const params = this.matchRouteParams(route, request.method, url.pathname)
      if (params) {
        return await this.executeRoute(route, request, params)
      }
    }

    return null
  }

  /**
   * Match a route against the request, extracting path parameters.
   *
   * Delegates to the same `matchPath` used by the main `Router`, so the
   * fluent API has identical semantics for `{param}`, optional `{param?}`,
   * and wildcard segments (the previous ad-hoc regex neither escaped
   * static text nor extracted params at all).
   *
   * @returns the extracted params, or `null` when the route doesn't match
   */
  private matchRouteParams(
    route: RegisteredFluentRoute,
    method: string,
    pathname: string,
  ): Record<string, string> | null {
    if (route.method !== method) {
      return null
    }

    const params: Record<string, string> = {}
    return matchPath(route.path, pathname, params) ? params : null
  }

  /**
   * Execute route with middleware (global → conditional → route-specific)
   */
  private async executeRoute(
    route: RegisteredFluentRoute,
    request: EnhancedRequest,
    params: Record<string, string>,
  ): Promise<Response> {
    // Expose extracted path parameters to middleware and the handler
    ;(request as { params?: Record<string, string> }).params = params

    const allMiddleware = [...this.globalMiddleware]

    // Conditional middleware (registered via `when(...)`) runs when its
    // condition holds for this request — previously it was collected but
    // never consulted
    for (const conditional of this.conditionalMiddleware) {
      if (await conditional.condition(request)) {
        allMiddleware.push(...conditional.middleware)
      }
    }

    allMiddleware.push(...route.middleware)

    let index = 0
    const next = async (): Promise<Response> => {
      if (index < allMiddleware.length) {
        const middleware = allMiddleware[index++]
        const result = await middleware(request, next)
        return result ?? new Response(null)
      }
      return await route.handler(request)
    }

    return await next()
  }
}

/** API route options */
export interface ApiRouteOptions {
  method?: string
  cache?: string[]
  throttle?: string
}

/** Protected route options */
export interface ProtectedRouteOptions {
  method?: string
  roles?: string[]
}

/** Upload route options */
export interface UploadRouteOptions {
  maxSize?: number
  allowedTypes?: string[]
}

/**
 * Factory functions for common route patterns
 */
export const RouteFactory: {
  api: (path: string, handler: RouteHandler, options?: ApiRouteOptions) => FluentRouteBuilder
  protected: (path: string, handler: RouteHandler, options?: ProtectedRouteOptions) => FluentRouteBuilder
  upload: (path: string, handler: RouteHandler, options?: UploadRouteOptions) => FluentRouteBuilder
} = {
  /**
   * API route with caching and throttling
   */
  api: (path: string, handler: RouteHandler, options: ApiRouteOptions = {}): FluentRouteBuilder => {
    const method = options.method || 'GET'
    const builder = new FluentRouteBuilder(method, path, handler)

    if (options.cache) {
      builder.cached(options.cache)
    }

    if (options.throttle) {
      builder.throttle(options.throttle as ThrottlePattern)
    }

    return builder
  },

  /**
   * Protected route with authentication
   */
  protected: (path: string, handler: RouteHandler, options: ProtectedRouteOptions = {}): FluentRouteBuilder => {
    const method = options.method || 'GET'
    const builder = new FluentRouteBuilder(method, path, handler)

    // Add auth middleware (would need to be implemented)
    builder.addMiddleware(async (req: EnhancedRequest, next: NextFunction) => {
      // Mock auth check
      if (!req.headers.get('Authorization')) {
        return new Response('Unauthorized', { status: 401 })
      }
      return await next()
    })

    return builder
  },

  /**
   * File upload route
   */
  upload: (path: string, handler: RouteHandler, _options: UploadRouteOptions = {}): FluentRouteBuilder => {
    const builder = new FluentRouteBuilder('POST', path, handler)

    // Add file upload middleware (would need to be implemented)
    builder.addMiddleware(async (_req: EnhancedRequest, next: NextFunction) => {
      // Mock file upload handling
      return await next()
    })

    return builder
  },
}

/**
 * Utility functions
 */
export const RouterUtils = {
  /**
   * Generate a URL for a named route. Resolves the path from the shared
   * named-route registry (the same one `router.route()`/`url()` use);
   * falls back to `/<name>` when the name was never registered.
   */
  route: (name: string, params: Record<string, string> = {}, query: Record<string, string> = {}): string => {
    let url = getNamedRoutePath(name) ?? `/${name}`

    for (const [key, value] of Object.entries(params)) {
      const encoded = encodeURIComponent(value)
      url = url.replace(`{${key}}`, encoded)
      url = url.replace(`{${key}?}`, encoded)
    }

    // Drop unfilled optional placeholders and tidy the slashes they leave
    if (url.includes('?}')) {
      url = url.replace(/\{[^}]+\?\}/g, '').replace(/\/{2,}/g, '/')
      if (url.length > 1 && url.endsWith('/'))
        url = url.slice(0, -1)
    }

    const queryString = new URLSearchParams(query).toString()
    if (queryString) {
      url += `?${queryString}`
    }

    return url
  },

  /**
   * Redirect response
   */
  redirect: (url: string, status: number = 302): Response => {
    return new Response(null, {
      status,
      headers: { Location: url },
    })
  },

  /**
   * JSON response
   */
  json: (data: unknown, status: number = 200): Response => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}

/**
 * Global router instance
 */
export const router: FluentRouter = new FluentRouter()

/**
 * Export commonly used factory functions
 */
export { RouteCacheFactory, ThrottleFactory }
