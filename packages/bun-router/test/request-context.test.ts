import { describe, expect, it } from 'bun:test'
import { enableRequestContext, getCurrentRequest, request, runWithRequest } from '../src/request/context'
import { Router } from '../src/router'

/**
 * The request context is lazy: AsyncLocalStorage only wraps requests once
 * the context API has been used (or enableRequestContext() was called).
 * These tests cover both phases and the handler-visible behavior.
 */
describe('request context', () => {
  it('resolves the current request inside a handler', async () => {
    const router = new Router()
    router.get('/ctx', () => {
      const current = getCurrentRequest()
      return new Response(current ? new URL(current.url).pathname : 'missing')
    })

    // First request exercises the pre-enablement (sync fallback) path
    const first = await router.handleRequest(new Request('http://localhost/ctx'))
    expect(await first.text()).toBe('/ctx')

    // Subsequent requests run inside AsyncLocalStorage
    const second = await router.handleRequest(new Request('http://localhost/ctx'))
    expect(await second.text()).toBe('/ctx')
  })

  it('request() works across await points once context is enabled', async () => {
    enableRequestContext()
    const router = new Router()
    router.get('/async-ctx', async () => {
      await Promise.resolve()
      return new Response(new URL(request().url).pathname)
    })

    const res = await router.handleRequest(new Request('http://localhost/async-ctx'))
    expect(await res.text()).toBe('/async-ctx')
  })

  it('request() throws outside a request scope', () => {
    expect(() => request()).toThrow('outside a request scope')
  })

  it('runWithRequest scopes the request for the callback', async () => {
    const req = new Request('http://localhost/scoped') as any
    const seen = await runWithRequest(req, async () => {
      await Promise.resolve()
      return getCurrentRequest()
    })
    expect(seen).toBe(req)
    expect(getCurrentRequest()).toBeUndefined()
  })
})
