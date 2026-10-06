import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { config } from '../src/config'
import { Router } from '../src/router/router'

/**
 * A preflight for a path with no OPTIONS route is answered by the app's policy.
 *
 * The router answered every such preflight itself: in `serve()` it reflected
 * any Origin with `Access-Control-Allow-Credentials: true` and a fixed list of
 * methods and headers, so a browser would send credentialed PUTs, DELETEs and
 * JSON POSTs from any site, whatever CORS policy the app had configured - a
 * framework's own CORS middleware never ran, because there was no route.
 */
const preflight = (origin: string) => ({ method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT' } })

describe('config.preflight', () => {
  let originalCors: unknown
  beforeEach(() => {
    originalCors = (config.server as any)?.cors
  })
  afterEach(() => {
    ;(config.server as any).cors = originalCors
  })

  it.each([false, true])('answers unmatched preflights when served (nativeRoutes=%s)', async (nativeRoutes) => {
    const router = new Router({
      preflight: (req) => {
        const origin = req.headers.get('origin')
        const allowed = origin === 'https://good.test'
        return new Response(null, { status: 204, headers: allowed ? { 'Access-Control-Allow-Origin': origin!, 'Access-Control-Allow-Credentials': 'true' } : {} })
      },
    })
    router.get('/items/{id}', () => new Response('ok'))
    const server = await (router as any).serve({ port: 0, hostname: '127.0.0.1', nativeRoutes })
    try {
      const good = await fetch(`http://127.0.0.1:${server.port}/items/1`, preflight('https://good.test'))
      expect(good.status).toBe(204)
      expect(good.headers.get('access-control-allow-origin')).toBe('https://good.test')

      const evil = await fetch(`http://127.0.0.1:${server.port}/items/1`, preflight('https://evil.test'))
      expect(evil.headers.get('access-control-allow-origin')).toBeNull()
      expect(evil.headers.get('access-control-allow-credentials')).toBeNull()
    }
    finally {
      server.stop(true)
    }
  })

  it('answers unmatched preflights through handleRequest too', async () => {
    const router = new Router({ preflight: () => new Response(null, { status: 204, headers: { 'X-Policy': 'app' } }) })
    router.get('/items', () => new Response('ok'))
    const res = await router.handleRequest(new Request('http://localhost/items', preflight('https://evil.test')))
    expect(res.headers.get('x-policy')).toBe('app')
  })

  it('answers a registered path\'s preflight with the same policy', async () => {
    const router = new Router({ preflight: () => new Response(null, { status: 204, headers: { 'X-Policy': 'app' } }) })
    router.put('/items/{id}', () => new Response('ok'))
    const res = await router.handleRequest(new Request('http://localhost/items/1', preflight('https://good.test')))
    expect(res.status).toBe(204)
    expect(res.headers.get('x-policy')).toBe('app')
  })

  it('without a hook, never reflects an origin with credentials', async () => {
    ;(config.server as any).cors = { enabled: true, origin: '*', credentials: false }
    const router = new Router()
    router.get('/items', () => new Response('ok'))
    const server = await (router as any).serve({ port: 0, hostname: '127.0.0.1' })
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/items`, preflight('https://evil.test'))
      expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.test')
      expect(res.headers.get('access-control-allow-credentials')).toBeNull()
    }
    finally {
      server.stop(true)
    }
  })
})
