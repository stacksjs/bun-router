/**
 * Request Context
 *
 * AsyncLocalStorage-backed access to the current request. The Router wires
 * `runWithRequest()` automatically around handler/middleware invocation and
 * calls `setCurrentRequest()` once the request has been enhanced with route
 * params. User code reaches the active request via `request()` or
 * `getCurrentRequest()` without having to thread it through call stacks.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { EnhancedRequest } from '../types'

interface RequestContextStore {
  current: EnhancedRequest | null
}

const storage: AsyncLocalStorage<RequestContextStore> = new AsyncLocalStorage<RequestContextStore>()

/**
 * Run `fn` inside an AsyncLocalStorage scope where `request()` and
 * `getCurrentRequest()` resolve to `initial`. The Router calls this around
 * each request automatically.
 */
export function runWithRequest<T>(initial: EnhancedRequest | Request, fn: () => T | Promise<T>): T | Promise<T> {
  return storage.run({ current: initial as EnhancedRequest }, fn)
}

/**
 * Update the request stored in the current context. The Router calls this
 * after enhancing the request with matched route params, so subsequent
 * `request()` calls see the enhanced object.
 */
export function setCurrentRequest(req: EnhancedRequest): void {
  const store = storage.getStore()
  if (store)
    store.current = req
}

/**
 * Returns the active request, or `undefined` when called outside a request
 * scope. Prefer `request()` when the request is required.
 */
export function getCurrentRequest(): EnhancedRequest | undefined {
  return storage.getStore()?.current ?? undefined
}

/**
 * Returns the active request. Throws when called outside a request scope —
 * typically that means it was called before the Router established context
 * (e.g. during module initialization) or inside a fire-and-forget callback
 * that escaped the AsyncLocalStorage frame.
 */
export function request(): EnhancedRequest {
  const req = getCurrentRequest()
  if (!req) {
    throw new Error(
      'request() called outside a request scope. It can only be invoked from within a route handler or middleware.',
    )
  }
  return req
}
