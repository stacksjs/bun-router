/**
 * Handler Resolver
 *
 * Resolves route handlers from various formats:
 * - Functions returning Response
 * - Functions returning strings/objects (auto-wrapped)
 * - String file paths like 'UserAction.ts' or './actions/UserAction'
 * - Controller@method patterns like 'UserController@index'
 * - Class constructors with handle() method
 * - Class instances with handle() method
 */

import { Buffer } from 'node:buffer'
import type { EnhancedRequest, RouterConfig } from '../types'

/**
 * A text response whose length is stated, because this function knows it.
 *
 * Every body built here is already whole in memory, and the exact number of
 * bytes is one call away. Leaving it off was not free: `Content-Length` is
 * what lets the compression layer decide a small body is not worth encoding
 * without opening its stream, so a response with no length sent every request
 * through `peekBody` - a reader, a prefix buffer and a re-emitting stream, for
 * seventeen bytes of JSON. Measured against the routing benchmark's static
 * JSON route, that machinery was the majority of the router's per-request CPU.
 *
 * Only for bodies this function serialized. A `Response` a handler built, and
 * a `ReadableStream` whose length nobody can know until it ends, are left
 * exactly as they are.
 */
function textResponse(body: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(Buffer.byteLength(body)),
    },
  })
}

/**
 * Wraps a value in a Response object if it's not already a Response
 */
export function wrapResponse(value: unknown): Response {
  // Already a Response
  if (value instanceof Response) {
    return value
  }

  // Null or undefined - return 204 No Content
  if (value === null || value === undefined) {
    return new Response(null, { status: 204 })
  }

  // String - return as text/plain
  if (typeof value === 'string') {
    return textResponse(value, 'text/plain; charset=utf-8')
  }

  // Number or boolean - convert to string
  if (typeof value === 'number' || typeof value === 'boolean') {
    return textResponse(String(value), 'text/plain; charset=utf-8')
  }

  // ArrayBuffer or Uint8Array - return as binary
  if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
    return new Response(value as any, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(value.byteLength),
      },
    })
  }

  // ReadableStream - return as stream
  if (value instanceof ReadableStream) {
    return new Response(value)
  }

  // Object or array - return as JSON
  if (typeof value === 'object') {
    return textResponse(JSON.stringify(value), 'application/json; charset=utf-8')
  }

  // Fallback - convert to string
  return textResponse(String(value), 'text/plain; charset=utf-8')
}

/**
 * Resolves a string handler path to an imported module
 */
async function importHandler(handlerPath: string, config: RouterConfig): Promise<unknown> {
  const actionsPath = config.actionsPath || 'actions'
  const controllersPath = config.controllersPath || 'controllers'

  // Normalize the path - remove .ts/.js extension if present
  const normalizedPath = handlerPath.replace(/\.(ts|js)$/, '')

  // List of paths to try for importing
  const pathsToTry: string[] = []

  // Check if it's a Controller@method pattern
  if (normalizedPath.includes('@')) {
    const [controllerName, _methodName] = normalizedPath.split('@')
    pathsToTry.push(
      `${controllersPath}/${controllerName}`,
      `${controllersPath}/${controllerName}.ts`,
      `${controllersPath}/${controllerName}.js`,
      `./${controllersPath}/${controllerName}`,
      `../${controllersPath}/${controllerName}`,
    )
  }
  // Check if it's an Actions/ path pattern
  else if (normalizedPath.startsWith('Actions/') || normalizedPath.startsWith('actions/')) {
    pathsToTry.push(
      normalizedPath,
      `./${normalizedPath}`,
      `../${normalizedPath}`,
    )
  }
  // Check if it's a relative path
  else if (normalizedPath.startsWith('./') || normalizedPath.startsWith('../')) {
    pathsToTry.push(normalizedPath)
  }
  // Otherwise, try various locations
  else {
    pathsToTry.push(
      // Try actionsPath first
      `${actionsPath}/${normalizedPath}`,
      `./${actionsPath}/${normalizedPath}`,
      `../${actionsPath}/${normalizedPath}`,
      // Try direct import
      normalizedPath,
      `./${normalizedPath}`,
      `../${normalizedPath}`,
    )
  }

  let lastError: Error | null = null

  for (const path of pathsToTry) {
    try {
      const module = await import(path)
      return module
    }
    catch (error) {
      lastError = error as Error
      // Continue trying other paths
    }
  }

  throw new Error(
    `Failed to import handler "${handlerPath}".\n`
    + `Tried paths: ${pathsToTry.join(', ')}\n`
    + `Last error: ${lastError?.message || 'Unknown error'}`,
  )
}

/**
 * Check if a value is a callable function handler
 */
function isCallableHandler(handler: unknown): handler is (req: EnhancedRequest) => unknown {
  return typeof handler === 'function' && !handler.prototype?.handle
}

/**
 * Resolves and executes a handler, returning a Response
 */
