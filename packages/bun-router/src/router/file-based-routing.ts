import type { ActionHandler, EnhancedRequest, QueryPreservationConfig } from '../types'
import type { Router } from './router'
import { join, relative, resolve, basename, dirname } from 'node:path'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { injectQueryPreservationScript } from '../utils/query-preservation'

/**
 * File-based routing configuration
 */
export interface FileBasedRoutingConfig {
  /**
   * Whether automatic file-based routing is enabled
   * Default: true (auto-enabled when views directory is detected)
   */
  enabled?: boolean

  /**
   * Directory containing view files for automatic routing
   * Default: auto-detected from 'src/views', 'views', 'resources/views'
   */
  viewsPath?: string

  /**
   * File extensions to treat as routable pages
   * Default: ['.stx', '.html']
   */
  extensions?: string[]

  /**
   * Files/directories to exclude from routing
   * Default: ['_', 'components', 'layouts', 'partials', 'scripts', 'styles']
   */
  exclude?: string[]

  /**
   * Directory containing component files for STX rendering
   * Default: join(viewsPath, 'components')
   */
  componentsDir?: string

  /**
   * Directory containing layout files for STX rendering
   * Default: join(viewsPath, 'layouts')
   */
  layoutsDir?: string

  /**
   * Directory containing partial files for STX rendering
   * Default: join(viewsPath, 'partials')
   */
  partialsDir?: string

  /**
   * Custom render function for view files
   * If not provided, attempts to use STX renderer or serves raw content
   */
  render?: (filePath: string, data: Record<string, unknown>, request: EnhancedRequest) => Promise<Response>
}

interface DiscoveredRoute {
  filePath: string
  routePath: string
  params: string[]
  isIndex: boolean
  isDynamic: boolean
}

/**
 * Default directories to scan for views (in order of priority)
 */
const DEFAULT_VIEW_DIRECTORIES: string[] = [
  'src/views',
  'views',
  'resources/views',
  'app/views',
]

/**
 * Default exclusion patterns for non-routable files/directories
 */
const DEFAULT_EXCLUDES: string[] = [
  '_',           // Underscore-prefixed files are private
  'components',  // Component partials
  'layouts',     // Layout templates
  'partials',    // Partial templates
  'scripts',     // Script files
  'styles',      // Style files
]

/**
 * Default routable file extensions
 */
const DEFAULT_EXTENSIONS: string[] = ['.stx', '.html']

/**
 * Auto-detect the views directory from common conventions
 */
function detectViewsDirectory(cwd: string = process.cwd()): string | null {
  for (const dir of DEFAULT_VIEW_DIRECTORIES) {
    const fullPath = resolve(cwd, dir)
    if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
      return fullPath
    }
  }
  return null
}

/**
 * Check if a directory contains any routable files
 */
function hasRoutableFiles(dir: string, extensions: string[], exclude: string[]): boolean {
  if (!existsSync(dir)) return false

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (exclude.some(pattern => entry.name.startsWith(pattern) || entry.name === pattern)) {
        continue
      }

      if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        return true
      }

      if (entry.isDirectory()) {
        const subDir = join(dir, entry.name)
        if (hasRoutableFiles(subDir, extensions, exclude)) {
          return true
        }
      }
    }
  }
catch {
    // Directory not readable
  }

  return false
}

/**
 * Converts a file path to a route path
 * Examples:
 *   views/index.stx -> /
 *   views/about.stx -> /about
 *   views/dashboard/index.stx -> /dashboard
 *   views/dashboard/errors.stx -> /dashboard/errors
 *   views/users/[id].stx -> /users/{id}
 *   views/posts/[...slug].stx -> /posts/{slug}*
 */
function filePathToRoutePath(filePath: string, viewsDir: string, extensions: string[]): { routePath: string; params: string[] } {
  // Get relative path from views directory
  let routePath = relative(viewsDir, filePath)

  // Remove file extension
  for (const ext of extensions) {
    if (routePath.endsWith(ext)) {
      routePath = routePath.slice(0, -ext.length)
      break
    }
  }

  // Convert directory separators to forward slashes
  routePath = routePath.replace(/\\/g, '/')

  // Handle index files
  if (routePath === 'index' || routePath.endsWith('/index')) {
    routePath = routePath.replace(/\/?index$/, '')
  }

  // Extract dynamic parameters
  const params: string[] = []

  // Convert [...param] to {param}* (catch-all) syntax
  routePath = routePath.replace(/\[\.\.\.([^\]]+)\]/g, (_match, param) => {
    params.push(param)
    return `{${param}}*`
  })

  // Convert [param] to {param} syntax
  routePath = routePath.replace(/\[([^\]]+)\]/g, (_match, param) => {
    params.push(param)
    return `{${param}}`
  })

  // Ensure leading slash
  if (!routePath.startsWith('/')) {
    routePath = `/${routePath}`
  }

  // Handle root path
  if (routePath === '/') {
    return { routePath: '/', params }
  }

  return { routePath, params }
}

