import type { MiddlewareHandler, MiddlewareReference } from '../types'

/**
 * Middleware Group Registry
 *
 * Allows defining named groups of middleware that can be applied to routes.
 * Similar to Laravel's middleware groups (web, api).
 *
 * @example
 * // Define groups
 * groups.define('web', ['session', 'csrf', 'cors'])
 * groups.define('api', ['throttle:60,1', 'cors'])
 *
 * // Use on routes
 * router.group({ middleware: 'web' }, () => { ... })
 */
export class MiddlewareGroupRegistry {
  private groups = new Map<string, (MiddlewareReference | MiddlewareHandler)[]>()
  private globalMiddleware: (MiddlewareReference | MiddlewareHandler)[] = []
  private middlewarePriority: Map<string, number> = new Map()

  /**
   * Define a middleware group
   */
  define(name: string, middleware: (MiddlewareReference | MiddlewareHandler)[]): this {
    this.groups.set(name, [...middleware])
    return this
  }

  /**
   * Extend an existing group with additional middleware
   */
  extend(name: string, middleware: (MiddlewareReference | MiddlewareHandler)[]): this {
    const existing = this.groups.get(name) || []
    this.groups.set(name, [...existing, ...middleware])
    return this
  }

  /**
   * Prepend middleware to an existing group
   */
  prepend(name: string, middleware: (MiddlewareReference | MiddlewareHandler)[]): this {
    const existing = this.groups.get(name) || []
    this.groups.set(name, [...middleware, ...existing])
    return this
  }

  /**
   * Get middleware for a group
   */
  get(name: string): (MiddlewareReference | MiddlewareHandler)[] {
    return this.groups.get(name) || []
  }

  /**
   * Check if a group exists
   */
  has(name: string): boolean {
    return this.groups.has(name)
  }

  /**
   * Remove a group
   */
  remove(name: string): this {
    this.groups.delete(name)
    return this
  }

  /**
   * Resolve a middleware reference, expanding group names into their middleware.
   *
   * A group name is a middleware reference as far as a caller is concerned -
   * you write `.middleware('web')` and get the group - so an application that
   * declares its aliases in `RouterTypeRegistry` lists its group names there
   * too.
   */
  resolve(middleware: MiddlewareReference | MiddlewareHandler): (MiddlewareReference | MiddlewareHandler)[] {
    if (typeof middleware === 'function') {
      return [middleware]
    }

    // Check if it's a group name
    if (this.groups.has(middleware)) {
      return this.get(middleware)
    }

    // It's an individual middleware reference
    return [middleware]
  }

  /**
   * Resolve multiple middleware references, expanding groups
   */
  resolveAll(middleware: (MiddlewareReference | MiddlewareHandler)[]): (MiddlewareReference | MiddlewareHandler)[] {
    const resolved: (MiddlewareReference | MiddlewareHandler)[] = []

    for (const mw of middleware) {
      resolved.push(...this.resolve(mw))
    }

    return resolved
  }

  // ─── Global Middleware Stack ────────────────────────────────────

  /**
   * Add middleware to the global stack (runs on every request)
   */
  pushGlobal(...middleware: (MiddlewareReference | MiddlewareHandler)[]): this {
    this.globalMiddleware.push(...middleware)
    return this
  }

  /**
   * Prepend middleware to the global stack
   */
  prependGlobal(...middleware: (MiddlewareReference | MiddlewareHandler)[]): this {
    this.globalMiddleware.unshift(...middleware)
    return this
  }

  /**
   * Remove middleware from the global stack
   */
  removeGlobal(middleware: string): this {
    this.globalMiddleware = this.globalMiddleware.filter(mw =>
      typeof mw === 'string' ? mw !== middleware : true,
    )
    return this
  }

  /**
   * Get the global middleware stack
   */
  getGlobal(): (MiddlewareReference | MiddlewareHandler)[] {
    return [...this.globalMiddleware]
  }

  // ─── Middleware Priority ───────────────────────────────────────

  /**
   * Set execution priority for a middleware (lower = runs first)
   */
  setPriority(name: string, priority: number): this {
    this.middlewarePriority.set(name, priority)
    return this
  }

  /**
   * Sort middleware by priority
   */
  sortByPriority(middleware: (MiddlewareReference | MiddlewareHandler)[]): (MiddlewareReference | MiddlewareHandler)[] {
    return [...middleware].sort((a, b) => {
      const nameA = typeof a === 'string' ? a.split(':')[0] : ''
      const nameB = typeof b === 'string' ? b.split(':')[0] : ''
      const priorityA = this.middlewarePriority.get(nameA) ?? 100
      const priorityB = this.middlewarePriority.get(nameB) ?? 100
      return priorityA - priorityB
    })
  }

  // ─── Route-Level Exclusions ────────────────────────────────────

  /**
   * Filter middleware by applying except/only rules.
   *
   * @param middleware - Full middleware list
   * @param options - except or only filter
   */
  filter(
    middleware: (MiddlewareReference | MiddlewareHandler)[],
    options: { except?: string[], only?: string[] },
  ): (MiddlewareReference | MiddlewareHandler)[] {
    if (options.only && options.only.length > 0) {
      return middleware.filter((mw) => {
        if (typeof mw === 'string') {
          const name = mw.split(':')[0]
          return options.only!.includes(name)
        }
        return false
      })
    }

    if (options.except && options.except.length > 0) {
      return middleware.filter((mw) => {
        if (typeof mw === 'string') {
          const name = mw.split(':')[0]
          return !options.except!.includes(name)
        }
        return true // Keep function middleware when using except
      })
    }

    return middleware
  }

  /**
   * Clear all groups and global middleware
   */
  flush(): void {
    this.groups.clear()
    this.globalMiddleware = []
    this.middlewarePriority.clear()
  }
}

/**
 * Default middleware group registry instance
 */
export const middlewareGroups: MiddlewareGroupRegistry = new MiddlewareGroupRegistry()

// Pre-define common groups
middlewareGroups.define('web', ['session', 'csrf', 'cors'])
middlewareGroups.define('api', ['throttle:60,1', 'cors'])

// Set default priorities (lower = runs first)
middlewareGroups.setPriority('session', 10)
middlewareGroups.setPriority('cors', 20)
middlewareGroups.setPriority('csrf', 30)
middlewareGroups.setPriority('auth', 40)
middlewareGroups.setPriority('throttle', 50)
middlewareGroups.setPriority('role', 60)
middlewareGroups.setPriority('permission', 60)
middlewareGroups.setPriority('can', 70)
middlewareGroups.setPriority('abilities', 70)
middlewareGroups.setPriority('verified', 80)
