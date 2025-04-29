import type { Server } from 'bun'
import type { ActionHandler, ActionHandlerClass, EnhancedRequest, MiddlewareHandler, Route, RouteDefinition, RouteGroup, RouteHandler, RouterConfig, ServerOptions, WebSocketConfig } from './types'
import { join } from 'node:path'
import process from 'node:process'
import { isActionClass, isRouteHandler, matchPath, normalizePath, processHtmlTemplate, resolveViewPath, toActionPath } from './utils'

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
  private errorHandler: ((error: Error) => Response | Promise<Response>) | null = null
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

    // If we already have a group, merge the attributes
    if (previousGroup) {
      this.currentGroup = {
        // Combine prefixes if both exist
        prefix: options.prefix
          ? (previousGroup.prefix ? previousGroup.prefix + options.prefix : options.prefix)
          : previousGroup.prefix,

        // Combine middleware if both exist
        middleware: [
          ...(previousGroup.middleware || []),
          ...(options.middleware || [])
        ]
      }
    } else {
      this.currentGroup = options
    }

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
    // Add a health check route at /health that returns 200 OK
    // Use an API route by default
    await this.get('/health', () => {
      return new Response('OK', { status: 200 })
    }, 'api')

    return this
  }

  /**
   * Register a fallback handler for 404 routes
   * @param handler The handler to use for unmatched routes
   */
  fallback(handler: ActionHandler): Router {
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
      // Object with method handlers
      if (handler.index) {
        await this.get(resourcePath(), handler.index, type)
      }
      if (handler.show) {
        await this.get(resourcePath('/{id}'), handler.show, type)
      }
      if (handler.store) {
        await this.post(resourcePath(), handler.store, type)
      }
      if (handler.update) {
        await this.put(resourcePath('/{id}'), handler.update, type)
      }
      if (handler.destroy) {
        await this.delete(resourcePath('/{id}'), handler.destroy, type)
      }
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
    for (const middlewareItem of middleware) {
      const resolved = await this.resolveMiddleware(middlewareItem)
      if (resolved) {
        this.globalMiddleware.push(resolved)
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

  /**
   * Run a chain of middleware handlers
   * @param req The enhanced request object
   * @param middlewareStack Array of middleware handlers to execute
   * @returns Response from middleware or null to continue to route handler
   */
  private async runMiddleware(req: EnhancedRequest, middlewareStack: MiddlewareHandler[]): Promise<Response | null> {
    if (!middlewareStack.length) {
      return null
    }

    // We'll use a special symbol to track the middleware chain completion internally
    let middlewareComplete = false

    // Create a chain of middleware functions where each calls the next
    const executeMiddleware = async (index: number): Promise<Response> => {
      // If we've run through all middleware, signal to continue to route handler
      if (index >= middlewareStack.length) {
        middlewareComplete = true
        // Return a valid "empty" response - this will be checked later and never sent to the client
        return new Response('', { status: 200 })
      }

      const currentMiddleware = middlewareStack[index]

      // Define the next function for this middleware
      const next = async (): Promise<Response> => {
        return await executeMiddleware(index + 1)
      }

      // Execute the current middleware with the next function
      return await currentMiddleware(req, next)
    }

    try {
      // Start executing the middleware chain
      const response = await executeMiddleware(0)

      // If we completed the middleware chain without a short-circuit,
      // continue to the route handler
      if (middlewareComplete) {
        return null
      }

      // Otherwise return the middleware response (short-circuit)
      return response
    }
    catch (error) {
      // Re-throw any errors to be handled by the error handler
      throw error
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
   * Renders a view with the provided data
   * @param view The name of the view file to render
   * @param data Data to pass to the view template
   * @param options Rendering options like layout
   */
  async renderView(
    view: string,
    data: Record<string, any> = {},
    options: { layout?: string } = {},
  ): Promise<string> {
    const viewConfig = this.config.views
    if (!viewConfig) {
      throw new Error('Views configuration is missing. Set it in router config.')
    }

    // Resolve view path
    const viewsPath = viewConfig.viewsPath
    const extensions = viewConfig.extensions || ['.html']
    const viewPath = await resolveViewPath(view, viewsPath, extensions)

    if (!viewPath) {
      throw new Error(`View "${view}" not found in ${viewsPath}`)
    }

    // Read view content
    const viewContent = await Bun.file(viewPath).text()

    // Process the view template with provided data
    const renderedView = await this.processTemplate(viewContent, data, viewConfig)

    // Check if we should use a layout
    const layoutName = options.layout || viewConfig.defaultLayout

    if (layoutName) {
      // Resolve layout path
      const layoutsPath = join(viewsPath, 'layouts')
      const layoutPath = await resolveViewPath(layoutName, layoutsPath, extensions)

      if (!layoutPath) {
        throw new Error(`Layout "${layoutName}" not found in ${layoutsPath}`)
      }

      // Read layout content
      const layoutContent = await Bun.file(layoutPath).text()

      // Create data with the rendered view as the content
      const layoutData = {
        ...data,
        content: renderedView,
      }

      // Process the layout with the view content
      return await this.processTemplate(layoutContent, layoutData, viewConfig)
    }

    return renderedView
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
    for (const route of this.routes) {
      if (route.method !== method && route.method !== 'ANY') {
        continue
      }

      // Handle domain matching if the route has a domain constraint
      if (route.domain) {
        const url = new URL(path)
        if (!this.matchDomain(route.domain, url.hostname)) {
          continue
        }
      }

      const params: Record<string, string> = {}
      const isMatch = matchPath(route.path, path, params)

      if (isMatch) {
        // Apply constraints if any
        if (route.constraints && Object.keys(route.constraints).length > 0) {
          let constraintsMet = true
          for (const [param, pattern] of Object.entries(route.constraints)) {
            if (params[param] && !new RegExp(`^${pattern}$`).test(params[param])) {
              constraintsMet = false
              break
            }
          }
          if (!constraintsMet) {
            continue
          }
        }

        return { ...route, params }
      }
    }

    return null
  }

  private extractParams(routePath: string, requestPath: string): Record<string, string> {
    const params: Record<string, string> = {}
    matchPath(routePath, requestPath, params)
    return params
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
    try {
      const url = new URL(req.url)
      const path = normalizePath(url.pathname)
      const method = req.method

      // Find a matching route
      let route = this.matchRoute(path, method)

      // If no route found and this is a HEAD request, try to find a GET route
      if (!route && method === 'HEAD') {
        route = this.matchRoute(path, 'GET')
      }

      // If still no route, check for OPTIONS request to support CORS
      if (!route && method === 'OPTIONS') {
        // Create a default OPTIONS response with CORS headers
        const headers = new Headers({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Length': '0',
        })
        return new Response(null, { status: 204, headers })
      }

      // If no route found, try the fallback handler or return 404
      if (!route) {
        if (this.fallbackHandler) {
          const enhancedReq = this.enhanceRequest(req, {})
          return await this.resolveHandler(this.fallbackHandler, enhancedReq)
        }
        return new Response('Not Found', { status: 404 })
      }

      // Create enhanced request with route parameters
      const params = route.params ?? {}
      const enhancedReq = this.enhanceRequest(req, params)

      // Apply global middleware first
      if (this.globalMiddleware.length > 0) {
        try {
          const middlewareResponse = await this.runMiddleware(enhancedReq, this.globalMiddleware)
          if (middlewareResponse) {
            // Middleware provided a response, so return it
            return this.applyModifiedCookies(middlewareResponse, enhancedReq)
          }
        }
        catch (error) {
          console.error('Error in global middleware:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      }

      // Apply route-specific middleware next
      if (route.middleware && route.middleware.length > 0) {
        try {
          const middlewareResponse = await this.runMiddleware(enhancedReq, route.middleware)
          if (middlewareResponse) {
            // Middleware provided a response, so return it
            return this.applyModifiedCookies(middlewareResponse, enhancedReq)
          }
        }
        catch (error) {
          console.error('Error in route middleware:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      }

      // Handle the request with the route handler
      try {
        const response = await this.resolveHandler(route.handler, enhancedReq)
        return this.applyModifiedCookies(response, enhancedReq)
      }
      catch (error) {
        console.error('Error handling request:', error)

        // Use custom error handler if available
        if (this.errorHandler) {
          try {
            return await this.errorHandler(error as Error)
          }
          catch (handlerError) {
            console.error('Error in error handler:', handlerError)
          }
        }

        return new Response('Internal Server Error', { status: 500 })
      }
    }
    catch (error) {
      console.error('Unhandled error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  /**
   * Enhance a regular request with additional properties like params and cookies
   */
  private enhanceRequest(req: Request, params: Record<string, string> = {}): EnhancedRequest {
    const enhancedReq = req as EnhancedRequest
    enhancedReq.params = params || {}

    // Parse cookies from request headers
    const cookieHeader = req.headers.get('Cookie')
    const cookies: Record<string, string> = {}

    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie) => {
        const [name, value] = cookie.trim().split('=')
        if (name && value) {
          cookies[name] = value
        }
      })
    }

    // Store cookies and cookie manipulation methods on the request
    const cookiesToSet: { name: string, value: string, options: any }[] = []
    const cookiesToDelete: { name: string, options: any }[] = []

    enhancedReq.cookies = {
      get: (name: string) => cookies[name],

      set: (name: string, value: string, options: any = {}) => {
        cookiesToSet.push({ name, value, options })
      },

      delete: (name: string, options: any = {}) => {
        // To delete a cookie, we set its Max-Age to 0
        cookiesToDelete.push({
          name,
          options: {
            ...options,
            maxAge: 0,
            // Ensure the path is maintained when deleting
            path: options.path || '/'
          }
        })
      },

      getAll: () => ({ ...cookies })
    }

    // Store the cookies for use when generating the response
    enhancedReq._cookiesToSet = cookiesToSet
    enhancedReq._cookiesToDelete = cookiesToDelete

    return enhancedReq
  }

  /**
   * Apply modified cookies to the response
   */
  private applyModifiedCookies(response: Response, req: EnhancedRequest): Response {
    // If no cookies were modified, return the original response
    if (!req._cookiesToSet?.length && !req._cookiesToDelete?.length) {
      return response
    }

    // Create a new response with the same status, body and headers
    const headers = new Headers(response.headers)

    // Add cookies to be set
    if (req._cookiesToSet && req._cookiesToSet.length > 0) {
      for (const { name, value, options } of req._cookiesToSet) {
        const serialized = this.serializeCookie(name, value, options)
        headers.append('Set-Cookie', serialized)
      }
    }

    // Add cookies to be deleted
    if (req._cookiesToDelete && req._cookiesToDelete.length > 0) {
      for (const { name, options } of req._cookiesToDelete) {
        // To delete a cookie, set an empty value and Max-Age=0
        const serialized = this.serializeCookie(name, '', options)
        headers.append('Set-Cookie', serialized)
      }
    }

    // Create a new response with the modified headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }

  /**
   * Serialize a cookie name, value and options to a cookie string
   */
  private serializeCookie(name: string, value: string, options: any = {}): string {
    const cookieParts = [`${name}=${value}`]

    if (options.expires) {
      const expires = options.expires instanceof Date
        ? options.expires.toUTCString()
        : new Date(options.expires).toUTCString()
      cookieParts.push(`Expires=${expires}`)
    }

    if (options.maxAge !== undefined && options.maxAge !== null) {
      cookieParts.push(`Max-Age=${options.maxAge}`)
    }

    if (options.domain) {
      cookieParts.push(`Domain=${options.domain}`)
    }

    if (options.path) {
      cookieParts.push(`Path=${options.path}`)
    }
    else {
      // Default path to root
      cookieParts.push('Path=/')
    }

    if (options.secure) {
      cookieParts.push('Secure')
    }

    if (options.httpOnly) {
      cookieParts.push('HttpOnly')
    }

    if (options.sameSite) {
      if (['Strict', 'Lax', 'None'].includes(options.sameSite)) {
        cookieParts.push(`SameSite=${options.sameSite}`)
      }
      else {
        cookieParts.push(`SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`)
      }
    }

    return cookieParts.join('; ')
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
   * Register a global error handler
   * @param handler The error handler function
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

  /**
   * Extend the router with custom methods
   * @param methods An object containing method names and implementations
   * @returns The router instance for chaining
   * @example
   * ```typescript
   * router.extend({
   *   apiResource(name, controller) {
   *     // Custom implementation for RESTful API resources
   *     this.get(`/${name}`, `${controller}/index`, 'api')
   *     this.post(`/${name}`, `${controller}/store`, 'api')
   *     this.get(`/${name}/{id}`, `${controller}/show`, 'api')
   *     this.put(`/${name}/{id}`, `${controller}/update`, 'api')
   *     this.delete(`/${name}/{id}`, `${controller}/destroy`, 'api')
   *     return this
   *   },
   *   // Add more methods as needed
   * })
   *
   * // Then use the custom method
   * router.apiResource('users', 'UsersController')
   * ```
   */
  extend(methods: Record<string, (...args: any[]) => any>): Router {
    for (const [methodName, implementation] of Object.entries(methods)) {
      if (methodName in this) {
        console.warn(`Method '${methodName}' already exists on Router. It will be overwritten.`)
      }

      // Bind the implementation to this router instance and add it as a method
      (this as any)[methodName] = implementation.bind(this)
    }

    return this
  }
}