/**
 * Recursively discovers all routable files in a directory
 */
function discoverRoutes(
  dir: string,
  viewsDir: string,
  extensions: string[],
  exclude: string[],
): DiscoveredRoute[] {
  const routes: DiscoveredRoute[] = []

  if (!existsSync(dir)) {
    return routes
  }

  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    // Skip excluded files/directories
    if (exclude.some(pattern => entry.name.startsWith(pattern) || entry.name === pattern)) {
      continue
    }

    if (entry.isDirectory()) {
      // Recursively discover routes in subdirectories
      routes.push(...discoverRoutes(fullPath, viewsDir, extensions, exclude))
    }
else if (entry.isFile()) {
      // Check if file has a routable extension
      const hasRoutableExtension = extensions.some(ext => entry.name.endsWith(ext))

      if (hasRoutableExtension) {
        const { routePath, params } = filePathToRoutePath(fullPath, viewsDir, extensions)

        routes.push({
          filePath: fullPath,
          routePath,
          params,
          isIndex: entry.name.startsWith('index.'),
          isDynamic: params.length > 0,
        })
      }
    }
  }

  // Sort routes: static routes before dynamic, more specific before less specific
  routes.sort((a, b) => {
    // Static routes come first
    if (a.isDynamic !== b.isDynamic) {
      return a.isDynamic ? 1 : -1
    }

    // More segments = more specific
    const aSegments = a.routePath.split('/').length
    const bSegments = b.routePath.split('/').length
    if (aSegments !== bSegments) {
      return bSegments - aSegments
    }

    // Alphabetical for consistency
    return a.routePath.localeCompare(b.routePath)
  })

  // Check for duplicate routes and warn
  const seen = new Map<string, DiscoveredRoute>()
  for (const route of routes) {
    const existing = seen.get(route.routePath)
    if (existing) {
      console.warn(
        `[bun-router] Warning: Duplicate route "${route.routePath}" found:\n` +
        `  - ${existing.filePath}\n` +
        `  - ${route.filePath}\n` +
        `  Using: ${existing.filePath}`
      )
    }
else {
      seen.set(route.routePath, route)
    }
  }

  return Array.from(seen.values())
}

/**
 * Check for pre-built HTML version of a view file
 * Looks in dist/views/ for production builds
 */
function findPrebuiltView(stxFilePath: string, viewsDir: string): string | null {
  // Get relative path from views directory
  const relativePath = relative(viewsDir, stxFilePath)

  // Check common pre-built locations
  const prebuiltLocations = [
    resolve(process.cwd(), 'dist/views', relativePath.replace(/\.stx$/, '.html')),
    resolve(process.cwd(), 'views', relativePath.replace(/\.stx$/, '.html')),
    resolve('/var/task/views', relativePath.replace(/\.stx$/, '.html')), // Lambda
  ]

  for (const location of prebuiltLocations) {
    if (existsSync(location)) {
      return location
    }
  }

  return null
}

/**
 * What a rendered page asked the response to be.
 *
 * A page cannot decide its own status until it has looked something up - a
 * repository, an order, a user - so a status declared in the file is no use to
 * a dynamic route. stx gives a server script `setResponseStatus`, `notFound`
 * and `setResponseHeader` for exactly this, and records what they asked for on
 * the render context; this is that answer, carried back to the handler which
 * builds the Response.
 */
interface RenderedView {
  html: string
  status: number
  headers: Record<string, string>
}

/** A `Cookie` header, parsed into the record a server script reads. */
function parseCookies(header: string): Record<string, string> {
  const jar: Record<string, string> = {}

  for (const part of String(header ?? '').split(';')) {
    const cut = part.indexOf('=')
    if (cut < 0)
      continue

    try {
      jar[part.slice(0, cut).trim()] = decodeURIComponent(part.slice(cut + 1).trim())
    }
    catch {
      // A malformed escape in one cookie is not a reason to drop the others.
    }
  }

  return jar
}

/**
 * Render an STX file using the @stacksjs/stx library
 */
