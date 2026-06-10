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

// AsyncLocalStorage.run costs roughly a microsecond per request — a large
// share of total dispatch time — so it only runs once something actually
// uses the context API. Until then a plain module variable tracks the
// in-flight request: exact in the synchronous phase of a handler and for
// non-overlapping requests, which covers the call that flips
// `contextEnabled`. Every request that starts after the first use gets
// full ALS isolation. Apps that need guaranteed isolation from the very
// first request under concurrency can call `enableRequestContext()` at
// startup.
let contextEnabled = false
let syncCurrent: EnhancedRequest | null = null

/**
 * Force AsyncLocalStorage-backed request context on for all subsequent
 * requests. Calling `request()`/`getCurrentRequest()` enables it
 * automatically — use this when the very first request must already be
 * fully isolated under concurrent load.
 */
export function enableRequestContext(): void {
  contextEnabled = true
}

/**
 * Run `fn` inside a request-context scope where `request()` and
 * `getCurrentRequest()` resolve to `initial`. The Router calls this around
 * each request automatically.
 */
export function runWithRequest<T>(initial: EnhancedRequest | Request, fn: () => T | Promise<T>): T | Promise<T> {
  if (!contextEnabled) {
    syncCurrent = initial as EnhancedRequest
    const result = fn()
    if (result instanceof Promise) {
      return result.finally(() => {
        syncCurrent = null
      }) as Promise<T>
    }
    syncCurrent = null
    return result
  }
  return storage.run({ current: initial as EnhancedRequest }, fn)
}

/**
 * Update the request stored in the current context. The Router calls this
 * after enhancing the request with matched route params, so subsequent
 * `request()` calls see the enhanced object.
 */
export function setCurrentRequest(req: EnhancedRequest): void {
  const store = storage.getStore()
  if (store) {
    store.current = req
    return
  }
  // Pre-enablement fallback: only refresh it while a request is in flight
  if (syncCurrent !== null) {
    syncCurrent = req
  }
}

/**
 * Returns the active request, or `undefined` when called outside a request
 * scope. Prefer `request()` when the request is required.
 *
 * First use switches the router to AsyncLocalStorage-backed context for
 * all subsequent requests; this call itself resolves via a synchronous
 * fallback (see `enableRequestContext` for eager opt-in).
 */
export function getCurrentRequest(): EnhancedRequest | undefined {
  if (!contextEnabled) {
    contextEnabled = true
    return syncCurrent ?? undefined
  }
  return storage.getStore()?.current ?? syncCurrent ?? undefined
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