export async function resolveHandler(
  handler: unknown,
  req: EnhancedRequest,
  config: RouterConfig,
): Promise<Response> {
  // 0. If it's already a Response (static route), clone and return it directly
  if (handler instanceof Response) {
    return handler.clone() as Response
  }

  // 1. If it's a function (not a class with handle method), call it and wrap the result
  if (isCallableHandler(handler)) {
    const result = await handler(req)
    return wrapResponse(result)
  }

  // 2. If it's a string, try to import and resolve
  if (typeof handler === 'string') {
    return resolveStringHandler(handler, req, config)
  }

  // 3. If it's a class constructor with handle method
  if (
    typeof handler === 'function'
    && handler.prototype
    && typeof handler.prototype.handle === 'function'
  ) {
    const HandlerClass = handler as new () => { handle: (req: EnhancedRequest) => unknown }
    const instance = new HandlerClass()
    const result = await instance.handle(req)
    return wrapResponse(result)
  }

  // 4. If it's an object with a handle method
  if (handler && typeof handler === 'object' && 'handle' in handler) {
    const handlerObj = handler as { handle: (req: EnhancedRequest) => unknown }
    if (typeof handlerObj.handle === 'function') {
      const result = await handlerObj.handle(req)
      return wrapResponse(result)
    }
  }

  throw new Error(`Invalid handler type: ${typeof handler}`)
}

/**
 * Resolves a string-based handler
 */
async function resolveStringHandler(
  handlerPath: string,
  req: EnhancedRequest,
  config: RouterConfig,
): Promise<Response> {
  const controllersPath = config.controllersPath || 'controllers'

  // Check if it's a Controller@method pattern
  if (handlerPath.includes('@')) {
    const [controllerName, methodName] = handlerPath.split('@')

    // Import the controller
    const pathsToTry = [
      `${controllersPath}/${controllerName}`,
      `./${controllersPath}/${controllerName}`,
      `../${controllersPath}/${controllerName}`,
      controllerName,
      `./${controllerName}`,
      `../${controllerName}`,
    ]

    let module: unknown = null
    let lastError: Error | null = null

    for (const path of pathsToTry) {
      try {
        module = await import(path)
        break
      }
      catch (error) {
        lastError = error as Error
      }
    }

    if (!module) {
      throw new Error(
        `Failed to import controller "${controllerName}".\n`
        + `Tried paths: ${pathsToTry.join(', ')}\n`
        + `Last error: ${lastError?.message || 'Unknown error'}`,
      )
    }

    const Controller = (module as { default?: unknown }).default || module

    // Instantiate and call method
    if (typeof Controller === 'function') {
      const instance = new (Controller as new () => Record<string, unknown>)()
      const method = instance[methodName]

      if (typeof method !== 'function') {
        throw new TypeError(`Method "${methodName}" not found on controller "${controllerName}"`)
      }

      const result = await (method as (req: EnhancedRequest) => unknown).call(instance, req)
      return wrapResponse(result)
    }

    throw new Error(`Controller "${controllerName}" is not a valid class`)
  }

  // Import the action handler
  const module = await importHandler(handlerPath, config)
  const Handler = (module as { default?: unknown }).default || module

  // If it's a function, call it
  if (typeof Handler === 'function') {
    // Check if it's a class with handle method
    if (Handler.prototype && typeof Handler.prototype.handle === 'function') {
      const instance = new (Handler as new () => { handle: (req: EnhancedRequest) => unknown })()
      const result = await instance.handle(req)
      return wrapResponse(result)
    }

    // It's a regular function
    const result = await (Handler as (req: EnhancedRequest) => unknown)(req)
    return wrapResponse(result)
  }

  // If it's an object with handle method
  if (Handler && typeof Handler === 'object' && 'handle' in Handler) {
    const handlerObj = Handler as { handle: (req: EnhancedRequest) => unknown }
    if (typeof handlerObj.handle === 'function') {
      const result = await handlerObj.handle(req)
      return wrapResponse(result)
    }
  }

  throw new Error(`Handler "${handlerPath}" does not export a valid handler function or class`)
}

/**
 * Creates a handler resolver bound to a specific config
 */
export function createHandlerResolver(config: RouterConfig): (handler: unknown, req: EnhancedRequest) => Promise<Response> {
  return (handler: unknown, req: EnhancedRequest) => resolveHandler(handler, req, config)
}

/**
 * Precompile the dispatch branch for a handler whose shape never changes
 * (a registered route's handler). `resolveHandler` re-sniffs the handler
 * type — instanceof / typeof / prototype checks — on every request; this
 * resolves the branch once and returns a specialized invoker for the
 * per-request hot path.
 */
export function createHandlerInvoker(
  handler: unknown,
  config: RouterConfig,
): (req: EnhancedRequest) => Response | Promise<Response> {
  // Static Response routes
  if (handler instanceof Response) {
    return () => handler.clone() as Response
  }

  // Plain function handlers (the common case)
  if (isCallableHandler(handler)) {
    return (req: EnhancedRequest) => {
      const result = handler(req)
      if (result instanceof Response)
        return result
      return result instanceof Promise ? result.then(wrapResponse) : wrapResponse(result)
    }
  }

  // Class constructors with a handle() method
  if (
    typeof handler === 'function'
    && handler.prototype
    && typeof handler.prototype.handle === 'function'
  ) {
    const HandlerClass = handler as new () => { handle: (req: EnhancedRequest) => unknown }
    return (req: EnhancedRequest) => {
      const result = new HandlerClass().handle(req)
      if (result instanceof Response)
        return result
      return result instanceof Promise ? result.then(wrapResponse) : wrapResponse(result)
    }
  }

  // Strings (action paths, Controller@method) and anything exotic keep
  // the full resolution flow
  return (req: EnhancedRequest) => resolveHandler(handler, req, config)
}
