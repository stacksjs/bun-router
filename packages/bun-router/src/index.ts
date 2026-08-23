/**
 * @stacksjs/bun-router — a fast, type-safe router for Bun.
 *
 * Main entry point. The most commonly used exports:
 * - `Router` — the primary router class (from `./router`)
 * - `FluentRouter` / `router` — chainable routing API
 * - `Auth`, `JWT`, `ApiKeyManager`, `OAuth2Helper` — auth helpers
 * - `Container`, `createContainer` — dependency-injection container
 * - `url()` / `registerNamedRoute()` — named-route URL generation
 * - `Errors` — namespaced error/exception types
 */

// Authentication (JWT, API keys, OAuth2)
export { default as Auth } from './auth'
export * from './auth'

// Runtime configuration
export * from './config'

// Dependency-injection container. Exported by name — the decorator module
// (`Get`, `Post`, `Controller`, …) would collide with router exports if
// star-exported; import those from `@stacksjs/bun-router/container/decorators`.
export {
  BindingBuilder,
  Container,
  createContainer,
  getContainer,
  setContainer,
} from './container/container'
export type { Binding, BindingScope, ContainerOptions, ResolutionContext, Token } from './container/container'
export { ContextualContainer, EnvironmentManager } from './container/contextual-binding'
export { DefaultServiceProviderManager } from './container/service-provider'

// Error types and helpers (namespaced — many generic names)
export * as Errors from './errors'

// Built-in middleware (CORS, CSRF, sessions, rate limiting, …)
export * from './middleware'

// One builder for `request.cookies`, so the router, the server and the testing
// utilities all produce the same shape.
export { createCookieAccessor, createInMemoryCookieAccessor } from './request/cookie-accessor'
export type { CookieAccessorSinks } from './request/cookie-accessor'

// Request context (AsyncLocalStorage-backed current request; lazy — see enableRequestContext)
export { enableRequestContext, getCurrentRequest, request, runWithRequest, setCurrentRequest } from './request/context'

// Session stores and manager
export * from './session'

// Response factory helpers
export * from './response/compression'
export * from './response/response-factory'

// The Router class and routing features (fluent API, throttling, caching, …)
export * from './router'
export { MiddlewareGroupRegistry, middlewareGroups } from './router/middleware-groups'

// Testing utilities
export * from './testing'

/*
 * Typed routes, and the client that reads them.
 *
 * `createTypedRouter()` registers through the ordinary router while
 * accumulating a route map into its own type, and `createTypedClient()` reads
 * that map back - so a TypeScript consumer gets input and output inference
 * with no generation step between changing a route and seeing the type change.
 * See `./typed/router.ts` for what this is and, just as importantly, what it
 * is not.
 */
export * from './typed'

// Public types
export * from './types'

/**
 * What an application tells the router about itself.
 *
 * A router deals in strings that are really identifiers: `'Actions/CreateUser'`
 * names a file, `'auth'` names a middleware, `'users.show'` names a route. The
 * compiler has no idea which of them exist, so a typo in any of the three is a
 * runtime error at best - a silently unprotected endpoint at worst, when the
 * typo is in a middleware alias.
 *
 * The router cannot know them either. The application can, so it says so:
 *
 * ```ts
 * declare module '@stacksjs/bun-router' {
 *   interface RouterTypeRegistry {
 *     actions: 'Actions/CreateUserAction' | 'Actions/ListUsersAction'
 *     middleware: 'auth' | 'throttle'
 *     routes: { 'users.index': '/users', 'users.show': '/users/{id}' }
 *   }
 * }
 * ```
 *
 * Every key is independent, and every one falls back to exactly the type it had
 * before this existed when absent. Declaring nothing changes nothing.
 *
 * ## Why it is declared HERE, in the entry
 *
 * A module augmentation merges into the module it names. `RouterTypeRegistry`
 * used to be declared in `./types/registry` and merely re-exported from here,
 * which meant `declare module '@stacksjs/bun-router'` created a second,
 * unrelated interface: `keyof RouterTypeRegistry` looked right at the call
 * site, while every type computed from it inside the package still saw an empty
 * one and quietly fell back. Everything looked wired up and nothing was
 * checked. Declaring it in the entry is what makes the obvious augmentation the
 * one that works.
 */
// eslint-disable-next-line ts/no-empty-object-type -- augmentation target; empty by design
export interface RouterTypeRegistry {}

export type {
  FromRegistry,
  KnownActionPath,
  KnownMiddlewareName,
  KnownRouteName,
  KnownRoutes,
  MiddlewareReference,
  PathForRouteName,
} from './types/registry'

// Validation (Laravel-style rules, custom rules, middleware)
export * from './validation/validator'

// Named-route URL generation
export { clearNamedRoutes, getNamedRoutePath, getNamedRoutes, registerNamedRoute, url, type UrlOptions } from './url'

// Path/template utilities
export * from './utils'
