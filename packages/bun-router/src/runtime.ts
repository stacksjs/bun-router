/**
 * Runtime-only router surface for frameworks and API servers.
 *
 * The root entry intentionally exposes every bun-router subsystem. Consumers
 * that only need to register and serve routes can import this entry without
 * loading auth, containers, sessions, or testing utilities.
 */
export { applyRequestEnhancements, Router } from './router/runtime'
export {
  enableRequestContext,
  getCurrentRequest,
  request,
  runWithRequest,
  runWithRequestArguments,
  setCurrentRequest,
} from './request/context'
export {
  applyResponseCompression,
  DEFAULT_COMPRESSION,
} from './response/compression'
export {
  response,
  ResponseBuilder,
  responseBuilder,
} from './response/response-factory'
export { createTypedRouter } from './typed/router'

export type {
  ActionHandler,
  ActionPath,
  EnhancedRequest,
  ExtractRouteParams,
  KnownRouteName,
  MiddlewareHandler,
  MiddlewareReference,
  PathForRouteName,
  RequestFor,
  Route,
  ServerOptions,
} from './types'
export type { CompressionOptions } from './response/compression'
export type { TypedRouter } from './typed/router'
