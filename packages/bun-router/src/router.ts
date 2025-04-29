import type { Server, ServerWebSocket } from 'bun'
import type { ActionHandler, ActionHandlerClass, EnhancedRequest, MiddlewareHandler, Route, RouteDefinition, RouteGroup, RouteHandler, RouterConfig, ServerOptions, WebSocketConfig } from './types'
import { join } from 'node:path'
import process from 'node:process'
import { fileExists, isActionClass, isRouteHandler, matchPath, normalizePath, processHtmlTemplate, resolveViewPath, toActionPath } from './utils'

export class Router {
  private routes: Route[] = []
  private currentGroup: RouteGroup | null = null
  private globalMiddleware: MiddlewareHandler[] = []
  private namedRoutes: Map<string, Route> = new Map()
  private fallbackHandler: ActionHandler | null = null
  private patterns: Map<string, string> = new Map()
  private currentDomain: string | null = null
  private serverInstance: Server | null = null
  private wsConfig: WebSocketConfig | null = null
  private config: RouterConfig = {
    verbose: false,
    routesPath: 'routes',
    apiRoutesPath: 'routes/api.ts',
    webRoutesPath: 'routes/web.ts',
    apiPrefix: '/api',
    webPrefix: '',
    defaultMiddleware: {
      api: [],
      web: [],
    },
  }

  constructor(config: Partial<RouterConfig> = {}) {
    this.routes = []
    this.config = { ...this.config, ...config }
  }

  private async addRoute(method: string, path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    // Apply prefix from configuration based on route type
    let prefixedPath = path
    if (type === 'api' && this.config.apiPrefix) {
      prefixedPath = `${this.config.apiPrefix}${path}`
    }
    else if (type === 'web' && this.config.webPrefix) {
      prefixedPath = `${this.config.webPrefix}${path}`
    }

    // Apply prefix from current group if exists
    if (this.currentGroup && this.currentGroup.prefix) {
      prefixedPath = `${this.currentGroup.prefix}${prefixedPath}`
    }

    prefixedPath = normalizePath(prefixedPath)

    // Get middleware
    const middleware: MiddlewareHandler[] = []

    // Apply default middleware based on route type
    if (type === 'api' && this.config.defaultMiddleware?.api) {
      for (const middlewareItem of this.config.defaultMiddleware.api) {
        const resolved = await this.resolveMiddleware(middlewareItem)
        if (resolved) {
          middleware.push(resolved)
        }
      }
    }
    else if (type === 'web' && this.config.defaultMiddleware?.web) {
      for (const middlewareItem of this.config.defaultMiddleware.web) {
        const resolved = await this.resolveMiddleware(middlewareItem)
        if (resolved) {
          middleware.push(resolved)
        }
      }
    }

    // Apply middleware from current group
    if (this.currentGroup && this.currentGroup.middleware) {
      for (const middlewareItem of this.currentGroup.middleware) {
        const resolved = await this.resolveMiddleware(middlewareItem)
        if (resolved) {
          middleware.push(resolved)
        }
      }
    }

    // Create the route
    const route: Route = {
      path: prefixedPath,
      handler,
      method,
      middleware,
      type,
      name,
      constraints: {},
    }

    // Add domain if in a domain group
    if (this.currentDomain) {
      route.domain = this.currentDomain
    }

    // Add to routes collection
    this.routes.push(route)

    // Register named route for reverse routing
    if (name) {
      this.namedRoutes.set(name, route)
    }

    return this
  }

  async get(path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    return this.addRoute('GET', path, handler, type, name)
  }

  async post(path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    return this.addRoute('POST', path, handler, type, name)
  }

  async put(path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    return this.addRoute('PUT', path, handler, type, name)
  }

  async patch(path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    return this.addRoute('PATCH', path, handler, type, name)
  }

  async delete(path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    return this.addRoute('DELETE', path, handler, type, name)
  }

  async options(path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    return this.addRoute('OPTIONS', path, handler, type, name)
  }

  /**
   * Register a route that responds to multiple HTTP methods
   */
  async match(methods: string[], path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    for (const method of methods) {
      await this.addRoute(method, path, handler, type, name)
    }
    return this
  }

