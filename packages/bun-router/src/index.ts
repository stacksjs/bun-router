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

/*
 * What an application tells the router about itself.
 *
 * A router deals in strings that are really identifiers - `'Actions/CreateUser'`
 * names a file, `'auth'` names a middleware, `'users.show'` names a route - and
 * only the application knows which of them exist. Augment `RouterTypeRegistry`
 * and every one of them stops being `string`. Declaring nothing changes
 * nothing. See `./types/registry.ts`.
 */
export type {
  FromRegistry,
  KnownActionPath,
  KnownMiddlewareName,
  KnownRouteName,
  KnownRoutes,
  MiddlewareReference,
  PathForRouteName,
  RouterTypeRegistry,
} from './types/registry'

// Validation (Laravel-style rules, custom rules, middleware)
export * from './validation/validator'

// Named-route URL generation
export { clearNamedRoutes, getNamedRoutePath, getNamedRoutes, registerNamedRoute, url, type UrlOptions } from './url'

// Path/template utilities
export * from './utils'
