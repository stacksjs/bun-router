/**
 * Routes a TypeScript consumer can see the shape of, with no generation step.
 *
 * ## What this is for
 *
 * `router.get('/v1/projects', handler)` tells the compiler nothing a client
 * could use. The path is a string, the handler returns a `Response`, and the
 * only route-aware client you could offer was one generated from an OpenAPI
 * document by running a CLI command - which has to be re-run, and whose output
 * goes stale the moment a route changes.
 *
 * This builder registers through the router it is given, exactly as you would
 * by hand, while accumulating a route map into its own type as you chain:
 *
 * ```ts
 * export const api = createTypedRouter(router)
 *   .get('/v1/projects', listProjects)
 *   .post('/v1/projects', createProject)
 *
 * export type AppRoutes = typeof api
 * ```
 *
 * ```ts
 * // any TypeScript consumer, same repo or a package away
 * import { createTypedClient } from '@stacksjs/bun-router'
 *
 * const client = createTypedClient<AppRoutes>({ baseUrl: 'https://api.example.com' })
 * const projects = await client.get('/v1/projects')   // typed, no CLI step
 * ```
 *
 * Registration goes through the ordinary router, so there is exactly one
 * runtime dispatch path and the difference from a hand-written route is
 * entirely at compile time.
 *
 * ## What it reads
 *
 * See `./endpoint.ts`. A plain function gives its return type; an object with
 * `handle()` gives the same, plus its input from a `validations` map when it
 * has one. That second shape is deliberate: a framework built on this router
 * whose "actions" are `{ handle, validations }` objects gets typed routes from
 * this builder without needing one of its own.
 *
 * ## What it is not
 *
 * Not a replacement for `router.get(...)`, which stays exactly as it is for
 * every route that would rather be lazy than inferable, and not a replacement
 * for OpenAPI, which remains the answer for consumers that are not TypeScript
 * in this repo.
 *
 * ## Groups
 *
 * There is deliberately no `.group()`. A prefix applied only at runtime makes
 * every accumulated path type wrong, and one applied only in the type is a
 * second place for the URL to be written down. Write the full path; it is what
 * the client will show you anyway.
 */

import type { ExtractRouteParams } from '../types'
import type { TypedRouteMap } from './contract'
import type { InputOf, OutputOf, TypedHandlerLike } from './endpoint'

/**
 * A path's params, normalized.
 *
 * `ExtractRouteParams` answers `object` for a path with no parameters, which
 * would let a client pass anything. An empty record says what is meant.
 */
export type TypedRouteParams<P extends string>
  = keyof ExtractRouteParams<P> extends never ? Record<string, never> : ExtractRouteParams<P>

type Entry<P extends string, H> = {
  input: InputOf<H>
  output: OutputOf<H>
  params: TypedRouteParams<P>
}

/**
 * Per-route settings.
 *
 * An argument rather than a chained call, because chaining `.middleware()`
 * would return the route and lose the accumulated map. Applied by calling the
 * matching method on whatever the registrar returned, so a router whose
 * `get()` returns a chainable route supports all of them; see
 * {@link TypedRegistrar}.
 */
export interface TypedRouteOptions {
  middleware?: string | readonly string[]
  name?: string
  skipCsrf?: boolean
  requireCsrf?: boolean
  rateLimit?: { max: number, window?: 'second' | 'minute' | 'hour' | 'day' | number }
}

/**
 * Anything that can register a route.
 *
 * `Router` satisfies this, and so does any wrapper around it. The return value
 * is whatever that router hands back: when it is a chainable route,
 * {@link TypedRouteOptions} are applied to it.
 */
export interface TypedRegistrar {
  get: (path: string, handler: any) => unknown
  post: (path: string, handler: any) => unknown
  put: (path: string, handler: any) => unknown
  patch: (path: string, handler: any) => unknown
  delete: (path: string, handler: any) => unknown
}

/**
 * The builder. Each method returns the same object at runtime and a wider type
 * at compile time, which is what puts the route map in `typeof api` without
 * anything being written down twice.
 */
export interface TypedRouter<R extends TypedRouteMap = {}> {
  /**
   * Phantom. Never set at runtime; it is where `RouteMapOf` reads the
   * accumulated map from.
   */
  readonly __routes?: R

  get: <P extends string, H extends TypedHandlerLike>(path: P, handler: H, options?: TypedRouteOptions)
  => TypedRouter<R & { [K in `GET ${P}`]: Entry<P, H> }>
  post: <P extends string, H extends TypedHandlerLike>(path: P, handler: H, options?: TypedRouteOptions)
  => TypedRouter<R & { [K in `POST ${P}`]: Entry<P, H> }>
  put: <P extends string, H extends TypedHandlerLike>(path: P, handler: H, options?: TypedRouteOptions)
  => TypedRouter<R & { [K in `PUT ${P}`]: Entry<P, H> }>
  patch: <P extends string, H extends TypedHandlerLike>(path: P, handler: H, options?: TypedRouteOptions)
  => TypedRouter<R & { [K in `PATCH ${P}`]: Entry<P, H> }>
  delete: <P extends string, H extends TypedHandlerLike>(path: P, handler: H, options?: TypedRouteOptions)
  => TypedRouter<R & { [K in `DELETE ${P}`]: Entry<P, H> }>
}

/** The accumulated route map, pulled back out of a builder's type. */
export type RoutesOf<T> = T extends TypedRouter<infer R> ? R : never

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

interface ChainableLike {
  middleware?: (name: string | readonly string[]) => unknown
  name?: (routeName: string) => unknown
  skipCsrf?: () => unknown
  requireCsrf?: () => unknown
  rateLimit?: (max: number, window: string | number) => unknown
}

/**
 * Apply the options to whatever the registrar handed back.
 *
 * Throws rather than shrugging when the route cannot take one: an option that
 * was silently dropped is a middleware that silently did not run, and on a
 * `middleware: 'auth'` that is an unprotected endpoint nobody was told about.
 */
function applyOptions(registered: unknown, method: string, path: string, options?: TypedRouteOptions): void {
  if (!options)
    return

  const chain = registered as ChainableLike | null | undefined
  const require = <K extends keyof ChainableLike>(key: K): NonNullable<ChainableLike[K]> => {
    const fn = chain?.[key]
    if (typeof fn !== 'function') {
      throw new TypeError(
        `[typed-router] ${method.toUpperCase()} ${path}: this router's route does not support .${String(key)}(), `
        + `so the \`${String(key)}\` option cannot be applied. Register the route directly instead of dropping it.`,
      )
    }
    return fn as NonNullable<ChainableLike[K]>
  }

  if (options.middleware)
    require('middleware').call(chain, options.middleware)
  if (options.name)
    require('name').call(chain, options.name)
  if (options.skipCsrf)
    require('skipCsrf').call(chain)
  if (options.requireCsrf)
    require('requireCsrf').call(chain)
  if (options.rateLimit)
    require('rateLimit').call(chain, options.rateLimit.max, options.rateLimit.window ?? 'minute')
}

/**
 * Build a typed route group on top of a router.
 *
 * Routes land in that router's table exactly as if they had been registered by
 * hand; the only difference is that the builder's own type remembers them.
 */
export function createTypedRouter(router: TypedRegistrar): TypedRouter {
  const builder = {} as Record<string, unknown>

  for (const method of METHODS) {
    builder[method] = (path: string, handler: unknown, options?: TypedRouteOptions) => {
      applyOptions(router[method](path, handler), method, path, options)
      return builder
    }
  }

  return builder as unknown as TypedRouter
}
