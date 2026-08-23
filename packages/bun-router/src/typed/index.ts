/**
 * Typed routes and the client that reads them.
 *
 * Three modules, deliberately separate: the contract both halves agree on, the
 * builder that produces it, and the client that consumes it. The client
 * imports only the contract, so it stays bundleable for a browser.
 */

export type { PathsForMethod, RouteMapOf, TypedMethod, TypedRoute, TypedRouteMap } from './contract'
export { createTypedClient, TypedClientError } from './client'
export type { TypedClient, TypedClientOptions, TypedRequestOptions } from './client'
export { defineEndpoint } from './endpoint'
export type { InputOf, InputOfValidations, OutputOf, TypedHandlerLike, TypedRule, TypedValidations } from './endpoint'
export { createTypedRouter } from './router'
export type { RoutesOf, TypedRouteParams, TypedRegistrar, TypedRouteOptions, TypedRouter } from './router'
