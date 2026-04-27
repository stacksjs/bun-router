/**
 * Named-route URL generation
 *
 * A module-level registry of `name → path` populated by both `Router` and
 * `FluentRouter` whenever a route is given a name. `url(name, params)`
 * resolves a registered name into a URL with path parameters substituted
 * and unmatched params appended as a query string.
 */

import process from 'node:process'

const namedRouteRegistry: Map<string, string> = new Map()

/**
 * Register a named-route path. Called by Router/FluentRouter when a route
 * gets a `.name()`.
 */
export function registerNamedRoute(name: string, path: string): void {
  namedRouteRegistry.set(name, path)
}

/**
 * Look up a registered named-route path without parameter substitution.
 * Mostly useful for tests and tooling.
 */
export function getNamedRoutePath(name: string): string | undefined {
  return namedRouteRegistry.get(name)
}

/**
 * Returns a snapshot of every registered named-route. The map itself is not
 * exposed so callers can't mutate the registry.
 */
export function getNamedRoutes(): ReadonlyMap<string, string> {
  return new Map(namedRouteRegistry)
}

/**
 * Clear the registry. Provided for tests; production code should not need it.
 */
export function clearNamedRoutes(): void {
  namedRouteRegistry.clear()
}

export interface UrlOptions {
  /**
   * Return a fully-qualified URL using `process.env.APP_URL` (falling back to
   * `http://localhost`) instead of a path. Defaults to `false`.
   */
  absolute?: boolean
  /**
   * Override the base used for `absolute: true`. Wins over `APP_URL`.
   */
  base?: string
}

/**
 * Generate a URL for a named route.
 *
 * @example
 * ```ts
 * router.get('/users/{id}', handler).name('users.show')
 *
 * url('users.show', { id: 42 })
 * // → '/users/42'
 *
 * url('users.show', { id: 42, tab: 'profile' })
 * // → '/users/42?tab=profile'
 *
 * url('users.show', { id: 42 }, { absolute: true })
 * // → 'https://app.example/users/42'  (when APP_URL=https://app.example)
 * ```
 */
export function url(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: UrlOptions = {},
): string {
  const path = namedRouteRegistry.get(name)
  if (!path) {
    const known = [...namedRouteRegistry.keys()].sort().join(', ') || '(none registered)'
    throw new Error(`Named route '${name}' is not defined. Known routes: ${known}`)
  }

  const consumed = new Set<string>()
  let resolved = path

  for (const [key, value] of Object.entries(params)) {
    const required = `{${key}}`
    const optional = `{${key}?}`
    const encoded = encodeURIComponent(String(value))

    if (resolved.includes(required)) {
      resolved = resolved.replaceAll(required, encoded)
      consumed.add(key)
    }
    else if (resolved.includes(optional)) {
      resolved = resolved.replaceAll(optional, encoded)
      consumed.add(key)
    }
  }

  // Strip any unfilled optional placeholders (e.g. `/posts/{slug?}` → `/posts/`)
  resolved = resolved.replace(/\/\{[^}]+\?\}/g, '')

  // Throw on unfilled required placeholders so the caller sees the bug.
  const missing = resolved.match(/\{([^}?]+)\}/g)
  if (missing && missing.length > 0)
    throw new Error(`Missing required params for route '${name}': ${missing.join(', ')}`)

  // Append leftover params as query string.
  const leftover = Object.entries(params).filter(([k]) => !consumed.has(k))
  if (leftover.length > 0) {
    const qs = new URLSearchParams()
    for (const [k, v] of leftover) qs.set(k, String(v))
    resolved += `?${qs.toString()}`
  }

  if (options.absolute) {
    const base = (options.base ?? process.env.APP_URL ?? 'http://localhost').replace(/\/$/, '')
    const prefixed = base.startsWith('http') ? base : `https://${base}`
    return `${prefixed}${resolved.startsWith('/') ? resolved : `/${resolved}`}`
  }

  return resolved
}
