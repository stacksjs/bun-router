/**
 * Named-route URL generation
 *
 * A module-level registry of `name → path` populated by both `Router` and
 * `FluentRouter` whenever a route is given a name. `url(name, params)`
 * resolves a registered name into a URL with path parameters substituted
 * and unmatched params appended as a query string.
 */

import type { ExtractRouteParams } from './types'
import type { KnownRouteName, PathForRouteName } from './types/registry'
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

/**
 * The params a named route needs, plus anything else you want in the query.
 *
 * The required half comes from the path the name resolves to, so
 * `url('users.show')` with no `id` is a compile error once the application has
 * declared its routes. Extra keys stay allowed on purpose: the implementation
 * appends whatever it did not consume as a query string, which is a real
 * feature and not a mistake to be typed away.
 */
export type UrlParams<TName extends string>
  = ParamValues<ExtractRouteParams<PathForRouteName<TName>>> & Record<string, string | number | boolean>

/**
 * Path params are strings on the wire, but `url()` stringifies whatever it is
 * given - so `url('users.show', { id: 42 })` is correct and should type as
 * correct. Homomorphic, so an optional `{slug?}` stays optional.
 */
type ParamValues<TParams> = { [K in keyof TParams]: string | number | boolean }

/** The keys of `T` that are not optional. */
type RequiredKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? never : K }[keyof T]

/**
 * `url()` takes no second argument when the route needs no parameters.
 *
 * Keyed on REQUIRED params, not all of them: a path whose only parameter is
 * optional (`/posts/{slug?}`) is reachable with nothing at all, and demanding
 * an empty object for it would be the type getting in the way of the truth.
 */
type RequiresParams<TName extends string>
  = [RequiredKeys<ExtractRouteParams<PathForRouteName<TName>>>] extends [never] ? false : true

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
// False positive: this is an overload signature, which has no body for its
// parameters to be used in. The implementation below uses them.
// eslint-disable-next-line pickier/no-unused-vars
export function url<TName extends KnownRouteName>(
  name: TName,
  ...rest: RequiresParams<TName> extends true
    ? [params: UrlParams<TName>, options?: UrlOptions]
    : [params?: UrlParams<TName>, options?: UrlOptions]
): string
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

  // Strip any unfilled optional placeholders and tidy the slashes they
  // leave behind (`/posts/{slug?}` → `/posts`, `/a/{v?}/b` → `/a/b`)
  if (resolved.includes('?}')) {
    resolved = resolved.replace(/\{[^}]+\?\}/g, '').replace(/\/{2,}/g, '/')
    if (resolved.length > 1 && resolved.endsWith('/'))
      resolved = resolved.slice(0, -1)
  }

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
