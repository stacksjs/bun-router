import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import type { Router } from './router'

/**
 * Auto-discover API route files from routes/ directory.
 *
 * Convention:
 *   routes/api.ts     → prefix /api   (inferred from filename)
 *   routes/webhook.ts → prefix /webhook
 *   routes/index.ts   → no prefix (root routes)
 *   routes/v2/api.ts  → prefix /v2/api
 *
 * Each route file should export a default function that receives the router:
 *
 *   export default function(router: Router) {
 *     router.get('/users', handler)
 *     router.post('/users', handler)
 *   }
 *
 * Or export named route definitions:
 *
 *   export const routes = [
 *     { method: 'GET', path: '/users', handler },
 *     { method: 'POST', path: '/users', handler },
 *   ]
 */

const ROUTE_EXTENSIONS = ['.ts', '.js']
const ROUTES_DIRS = ['routes', 'src/routes']

/**
 * Files that get no prefix (Laravel convention).
 * routes/web.ts  → /about, /contact (root)
 * routes/api.ts  → /api/users, /api/posts
 */
const ROOT_ROUTE_FILES = ['web', 'index']

interface RouteFileConfig {
  /** Base directory to scan for route files */
  routesDir?: string
  /** Whether to log discovered routes */
  verbose?: boolean
}

/**
 * Detect the routes directory
 */
function detectRoutesDirectory(): string | null {
  const cwd = process.cwd()
  for (const dir of ROUTES_DIRS) {
    const fullPath = resolve(cwd, dir)
    if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
      return fullPath
    }
  }
  return null
}

/**
 * Discover route files recursively from a directory.
 * Returns array of { filePath, prefix } where prefix is inferred from the path.
 */
function discoverRouteFiles(dir: string, baseDir: string): Array<{ filePath: string, prefix: string }> {
  const results: Array<{ filePath: string, prefix: string }> = []

  if (!existsSync(dir)) return results

  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    // Skip hidden files, underscored files
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      results.push(...discoverRouteFiles(fullPath, baseDir))
    }
    else if (ROUTE_EXTENSIONS.includes(extname(entry.name))) {
      // Compute prefix from file path relative to base dir
      const relDir = dir === baseDir ? '' : dir.slice(baseDir.length)
      const name = basename(entry.name, extname(entry.name))

      // web.ts, index.ts → no filename prefix (root routes, Laravel convention)
      // api.ts → /api
      // admin.ts → /admin
      const prefix = ROOT_ROUTE_FILES.includes(name)
        ? relDir || ''
        : `${relDir}/${name}`

      results.push({ filePath: fullPath, prefix })
    }
  }

  return results
}

/**
 * Load a route file and register its routes with the given prefix.
 */
async function loadRouteFile(router: Router, filePath: string, prefix: string, verbose: boolean): Promise<number> {
  try {
    const mod = await import(filePath)
    let count = 0
    const routesBefore = (router as any).routes?.length || 0

    // Pattern 1: default export is a function → call it with a prefixed router proxy
    if (typeof mod.default === 'function') {
      // Create a proxy that prepends the prefix to all route registrations
      const prefixedRouter = createPrefixedProxy(router, prefix)
      await mod.default(prefixedRouter)
      count = ((router as any).routes?.length || 0) - routesBefore
    }
    // Pattern 2: named 'routes' export is an array of { method, path, handler }
    else if (Array.isArray(mod.routes)) {
      for (const route of mod.routes) {
        const method = (route.method || 'GET').toLowerCase()
        const path = `${prefix}${route.path}`
        if (typeof (router as any)[method] === 'function') {
          await (router as any)[method](path, route.handler)
          count++
        }
      }
    }

    if (verbose && count > 0) {
      console.log(`  ${prefix || '/'} → ${basename(filePath)} (${count} routes)`)
    }

    return count
  }
  catch (error) {
    console.error(`[bun-router] Failed to load route file ${filePath}:`, error)
    return 0
  }
}

/**
 * Create a proxy around the router that auto-prepends a prefix to all route paths.
 */
function createPrefixedProxy(router: Router, prefix: string): Router {
  if (!prefix) return router

  const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'any']

  return new Proxy(router, {
    get(target: any, prop: string) {
      if (methods.includes(prop)) {
        return async (path: string, ...args: any[]) => {
          return target[prop](`${prefix}${path}`, ...args)
        }
      }
      // group() with nested prefix
      if (prop === 'group') {
        return async (options: any, callback: any) => {
          const nestedPrefix = options.prefix ? `${prefix}${options.prefix}` : prefix
          return target.group({ ...options, prefix: nestedPrefix }, callback)
        }
      }
      return target[prop]
    },
  })
}

/**
 * Register the API route auto-discovery feature on the Router class.
 */
export function registerApiRoutes(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Internal: routes directory path
     */
    _routesDir: {
      value: null as string | null,
      writable: true,
      configurable: true,
    },

    /**
     * Internal: whether API routes have been initialized
     */
    _apiRoutesInitialized: {
      value: false,
      writable: true,
      configurable: true,
    },

    /**
     * Initialize automatic API route discovery.
     * Called automatically when serve() is invoked, alongside _initFileRoutes.
     */
    _initApiRoutes: {
      async value(): Promise<void> {
        if (this._apiRoutesInitialized) return

        const routesDir = this._routesDir || detectRoutesDirectory()
        if (!routesDir) {
          this._apiRoutesInitialized = true
          return
        }

        const verbose = this.config?.verbose || false
        const files = discoverRouteFiles(routesDir, routesDir)

        if (files.length === 0) {
          this._apiRoutesInitialized = true
          return
        }

        if (verbose) {
          console.log(`[bun-router] Auto-discovering API routes from ${routesDir}:`)
        }

        let totalRoutes = 0
        for (const { filePath, prefix } of files) {
          totalRoutes += await loadRouteFile(this, filePath, prefix, verbose)
        }

        if (totalRoutes > 0 && verbose) {
          console.log(`[bun-router] Registered ${totalRoutes} API routes`)
        }

        this._apiRoutesInitialized = true
      },
      writable: true,
      configurable: true,
    },

    /**
     * Configure the routes directory for API route auto-discovery.
     */
    routesFrom: {
      value(dir: string): Router {
        this._routesDir = resolve(dir)
        return this
      },
      writable: true,
      configurable: true,
    },
  })
}