  /**
   * Register a route that responds to any HTTP method
   */
  async any(path: string, handler: ActionHandler, type?: 'api' | 'web', name?: string): Promise<Router> {
    return this.match(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], path, handler, type, name)
  }

  /**
   * Group routes with shared attributes
   * @param options Group configuration options
   * @param callback Function that registers routes in this group
   */
  async group(options: RouteGroup, callback: () => void): Promise<Router> {
    const previousGroup = this.currentGroup
    this.currentGroup = options

    callback()

    this.currentGroup = previousGroup
    return this
  }

  /**
   * Set a prefix for all route names defined in the callback
   * @param prefix The route name prefix to use
   * @param callback Function that registers routes with this name prefix
   */
  async name(prefix: string, callback: () => void): Promise<Router> {
    const previousNamePrefix = (this as any)._namePrefix || ''
    ;(this as any)._namePrefix = previousNamePrefix + prefix

    callback()

    ;(this as any)._namePrefix = previousNamePrefix
    return this
  }

  /**
   * Register a controller for a group of routes
   * @param controller The controller class
   * @param callback Function that registers routes using the controller
   */
  async controller(controller: string | (new () => any), callback: () => void): Promise<Router> {
    const previousController = (this as any)._currentController
    ;(this as any)._currentController = controller

    callback()

    ;(this as any)._currentController = previousController
    return this
  }

  /**
   * Set a domain or subdomain for all routes defined in the callback
   * @param domain The domain/subdomain pattern (e.g., '{account}.example.com')
   * @param callback Function that registers routes for this domain
   */
  async domain(domain: string, callback: () => void): Promise<Router> {
    const previousDomain = this.currentDomain
    this.currentDomain = domain

    callback()

    this.currentDomain = previousDomain
    return this
  }

  /**
   * Set a URI prefix for all routes defined in the callback
   * @param prefix The URI prefix to use
   * @param callback Function that registers routes with this prefix
   */
  async prefix(prefix: string, callback: () => void): Promise<Router> {
    return this.group({ prefix }, callback)
  }

  /**
   * Register a healthcheck route at /health
   */
  async health(): Promise<Router> {
    return this.get('/health', () => {
      return new Response('OK', { status: 200 })
    }, 'api')
  }

  /**
   * Register a fallback handler for 404 routes
   * @param handler The handler to use for unmatched routes
   */
  async fallback(handler: ActionHandler): Promise<Router> {
    this.fallbackHandler = handler
    return this
  }

  async resource(name: string, handler: string | { [key: string]: ActionHandler }, type: 'api' | 'web' = 'api'): Promise<Router> {
    const basePath = `/${name}`
    const resourcePath = (subPath: string = '') => `${basePath}${subPath}`

    if (typeof handler === 'string') {
      // String handler as base controller path
      await this.get(resourcePath(), `${handler}/index`, type)
      await this.get(resourcePath('/{id}'), `${handler}/show`, type)
      await this.post(resourcePath(), `${handler}/store`, type)
      await this.put(resourcePath('/{id}'), `${handler}/update`, type)
      await this.delete(resourcePath('/{id}'), `${handler}/destroy`, type)
    }
    else {
      // Object with explicit handlers
      if (handler.index)
        await this.get(resourcePath(), handler.index, type)
      if (handler.show)
        await this.get(resourcePath('/{id}'), handler.show, type)
      if (handler.store)
        await this.post(resourcePath(), handler.store, type)
      if (handler.update)
        await this.put(resourcePath('/{id}'), handler.update, type)
      if (handler.destroy)
        await this.delete(resourcePath('/{id}'), handler.destroy, type)
    }

    return this
  }

  /**
   * Generate a URL for a named route with the provided parameters
   * @param name The name of the route
   * @param params The parameters to substitute in the route path
   * @returns The generated URL
   */
  route(name: string, params: Record<string, string> = {}): string {
    const route = this.namedRoutes.get(name)

    if (!route) {
      throw new Error(`Route with name '${name}' not found`)
    }

    let path = route.path

    // Replace path parameters with values
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`{${key}}`, value)
    })

    return path
  }

  /**
   * Register global middleware
   * @param middleware The middleware to register
   */
  async use(...middleware: (string | MiddlewareHandler)[]): Promise<Router> {
    for (const m of middleware) {
      const resolvedMiddleware = await this.resolveMiddleware(m)
      if (resolvedMiddleware) {
        this.globalMiddleware.push(resolvedMiddleware)
      }
    }
    return this
  }

  private async resolveMiddleware(middleware: string | MiddlewareHandler): Promise<MiddlewareHandler | null> {
    if (typeof middleware === 'string') {
      // Handle middleware class imports dynamically
      try {
        const MiddlewareModule = await import(`./middleware/${middleware}`)
        const MiddlewareClass = MiddlewareModule.default
        const middlewareInstance = new MiddlewareClass()
        return middlewareInstance.handle.bind(middlewareInstance)
      }
      catch (error: unknown) {
        console.error(`Failed to load middleware: ${middleware}`, error)
        return null
      }
    }
    else {
      return middleware
    }
  }

  private async runMiddleware(req: EnhancedRequest, middlewareStack: MiddlewareHandler[]): Promise<Response | null> {
    let index = 0

    const next = async (): Promise<Response> => {
      if (index >= middlewareStack.length) {
        return new Response('Middleware stack exhausted without a response', { status: 500 })
      }

      const middleware = middlewareStack[index++]
      return await middleware(req, next)
    }

    if (middlewareStack.length === 0) {
      return null
    }

    try {
      return await next()
    }
    catch (error) {
      console.error('Error in middleware:', error)
      return new Response('Middleware error', { status: 500 })
    }
  }

  private async resolveHandler(handler: ActionHandler, req: EnhancedRequest): Promise<Response> {
    if (typeof handler === 'string') {
      // Handle action class imports dynamically
      const actionPath: string = toActionPath(handler)
      try {
        const ActionModule = await import(`./actions/${actionPath}`)
        const ActionClass = ActionModule.default
        const actionInstance = new ActionClass()
        return await actionInstance.handle(req)
      }
      catch (error: unknown) {
        console.error(`Failed to load action: ${handler}`, error)
        return new Response('Internal Server Error', { status: 500 })
      }
    }
    else if (isActionClass(handler)) {
      // It's a class constructor
      const ActionClass = handler as (new () => ActionHandlerClass)
      const actionInstance = new ActionClass()
      return await actionInstance.handle(req)
    }
    else if (isRouteHandler(handler)) {
      // It's a route handler function
      return handler(req)
    }

    return new Response('Invalid handler type', { status: 500 })
  }

  /**
   * Create a redirect response
   * @param url The URL to redirect to
   * @param status HTTP status code
   */
  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    return Response.redirect(url, status)
  }

  /**
   * Create a permanent (301) redirect response
   * @param url The URL to redirect to
   */
  permanentRedirect(url: string): Response {
    return this.redirect(url, 301)
  }

  /**
   * Register a redirect route
   * @param from Path to redirect from
   * @param to Path to redirect to
   * @param status HTTP status code (default: 302)
   */
  async redirectRoute(from: string, to: string, status: 301 | 302 | 303 | 307 | 308 = 302): Promise<Router> {
    return this.get(from, () => this.redirect(to, status))
  }

  /**
   * Register a permanent redirect route (301)
   * @param from Path to redirect from
   * @param to Path to redirect to
   */
  async permanentRedirectRoute(from: string, to: string): Promise<Router> {
    return this.redirectRoute(from, to, 301)
  }

  /**
   * Set a global pattern for a parameter
   * @param name Parameter name
   * @param pattern Regular expression pattern
   */
  pattern(name: string, pattern: string): Router {
    this.patterns.set(name, pattern)
    return this
  }

  /**
   * Add constraints to the most recently added route
   * @param params Object with parameter names and pattern strings
   */
  where(params: Record<string, string>): Router {
    const lastRoute = this.routes[this.routes.length - 1]
    if (lastRoute) {
      lastRoute.constraints = {
        ...lastRoute.constraints,
        ...params,
      }
    }
    else {
      console.warn('No route to apply constraints to')
    }
    return this
  }

  /**
   * Add a numeric constraint to the most recently added route
   * @param param The parameter name to constrain
   */
  whereNumber(param: string): Router {
    return this.where({ [param]: '\\d+' })
  }

  /**
   * Add an alphabetic constraint to the most recently added route
   * @param param The parameter name to constrain
   */
  whereAlpha(param: string): Router {
    return this.where({ [param]: '[A-Za-z]+' })
  }

  /**
   * Add an alphanumeric constraint to the most recently added route
   * @param param The parameter name to constrain
   */
  whereAlphaNumeric(param: string): Router {
    return this.where({ [param]: '[A-Za-z0-9]+' })
  }

  /**
   * Add a UUID constraint to the most recently added route
   * @param param The parameter name to constrain
   */
  whereUuid(param: string): Router {
    return this.where({ [param]: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' })
  }

  whereIn(param: string, values: string[]): Router {
    return this.where({ [param]: values.join('|') })
  }

  /**
   * Cache for compiled templates
   */
  private templateCache = new Map<string, string>()

  /**
   * Render a view with the provided data
   * @param view The view name or path to render
   * @param data The data to pass to the view
   * @param options View rendering options
   */
  async renderView(
    view: string,
    data: Record<string, any> = {},
    options: { layout?: string } = {},
  ): Promise<string> {
    const viewConfig = this.config.views || {
      viewsPath: 'resources/views',
      extensions: ['.html', '.stx'],
      cache: false,
      engine: 'auto',
    }

    // Set path defaults
    const viewsPath = viewConfig.viewsPath || 'resources/views'
    const extensions = viewConfig.extensions || ['.html', '.stx']

    // Try to find the view file
    const viewPath = await resolveViewPath(view, viewsPath, extensions)

    if (!viewPath) {
      throw new Error(`View '${view}' not found in '${viewsPath}' with extensions ${extensions.join(', ')}`)
    }

    // Check cache first
    if (viewConfig.cache && this.templateCache.has(viewPath)) {
      return await this.processTemplate(this.templateCache.get(viewPath)!, data, viewConfig)
    }

    // Read the view file
    const file = Bun.file(viewPath)
    const viewContent = await file.text()

    // Cache the template if enabled
    if (viewConfig.cache) {
      this.templateCache.set(viewPath, viewContent)
    }

    // Process the template
    let processed = await this.processTemplate(viewContent, data, viewConfig)

    // Handle layout if specified
    if (options.layout || viewConfig.defaultLayout) {
      const layoutName = options.layout || viewConfig.defaultLayout

      if (layoutName) {
        const layoutPath = await resolveViewPath(layoutName, viewsPath, extensions)

        if (layoutPath) {
          // Cache check for layout
          let layoutContent
          if (viewConfig.cache && this.templateCache.has(layoutPath)) {
            layoutContent = this.templateCache.get(layoutPath)!
          }
          else {
            const layoutFile = Bun.file(layoutPath)
            layoutContent = await layoutFile.text()

            if (viewConfig.cache) {
              this.templateCache.set(layoutPath, layoutContent)
            }
          }

          // Replace {{content}} in the layout with the processed view
          processed = layoutContent.replace(/\{\{content\}\}/g, processed)

          // Process the layout with the data
          processed = await this.processTemplate(processed, data, viewConfig)
        }
      }
    }

    // Apply minification if enabled
    if (viewConfig.minify?.enabled) {
      // Simple minification - replace multiple whitespace with single space
      processed = processed
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim()
    }

    return processed
  }

  /**
   * Process a template with the appropriate engine
   */
  private async processTemplate(
    template: string,
    data: Record<string, any>,
    viewConfig: RouterConfig['views'],
  ): Promise<string> {
    // Default to internal HTML processor
    if (!viewConfig) {
      return processHtmlTemplate(template, data)
    }

    // Detect the engine based on file extension or explicit setting
    const engine = viewConfig.engine || 'auto'

    // Use custom renderer if provided
    if (viewConfig.customRenderer) {
      return viewConfig.customRenderer(template, data, {
        helpers: viewConfig.helpers,
      })
    }

    // Process with built-in template engines
    switch (engine) {
      case 'html':
        return processHtmlTemplate(template, data)
      case 'stx':
        // If STX format is just a matter of different delimiters, adjust here
        // For now, we'll treat STX templates the same as HTML
        return processHtmlTemplate(template, data)
      case 'auto':
      default:
        // Default to HTML processing
        return processHtmlTemplate(template, data)
    }
  }

  /**
   * Registers a route that renders a view
   */
  async view(
    path: string,
    viewOrData: string | Record<string, any>,
    dataOrOptions: Record<string, any> | { layout?: string, status?: number, headers?: Record<string, string> } = {},
    optionsOrType: { layout?: string, status?: number, headers?: Record<string, string> } | 'web' | 'api' = {},
    typeOrName: 'web' | 'api' | string = 'web',
    name?: string,
  ): Promise<Router> {
    // Handle overloaded parameters
    let view: string
    let data: Record<string, any>
    let options: { layout?: string, status?: number, headers?: Record<string, string> }
    let type: 'web' | 'api'

    // If viewOrData is an object, it's actually the data and we should derive view from path
    if (typeof viewOrData === 'object') {
      // Extract the path name without leading slash for view name
      view = path.replace(/^\/+/, '')
      data = viewOrData

      if (typeof dataOrOptions === 'string' || (dataOrOptions && typeof dataOrOptions === 'object' && 'layout' in dataOrOptions)) {
        // dataOrOptions is actually options
        options = dataOrOptions as { layout?: string, status?: number, headers?: Record<string, string> }
        type = optionsOrType as 'web' | 'api'
        if (typeof typeOrName === 'string' && (typeOrName !== 'web' && typeOrName !== 'api')) {
          name = typeOrName
        }
      }
      else {
        // Default values
        options = {}
        type = 'web'
      }
    }
    else {
      // Standard parameter order
      view = viewOrData
      data = dataOrOptions as Record<string, any>
      options = optionsOrType as { layout?: string, status?: number, headers?: Record<string, string> }
      type = typeOrName as 'web' | 'api'
    }

    return this.get(path, async () => {
      try {
        const content = await this.renderView(view, data, options)

        // Return the rendered view with appropriate headers
        return new Response(content, {
          status: options.status || 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...options.headers,
          },
        })
      }
      catch (error) {
        console.error('Error rendering view:', error)
        return new Response(`Error rendering view: ${error instanceof Error ? error.message : String(error)}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        })
      }
    }, type, name)
  }

  /**
   * Convert existing routes to the Bun.serve routes format
   * This enables Bun's native static routing and method-specific handlers
   */
  buildBunServeRoutes(): Record<string, any> {
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
            const testResult = (route.handler as RouteHandler)(mockReq)

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
          const params = matchPath(path, url.pathname, route.constraints) || {}
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
            const params = matchPath(path, url.pathname, route.constraints) || {}
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

  private matchRoute(path: string, method: string): Route | null {
    return this.routes.find(route =>
      matchPath(route.path, path, route.constraints) !== null && route.method === method,
    ) || null
  }

  private extractParams(routePath: string, requestPath: string): Record<string, string> {
    return matchPath(routePath, requestPath) || {}
  }

  async loadRoutes(): Promise<void> {
    const apiPath = join(process.cwd(), this.config.apiRoutesPath || 'routes/api.ts')
    const webPath = join(process.cwd(), this.config.webRoutesPath || 'routes/web.ts')

    try {
      // Load API routes
      try {
        const apiRoutes = await import(apiPath)
        if (apiRoutes.default) {
          const routes = Array.isArray(apiRoutes.default) ? apiRoutes.default : [apiRoutes.default]
          for (const route of routes) {
            await this.registerRoute(route, 'api')
          }
        }
      }
      catch {
        if (this.config.verbose) {
          console.warn(`No API routes found at ${apiPath}`)
        }
      }

      // Load web routes
      try {
        const webRoutes = await import(webPath)
        if (webRoutes.default) {
          const routes = Array.isArray(webRoutes.default) ? webRoutes.default : [webRoutes.default]
          for (const route of routes) {
            await this.registerRoute(route, 'web')
          }
        }
      }
      catch {
        if (this.config.verbose) {
          console.warn(`No web routes found at ${webPath}`)
        }
      }
    }
    catch (error: unknown) {
      console.error('Error loading routes:', error)
    }
  }

  private async registerRoute(route: RouteDefinition, type: 'api' | 'web'): Promise<void> {
    const { method = 'GET', path, handler } = route
    await this.addRoute(method, path, handler, type)
  }

  async handleRequest(req: Request): Promise<Response> {
    const url: URL = new URL(req.url)
    const path: string = url.pathname
    const method: string = req.method
    const hostname: string = url.hostname

    const matchedRoute: Route | null = this.routes.find((route) => {
      // Check domain if specified
      if (route.domain && !this.matchDomain(route.domain, hostname)) {
        return false
      }

      return matchPath(route.path, path, route.constraints) !== null && route.method === method
    }) || null

    if (!matchedRoute) {
      if (this.fallbackHandler) {
        // Create enhanced request with empty params
        const enhancedReq: EnhancedRequest = this.enhanceRequest(req, {})
        return await this.resolveHandler(this.fallbackHandler, enhancedReq)
      }
      return new Response('Not Found', { status: 404 })
    }

    // Extract route parameters
    const params: Record<string, string> = matchPath(matchedRoute.path, path, matchedRoute.constraints) || {}

    // Add domain parameters if applicable
    if (matchedRoute.domain) {
      const domainParams = this.extractDomainParams(matchedRoute.domain, hostname)
      Object.assign(params, domainParams)
    }

    // Create enhanced request with params
    const enhancedReq: EnhancedRequest = this.enhanceRequest(req, params)

    try {
      // Run global middleware first
      const globalMiddlewareResult = await this.runMiddleware(enhancedReq, this.globalMiddleware)
      if (globalMiddlewareResult)
        return this.applyModifiedCookies(globalMiddlewareResult, enhancedReq)

      // Run route-specific middleware
      const routeMiddlewareResult = await this.runMiddleware(enhancedReq, matchedRoute.middleware)
      if (routeMiddlewareResult)
        return this.applyModifiedCookies(routeMiddlewareResult, enhancedReq)

      // If middleware passes, run the handler
      const response = await this.resolveHandler(matchedRoute.handler, enhancedReq)
      return this.applyModifiedCookies(response, enhancedReq)
    }
    catch (error) {
      console.error('Error handling request:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  /**
   * Enhance a regular request with additional properties like params and cookies
   */
  private enhanceRequest(req: Request, params: Record<string, string>): EnhancedRequest {
    // Parse and organize cookies from the request
    const cookieHeader = req.headers.get('cookie') || ''
    const cookieMap: Record<string, string> = {}

    cookieHeader.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookieMap[name] = decodeURIComponent(value)
      }
    })

    // Set of modified cookies (for tracking changes)
    const modifiedCookies = new Set<string>()

    // Create the cookie handler
    const cookies = {
      get: (name: string): string | undefined => {
        return cookieMap[name]
      },

      set: (name: string, value: string, options: any = {}): void => {
        cookieMap[name] = value
        modifiedCookies.add(name)
        // Store options for later serialization
        ;(cookies as any)._options = (cookies as any)._options || {}
        ;(cookies as any)._options[name] = options
      },

      delete: (name: string, options: any = {}): void => {
        delete cookieMap[name]
        modifiedCookies.add(name)
        // Store deletion options
        ;(cookies as any)._options = (cookies as any)._options || {}
        ;(cookies as any)._options[name] = { ...options, deleted: true }
      },

      getAll: (): Record<string, string> => {
        return { ...cookieMap }
      },

      // Add internal properties for tracking
      _modified: modifiedCookies,
      _options: {} as Record<string, any>,
    }

    // Create enhanced request
    return Object.assign(req, {
      params,
      cookies,
    }) as EnhancedRequest
  }

  /**
   * Apply modified cookies to the response
   */
  private applyModifiedCookies(response: Response, req: EnhancedRequest): Response {
    const cookies = req.cookies as any
    if (!cookies || !cookies._modified || cookies._modified.size === 0) {
      return response
    }

    // Clone the response to modify headers
    const headers = new Headers(response.headers)

    // Add Set-Cookie headers for each modified cookie
    cookies._modified.forEach((name: string) => {
      const value = cookies.get(name)
      const options = cookies._options[name] || {}

      if (options.deleted || value === undefined) {
        // Delete cookie by setting maxAge=0 and empty value
        const cookieStr = this.serializeCookie(name, '', { ...options, maxAge: 0 })
        headers.append('Set-Cookie', cookieStr)
      }
      else {
        // Set new/modified cookie
        const cookieStr = this.serializeCookie(name, value, options)
        headers.append('Set-Cookie', cookieStr)
      }
    })

    // Return new response with updated headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  /**
   * Serialize a cookie name, value and options to a cookie string
   */
  private serializeCookie(name: string, value: string, options: any = {}): string {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

    if (options.maxAge) {
      cookie += `; Max-Age=${options.maxAge}`
    }

    if (options.expires) {
      cookie += `; Expires=${options.expires.toUTCString()}`
    }

    if (options.path) {
      cookie += `; Path=${options.path}`
    }

    if (options.domain) {
      cookie += `; Domain=${options.domain}`
    }

    if (options.httpOnly) {
      cookie += '; HttpOnly'
    }

    if (options.secure) {
      cookie += '; Secure'
    }

    if (options.sameSite) {
      cookie += `; SameSite=${options.sameSite}`
    }

    return cookie
  }

  /**
   * Check if a hostname matches a domain pattern
   * @param pattern Domain pattern (e.g., '{account}.example.com')
   * @param hostname The actual hostname to match against
   */
  private matchDomain(pattern: string, hostname: string): boolean {
    // Convert the domain pattern to a regex
    const regex = pattern.replace(/\{([^}]+)\}/g, '([^.]+)')
      .replace(/\./g, '\\.')

    return new RegExp(`^${regex}$`).test(hostname)
  }

  /**
   * Extract parameters from a domain pattern
   * @param pattern Domain pattern (e.g., '{account}.example.com')
   * @param hostname The actual hostname
   */
  private extractDomainParams(pattern: string, hostname: string): Record<string, string> {
    const paramNames = (pattern.match(/\{([^}]+)\}/g) || [])
      .map(param => param.slice(1, -1))

    const regex = pattern.replace(/\{([^}]+)\}/g, '([^.]+)')
      .replace(/\./g, '\\.')

    const matches = hostname.match(new RegExp(`^${regex}$`))

    if (!matches) {
      return {}
    }

    const params: Record<string, string> = {}
    paramNames.forEach((name, index) => {
      params[name] = matches[index + 1]
    })

    return params
  }

  /**
   * Set up an error handler for the server
   */
  errorHandler: ((error: Error) => Response | Promise<Response>) | null = null

  /**
   * Register an error handler for the server
   */
  async onError(handler: (error: Error) => Response | Promise<Response>): Promise<Router> {
    this.errorHandler = handler
    return this
  }

  /**
   * Configure WebSocket handling for the server
   * @param config WebSocket configuration
   * @returns This router instance for chaining
   */
  websocket(config: WebSocketConfig): Router {
    this.wsConfig = config
    return this
  }

  /**
   * Publish a message to all WebSocket clients subscribed to a topic
   * @param topic The topic to publish to
   * @param data The message data
   * @param compress Whether to compress the message
   * @returns Status of the send operation
   */
  publish(topic: string, data: string | ArrayBuffer | Uint8Array, compress = false): number {
    if (!this.serverInstance) {
      throw new Error('Server not started. Call serve() first.')
    }

    return this.serverInstance.publish(topic, data, compress)
  }

  /**
   * Get the number of subscribers for a topic
   * @param topic The topic to check
   * @returns Number of subscribers
   */
  subscriberCount(topic: string): number {
    if (!this.serverInstance) {
      throw new Error('Server not started. Call serve() first.')
    }

    return this.serverInstance.subscriberCount(topic)
  }

  /**
   * Upgrade an HTTP request to a WebSocket connection
   * @param request The HTTP request to upgrade
   * @param options Upgrade options
   * @returns Whether the upgrade was successful
   */
  upgrade(request: Request, options?: { headers?: Record<string, string>, data?: any }): boolean {
    if (!this.serverInstance) {
      throw new Error('Server not started. Call serve() first.')
    }

    return this.serverInstance.upgrade(request, options)
  }

  /**
   * Get the IP address of a request
   * @param request The request to get the IP for
   * @returns IP address and port, or null if not available
   */
  requestIP(request: Request): { address: string, port: number } | null {
    if (!this.serverInstance) {
      throw new Error('Server not started. Call serve() first.')
    }

    return this.serverInstance.requestIP(request)
  }

  /**
   * Set a custom timeout for a request
   * @param request The request to set the timeout for
   * @param seconds Timeout in seconds (0 to disable)
   */
  timeout(request: Request, seconds: number): void {
    if (!this.serverInstance) {
      throw new Error('Server not started. Call serve() first.')
    }

    this.serverInstance.timeout(request, seconds)
  }

  /**
   * Stream a file as a response
   * @param path Path to the file
   * @param options Optional response options
   * @returns Response with the file content
   */
  streamFile(path: string, options?: { headers?: Record<string, string>, status?: number }): Response {
    const file = Bun.file(path)

    return new Response(file, {
      headers: options?.headers,
      status: options?.status || 200,
    })
  }

  /**
   * Stream a file with range support (for partial content responses)
   * @param path Path to the file
   * @param req Request to extract range headers from
   * @returns Response with the file content (possibly partial)
   */
  async streamFileWithRanges(path: string, req: Request): Promise<Response> {
    const file = Bun.file(path)
    const size = await file.size
    const rangeHeader = req.headers.get('range')

    if (!rangeHeader) {
      return new Response(file)
    }

    // Parse range header
    const matches = rangeHeader.match(/bytes=(\d+)-(\d+)?/)
    if (!matches) {
      return new Response(file)
    }

    const start = Number.parseInt(matches[1], 10)
    const end = matches[2] ? Number.parseInt(matches[2], 10) : size - 1

    // Check if range is valid
    if (Number.isNaN(start) || Number.isNaN(end) || start >= size || end >= size) {
      return new Response('Invalid Range', { status: 416 })
    }

    // Return partial content
    return new Response(file.slice(start, end + 1), {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
        'Accept-Ranges': 'bytes',
      },
    })
  }

  /**
   * Start a server with the defined routes
   * @param options Server options
   * @returns Server instance
   */
  async serve(options: ServerOptions = {}): Promise<Server> {
    // Load routes before starting the server
    await this.loadRoutes()

    // Build Bun.serve compatible routes
    const routes = this.buildBunServeRoutes()

    // Configure server with both routes and a fetch fallback
    const server = Bun.serve({
      ...options,
      // Use the new routes API for static and method-specific routes
      routes,
      // Keep a fetch handler for backward compatibility and dynamic routes
      fetch: req => this.handleRequest(req),
      // Add error handling
      error: this.errorHandler ? error => this.errorHandler!(error) : undefined,
      // Add WebSocket support if configured
      websocket: this.wsConfig || undefined,
    })

    // Store server instance for later reference
    this.serverInstance = server

    return server
  }

  /**
   * Get the current server instance
   */
  getServer(): Server | null {
    return this.serverInstance
  }

  /**
   * Update routes without restarting the server
   */
  async reload(): Promise<void> {
    if (!this.serverInstance) {
      throw new Error('Server not started. Call serve() first.')
    }

    // Rebuild routes
    const routes = this.buildBunServeRoutes()

    // Update server routes
    this.serverInstance.reload({
      routes,
      fetch: req => this.handleRequest(req),
      error: this.errorHandler ? error => this.errorHandler!(error) : undefined,
    })
  }
}

export const route: Router = new Router()
export default route
