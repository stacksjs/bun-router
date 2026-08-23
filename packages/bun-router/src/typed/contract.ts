/**
 * The contract between a typed router and a typed client.
 *
 * One route map, keyed `"METHOD /path"`, describing what each endpoint takes,
 * what it answers with, and what its path needs. `createTypedRouter()`
 * accumulates one of these into its own type as routes are registered;
 * `createTypedClient()` reads it back. Nothing else needs to know it exists.
 *
 * It lives in its own module, with no imports, because both halves depend on
 * it and neither should have to depend on the other.
 */

/** One route: what a client sends, what it gets back, what the path needs. */
export interface TypedRoute {
  input: unknown
  output: unknown
  params: Record<string, string>
}

/** A whole API, keyed `"METHOD /path"` (e.g. `"GET /v1/projects"`). */
export type TypedRouteMap = Record<string, TypedRoute>

/**
 * The route map behind a typed router, or the map itself.
 *
 * `createTypedRouter()` accumulates its map into a phantom `__routes`
 * property, so `typeof api` carries it and this reads it back out. Passing a
 * map type directly works too, which is what an application that would rather
 * name its API explicitly will export.
 */
export type RouteMapOf<T> = T extends { __routes?: infer R }
  ? ([R] extends [TypedRouteMap | undefined] ? NonNullable<R> : never)
  : (T extends TypedRouteMap ? T : never)

/** The paths one method serves, as a union of path literals. */
export type PathsForMethod<R extends TypedRouteMap, M extends string>
  = Extract<keyof R, `${M} ${string}`> extends `${M} ${infer P}` ? P : never

/** The HTTP methods a typed router registers. */
export type TypedMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
