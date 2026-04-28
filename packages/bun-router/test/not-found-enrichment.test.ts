/**
 * Coverage for the 0.0.7 release: 404/405 responses include path + method
 * + (when applicable) allowed methods, AND flow through globalMiddleware
 * so observability tooling (request id, server-timing, audit) can see them.
 */

import { describe, expect, it } from 'bun:test'
import { Router } from '../src'

describe('Router 404/405 enrichment', () => {
  it('404 body includes path + method', async () => {
    const router = new Router()
    router.get('/exists', () => new Response('ok'))

    const r = await router.handleRequest(new Request('http://localhost/missing'))
    expect(r.status).toBe(404)
    const body = await r.json()
    expect(body.path).toBe('/missing')
    expect(body.method).toBe('GET')
    // The active handleRequest path (defined via defineProperties in
    // server.ts) emits `success/message` shape; the legacy router.ts
    // path (still kept for non-serve callers) emits `error`. Accept either.
    expect(body.message === 'Not Found' || body.error === 'Not Found').toBe(true)
  })

  it('405 body includes path + method + allowed methods + Allow header', async () => {
    const router = new Router()
    router.post('/users', () => new Response('ok'))
    router.get('/users', () => new Response('ok'))

    const r = await router.handleRequest(new Request('http://localhost/users', { method: 'DELETE' }))
    expect(r.status).toBe(405)
    expect(r.headers.get('allow')).toMatch(/GET|POST/)
    const body = await r.json()
    expect(body.path).toBe('/users')
    expect(body.method).toBe('DELETE')
    expect(Array.isArray(body.allowed)).toBe(true)
    // GET + POST routes are registered. HEAD is auto-derived from GET.
    expect(body.allowed).toContain('GET')
    expect(body.allowed).toContain('POST')
  })

  it('global middleware runs for 404 responses (X-Request-ID etc.)', async () => {
    const router = new Router()
    router.use(async (req: any, next: any) => {
      req._tag = 'middleware-ran'
      const response = await next()
      const headers = new Headers(response.headers)
      headers.set('X-Custom', 'yes')
      return new Response(response.body, { status: response.status, headers })
    })

    const r = await router.handleRequest(new Request('http://localhost/nothing-here'))
    expect(r.status).toBe(404)
    expect(r.headers.get('x-custom')).toBe('yes')
  })

  it('global middleware runs for 405 responses too', async () => {
    const router = new Router()
    router.get('/items', () => new Response('ok'))
    router.use(async (_req: any, next: any) => {
      const response = await next()
      const headers = new Headers(response.headers)
      headers.set('X-Custom', 'on-405')
      return new Response(response.body, { status: response.status, headers })
    })

    const r = await router.handleRequest(new Request('http://localhost/items', { method: 'POST' }))
    expect(r.status).toBe(405)
    expect(r.headers.get('x-custom')).toBe('on-405')
  })
})