// `filePath` is used five times below, and pickier's no-unused-vars says it is
// not: its scanner finds the function body by counting braces over the source
// text, and the prose comments inside this function move where it thinks the
// body ends. Removing a single apostrophe from any one of them makes the
// report go away, which is the tell that it is the scanner and not the code.
// Reported rather than worked around by renaming - a parameter called
// `_filePath` used five times would be a lie that outlives the bug.
// eslint-disable-next-line pickier/no-unused-vars
async function renderStxFile(
  filePath: string,
  viewsDir: string,
  data: Record<string, unknown>,
  routingConfig?: FileBasedRoutingConfig,
  request?: Request,
): Promise<RenderedView> {
  // Dynamic import to avoid build-time resolution
  const stxModule = '@stacksjs/stx'
  const stx = await import(/* @vite-ignore */ stxModule)

  if (!stx.processDirectives || !stx.extractVariables) {
    throw new Error('STX library not properly loaded. Install with: bun add @stacksjs/stx')
  }

  const content = await Bun.file(filePath).text()

  // Extract script content and template
  const scriptMatch = content.match(/<script\s+server\s*>([\s\S]*?)<\/script>/i)
  const scriptContent = scriptMatch ? scriptMatch[1] : ''
  let templateContent = scriptMatch
    ? content.replace(/<script\s+server\s*>[\s\S]*?<\/script>/i, '')
    : content

  // Replace <script client> with regular <script>
  templateContent = templateContent.replace(/<script\s+client\s*>/gi, '<script>')

  const asked: { status: number, headers: Record<string, string> } = { status: 200, headers: {} }

  const headerBag = (data.headers ?? {}) as Record<string, string>
  const cookieHeader = String(headerBag.cookie ?? headerBag.Cookie ?? '')
  const requestUrl = String(data.url ?? '')
  const search = requestUrl.includes('?') ? requestUrl.slice(requestUrl.indexOf('?')) : ''

  /*
   * The server context, the same shape stx's own `serve()` provides.
   *
   * Without it a `<script server>` that reads `__stxServeContext` throws a
   * ReferenceError inside its own IIFE - and that takes every other binding in
   * the file down with it, so the page renders its empty branch and reads as a
   * correct answer rather than as a failure. The most common thing a page reads
   * from it is the reader's cookies, which is to say the reader: every signed-in
   * visitor was rendered as a stranger on this path, so a private page looked
   * missing to the person who owns it and every permission-gated control was
   * simply absent.
   */
  const serveContext = {
    url: requestUrl,
    path: String(data.path ?? ''),
    search,
    host: String(headerBag.host ?? ''),
    cookieHeader,
    cookies: parseCookies(cookieHeader),
    ip: '',
    locale: null,
    params: (data.params ?? {}) as Record<string, string>,
    method: String(data.method ?? 'GET'),
    request,
  }

  // Build context with data
  const context: Record<string, unknown> = {
    __filename: filePath,
    __dirname: dirname(filePath),
    props: data,
    ...data,
    __stxServeContext: serveContext,

    /*
     * What a page uses to say what it found.
     *
     * Range-checked rather than trusted, and ignored when it is out of range: a
     * status is not worth failing a page over, and a typo that became a 500
     * from the host reading it back would be worse than the 200 this replaces.
     */
    setResponseStatus: (status: number) => {
      if (Number.isInteger(status) && status >= 100 && status <= 599)
        asked.status = status
    },
    notFound: (status: number = 404) => {
      asked.status = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 404
    },
    setResponseHeader: (name: string, value: string) => {
      if (name)
        asked.headers[String(name)] = String(value)
    },
    // Declared so a page that calls it does not take its own bindings down.
    // The static metadata it carries belongs to a build step this path has not
    // got, so doing nothing is the honest answer.
    definePageMeta: () => {},
  }

  // Extract variables from server script
  if (scriptContent) {
    await stx.extractVariables(scriptContent, context, filePath)
  }

  // Resolve componentsDir: user config > viewsDir/components fallback
  const resolvedComponentsDir = routingConfig?.componentsDir
    ? resolve(routingConfig.componentsDir)
    : join(viewsDir, 'components')

  const resolvedLayoutsDir = routingConfig?.layoutsDir
    ? resolve(routingConfig.layoutsDir)
    : join(viewsDir, 'layouts')

  const resolvedPartialsDir = routingConfig?.partialsDir
    ? resolve(routingConfig.partialsDir)
    : join(viewsDir, 'partials')

  // Configure STX with proper paths
  const config = {
    ...stx.defaultConfig,
    componentsDir: resolvedComponentsDir,
    layoutsDir: resolvedLayoutsDir,
    partialsDir: resolvedPartialsDir,
  }

  const html = await stx.processDirectives(templateContent, context, filePath, config, new Set())

  /*
   * Read from the context as well as from the closure. stx's own
   * `renderTemplate` records the same intent under these keys, so a page that
   * reaches the defaults there rather than the ones above is still honoured.
   */
  const recordedStatus = Number((context as Record<string, unknown>).__stxResponseStatus)
  const recordedHeaders = (context as Record<string, unknown>).__stxResponseHeaders as Record<string, string> | undefined

  return {
    html,
    status: Number.isInteger(recordedStatus) && recordedStatus >= 100 && recordedStatus <= 599
      ? recordedStatus
      : asked.status,
    headers: { ...asked.headers, ...(recordedHeaders ?? {}) },
  }
}

