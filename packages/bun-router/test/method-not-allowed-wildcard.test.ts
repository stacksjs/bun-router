/**
 * Regression coverage for stacksjs/bun-router#908: a catch-all OPTIONS route
 * registered for CORS preflight made 404 unreachable. Every unmatched path
 * under the wildcard answered 405 with `Allow: OPTIONS`, on every verb, and
 * `fallback()` stopped firing.
 *
 * The fix only discounts OPTIONS-from-a-wildcard. A functional wildcard still
 * supports a genuine 405, and that boundary is what most of this file pins.
 */

import type { Server } from 'bun'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Router } from '../src'

async function send(router: Router, path: string, method = 'GET'): Promise<Response> {
  return router.handleRequest(new Request(`http://localhost${path}`, { method }))
}

describe('405-vs-404 with wildcard routes (#908)', () => {
  it('answers 404 for unmatched paths under a bare preflight catch-all', async () => {
    const router = new Router()
    router.get('/users', () => new Response('ok'))
    router.options('/*', () => new Response(null, { status: 204 }))

    expect((await send(router, '/nope')).status).toBe(404)
  })

  it('answers 404 under the scoped form that Stacks\' Cors.ts documents', async () => {
    const router = new Router()
    router.get('/api/users', () => new Response('ok'))
    router.options('/api/*', () => new Response(null, { status: 204 }))

    expect((await send(router, '/api/definitely-not-a-route')).status).toBe(404)
    // Outside the wildcard's prefix was never affected; pinned so the fix is
    // not mistaken for the reason this one passes.
    expect((await send(router, '/outside-the-prefix')).status).toBe(404)
  })

  it('leaves real routes and genuine method mismatches alone', async () => {
    const router = new Router()
    router.get('/users', () => new Response('ok'))
    router.options('/*', () => new Response(null, { status: 204 }))

    expect((await send(router, '/users')).status).toBe(200)

    const mismatch = await send(router, '/users', 'POST')
    expect(mismatch.status).toBe(405)
    // The preflight route is real, so Allow still advertises OPTIONS here.
    expect(mismatch.headers.get('allow')).toContain('OPTIONS')
    expect(mismatch.headers.get('allow')).toContain('GET')
  })

  it('still serves the preflight request the catch-all was registered for', async () => {
    const router = new Router()
    router.get('/api/users', () => new Response('ok'))
    router.options('/api/*', () => new Response(null, { status: 204 }))

    expect((await send(router, '/api/anything', 'OPTIONS')).status).toBe(204)
  })

  it('keeps 405 for a functional wildcard, which is a real method mismatch', async () => {
    const router = new Router()
    router.get('/files/*', () => new Response('file'))

    // GET genuinely serves this path, so PUT is a method mismatch, not a typo.
    expect((await send(router, '/files/anything')).status).toBe(200)

    const put = await send(router, '/files/anything', 'PUT')
    expect(put.status).toBe(405)
    expect(put.headers.get('allow')).toBe('GET, HEAD')

    // Outside the wildcard, still a 404.
    expect((await send(router, '/nowhere', 'PUT')).status).toBe(404)
  })

  it('keeps 405 for a literal OPTIONS registration, which names a path', async () => {
    const router = new Router()
    router.options('/api/health', () => new Response(null, { status: 204 }))

    const res = await send(router, '/api/health')
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('OPTIONS')
  })

  it('does not let a wildcard OPTIONS mask a concrete OPTIONS on the same path', async () => {
    // Registration order matters to the scan's early-out: the wildcard is seen
    // first and records OPTIONS, so the concrete route must still be credited.
    const router = new Router()
    router.options('/api/*', () => new Response(null, { status: 204 }))
    router.options('/api/health', () => new Response(null, { status: 204 }))

    expect((await send(router, '/api/health')).status).toBe(405)
    expect((await send(router, '/api/other')).status).toBe(404)
  })

  it('lets fallback() fire again under a preflight catch-all', async () => {
    const router = new Router()
    router.get('/api/users', () => new Response('ok'))
    router.options('/api/*', () => new Response(null, { status: 204 }))
    router.fallback(() => new Response('custom 404', { status: 404 }))

    const res = await send(router, '/api/nope')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('custom 404')
  })

  it('returns a stable answer across the memoized scan', async () => {
    const router = new Router()
    router.get('/api/users', () => new Response('ok'))
    router.options('/api/*', () => new Response(null, { status: 204 }))

    // Second call is served from _allowedMethodsCache.
    expect((await send(router, '/api/nope')).status).toBe(404)
    expect((await send(router, '/api/nope')).status).toBe(404)
    expect((await send(router, '/api/nope', 'DELETE')).status).toBe(404)
  })

  it('reports wildcard provenance through scanAllowedMethods', async () => {
    const router = new Router()
    router.get('/files/*', () => new Response('file'))
    router.options('/*', () => new Response(null, { status: 204 }))
    router.post('/files/upload', () => new Response('ok'))

    const scan = router.scanAllowedMethods('/files/anything')
    expect(scan.methods).toContain('GET')
    expect(scan.methods).toContain('OPTIONS')
    // Both matched only through a wildcard, so neither is concrete evidence.
    expect(scan.concrete).toEqual([])

    const concrete = router.scanAllowedMethods('/files/upload')
    expect(concrete.concrete).toContain('POST')

    // The public accessor keeps its signature and its honest method list.
    expect(router.getAllowedMethods('/files/anything')).toEqual(scan.methods)
  })
})

describe('405 body shape is one shape (#908, secondary)', () => {
  it('emits success/message/path/method/allowed', async () => {
    const router = new Router()
    router.get('/users', () => new Response('ok'))

    const res = await send(router, '/users', 'DELETE')
    expect(res.status).toBe(405)
    const body = await res.json() as Record<string, unknown>
    expect(body.success).toBe(false)
    expect(body.message).toBe('Method Not Allowed')
    expect(body.path).toBe('/users')
    expect(body.method).toBe('DELETE')
    expect(body.allowed).toEqual(['GET', 'HEAD'])
  })
})

/**
 * The bug was reported from a deployed app, which is served by the native
 * `Bun.serve` fetch path in server.ts — a second copy of the 405-vs-404
 * decision. These run over real HTTP so that path is covered too.
 */
describe('405-vs-404 over the served fetch path (#908)', () => {
  let server: Server<any>
  let base: string

  beforeAll(async () => {
    const router = new Router()
    router.get('/api/users', () => new Response('ok'))
    router.options('/api/*', () => new Response(null, { status: 204 }))
    server = await (router as any).serve({ port: 0 })
    base = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop(true)
  })

  it('answers 404, not 405, for an unmatched path under the preflight catch-all', async () => {
    const res = await fetch(`${base}/api/definitely-not-a-route`)
    expect(res.status).toBe(404)
    expect(res.headers.get('allow')).toBeNull()
  })

  it('still answers a genuine method mismatch with 405 and one body shape', async () => {
    const res = await fetch(`${base}/api/users`, { method: 'DELETE' })
    expect(res.status).toBe(405)
    const body = await res.json() as Record<string, unknown>
    expect(body.success).toBe(false)
    expect(body.message).toBe('Method Not Allowed')
    expect(body.path).toBe('/api/users')
    expect(body.method).toBe('DELETE')
  })

  it('still serves the preflight itself', async () => {
    const res = await fetch(`${base}/api/anything`, { method: 'OPTIONS' })
    expect(res.status).toBe(204)
  })
})