/**
 * Creates a handler for rendering a view file
 */
function createViewHandler(
  filePath: string,
  viewsDir: string,
  config: FileBasedRoutingConfig,
  queryPreservationConfig?: QueryPreservationConfig,
): ActionHandler {
  return async (req: EnhancedRequest): Promise<Response> => {
    const url = new URL(req.url)

    // Build request data for template context
    const data = {
      params: req.params || {},
      query: Object.fromEntries(url.searchParams),
      url: req.url,
      path: url.pathname,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    }

    /**
     * Apply query preservation script to HTML if configured
     */
    function applyQueryPreservation(html: string): string {
      if (queryPreservationConfig?.enabled !== false && queryPreservationConfig?.preserve?.length) {
        return injectQueryPreservationScript(html, queryPreservationConfig)
      }
      return html
    }

    try {
      // 1. Check for pre-built HTML (production optimization)
      const prebuiltPath = findPrebuiltView(filePath, viewsDir)
      if (prebuiltPath) {
        let html = await Bun.file(prebuiltPath).text()
        html = applyQueryPreservation(html)
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }

      // 2. Render STX file
      if (filePath.endsWith('.stx')) {
        const rendered = await renderStxFile(filePath, viewsDir, data, config, req as unknown as Request)
        const html = applyQueryPreservation(rendered.html)

        return new Response(html, {
          // What the page asked for while rendering, not a fixed 200. A page
          // whose record does not exist renders its not-found branch, and
          // answering 200 tells a crawler and a cache that a URL naming nothing
          // is a real page.
          status: rendered.status,
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...rendered.headers },
        })
      }

      // 3. Serve raw HTML
      let content = await Bun.file(filePath).text()
      content = applyQueryPreservation(content)
      return new Response(content, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
catch (error) {
      console.error(`[bun-router] Error rendering ${filePath}:`, error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

/**
 * Registers file-based routing extension on the Router class
 */
export function registerFileBasedRouting(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Internal: detected views directory
     */
    _viewsDir: {
      value: null as string | null,
      writable: true,
      configurable: true,
    },

    /**
     * Internal: file-based routing config
     */
    _fileRoutingConfig: {
      value: null as FileBasedRoutingConfig | null,
      writable: true,
      configurable: true,
    },

    /**
     * Internal: discovered file-based routes
     */
    _fileBasedRoutes: {
      value: [] as DiscoveredRoute[],
      writable: true,
      configurable: true,
    },

    /**
     * Internal: whether file routes have been initialized
     */
    _fileRoutesInitialized: {
      value: false,
      writable: true,
      configurable: true,
    },

    /**
     * Initialize automatic file-based routing
     * Called automatically when serve() is invoked
     */
    _initFileRoutes: {
      async value(): Promise<void> {
        if (this._fileRoutesInitialized) return

        // Ensure each Router instance gets its OWN routes array. The
        // `_fileBasedRoutes: { value: [] }` declaration on the prototype
        // means every instance shares a single array reference until
        // someone reassigns. Without this lazy-init, calls like
        // `instanceA.getFileRoutes()` leak routes registered by
        // `instanceB._initFileRoutes()` — cross-instance contamination.
        if (!Object.prototype.hasOwnProperty.call(this, '_fileBasedRoutes')) {
          this._fileBasedRoutes = []
        }

        // Auto-detect views directory if not configured
        const viewsDir = this._viewsDir || detectViewsDirectory()
        if (!viewsDir) {
          this._fileRoutesInitialized = true
          return
        }

        const config = this._fileRoutingConfig || {}

        // Honour the opt-out flag set by `router.disableFileRouting()` and by
        // anyone passing `{ enabled: false }` to `router.views(...)`. Before
        // this check the flag was stored but never read, so the public
        // `disableFileRouting()` API silently did nothing.
        if (config.enabled === false) {
          this._fileRoutesInitialized = true
          return
        }

        const extensions = config.extensions || DEFAULT_EXTENSIONS
        const exclude = config.exclude || DEFAULT_EXCLUDES

        // Check if there are any routable files
        if (!hasRoutableFiles(viewsDir, extensions, exclude)) {
          this._fileRoutesInitialized = true
          return
        }

        // Discover and register routes
        const routes = discoverRoutes(viewsDir, viewsDir, extensions, exclude)

        if (this.config.verbose) {
          console.log(`[bun-router] Auto-discovered ${routes.length} file-based routes from ${viewsDir}:`)
          for (const route of routes) {
            console.log(`  ${route.routePath} -> ${relative(viewsDir, route.filePath)}`)
          }
        }

        // Store viewsDir for use in handlers
        this._viewsDir = viewsDir

        // Register each discovered route. The existing GET paths are
        // collected once — the previous per-route `.find()` scan made
        // startup O(routes²) for large route tables.
        const existingGetPaths = new Set<string>()
        for (const r of this.routes as Array<{ path: string, method: string }>) {
          if (r.method === 'GET') {
            existingGetPaths.add(r.path)
          }
        }

        for (const route of routes) {
          // Only register if no explicit route exists for this path
          if (existingGetPaths.has(route.routePath)) {
            continue
          }

          const handler = createViewHandler(route.filePath, viewsDir, config, this.config.queryPreservation)
          this.get(route.routePath, handler, 'web')
          this._fileBasedRoutes.push(route)
          existingGetPaths.add(route.routePath)
        }

        this._fileRoutesInitialized = true
      },
      writable: true,
      configurable: true,
    },

    /**
     * Configure file-based routing
     * Call this before serve() to customize behavior
     */
    views: {
      value(config: FileBasedRoutingConfig | string): Router {
        if (typeof config === 'string') {
          // Just a path
          this._viewsDir = resolve(config)
          this._fileRoutingConfig = {}
        }
else {
          // Full config
          if (config.viewsPath) {
            this._viewsDir = resolve(config.viewsPath)
          }
          this._fileRoutingConfig = config
        }
        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Explicitly disable file-based routing
     */
    disableFileRouting: {
      value(): Router {
        this._fileRoutingConfig = { enabled: false }
        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Get list of discovered file-based routes
     */
    getFileRoutes: {
      value(): DiscoveredRoute[] {
        return this._fileBasedRoutes || []
      },
      writable: true,
      configurable: true,
    },

    /**
     * Legacy method for manual file routes loading
     * Kept for backwards compatibility
     */
    fileRoutes: {
      async value(viewsPath?: string, options?: Omit<FileBasedRoutingConfig, 'viewsPath'>): Promise<Router> {
        if (viewsPath) {
          this._viewsDir = resolve(viewsPath)
        }
        if (options) {
          this._fileRoutingConfig = { ...this._fileRoutingConfig, ...options }
        }
        // Force re-initialization
        this._fileRoutesInitialized = false
        await this._initFileRoutes()
        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Legacy method alias
     */
    loadFileRoutes: {
      async value(config: FileBasedRoutingConfig = {}): Promise<Router> {
        return this.fileRoutes(config.viewsPath, config)
      },
      writable: true,
      configurable: true,
    },
  })
}

// Type augmentation for Router
declare module './router' {
  interface Router {
    _viewsDir?: string | null
    _fileRoutingConfig?: FileBasedRoutingConfig | null
    _fileBasedRoutes?: DiscoveredRoute[]
    _fileRoutesInitialized?: boolean

    /**
     * Internal: Initialize file-based routing (called by serve())
     */
    _initFileRoutes(): Promise<void>

    /**
     * Configure file-based routing
     * @param config - Path to views directory or full configuration object
     * @example
     * router.views('src/views')
     * router.views({ viewsPath: 'src/views', extensions: ['.stx'] })
     */
    views(config: FileBasedRoutingConfig | string): Router

    /**
     * Disable automatic file-based routing
     */
    disableFileRouting(): Router

    /**
     * Get the list of discovered file-based routes
     */
    getFileRoutes(): DiscoveredRoute[]

    /**
     * Manually trigger file-based route discovery
     * @param viewsPath - Optional path to views directory
     * @param options - Additional configuration options
     */
    fileRoutes(viewsPath?: string, options?: Omit<FileBasedRoutingConfig, 'viewsPath'>): Promise<Router>

    /**
     * Legacy: Load file-based routes with configuration
     */
    loadFileRoutes(config?: FileBasedRoutingConfig): Promise<Router>
  }
}

export type { DiscoveredRoute }
export { detectViewsDirectory, discoverRoutes, DEFAULT_VIEW_DIRECTORIES, DEFAULT_EXCLUDES, DEFAULT_EXTENSIONS }
